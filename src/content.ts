// src/content.ts

import {
  createAnchorFingerprint,
  findAnchor,
  findAnchorFromFingerprint,
} from './anchor/findAnchor'

import {
  hideHighlight,
  showHighlight,
} from './highlight/highlight'

import {
  createNote,
} from './note/createNote'

import {
  deleteNote,
  getNotesForPage,
  saveNote,
} from './storage/noteStorage'

import type {
  StoredNote,
} from './types/note'

import {
  exportCurrentPageMarkdown,
} from './export/exportPageNotes'

/**
 * WebNote 当前是否处于“选取笔记位置”模式。
 *
 * 默认关闭，只有点击扩展图标后才会开启。
 */
let isActive = false

/**
 * 当前鼠标悬停时识别出的 anchor。
 *
 * 点击页面时会优先使用这个 anchor 创建笔记。
 */
let hoveredAnchor: HTMLElement | null = null

/**
 * WebNote 当前认为自己所在的页面 URL。
 *
 * SPA 切换页面时 content script 本身不会重新加载，
 * 因此需要自己记录并判断 URL 是否变化。
 */
let currentPageUrl = location.href

/**
 * restoreNotes() 的 debounce timer。
 *
 * 动态网页经常一次产生很多 DOM 变化，
 * 不应该每发生一次 mutation 就立即恢复笔记。
 */
let restoreTimer: number | undefined

/**
 * ------------------------------
 * Note Restore
 * ------------------------------
 */

/**
 * 恢复当前 URL 已经保存的全部笔记。
 */
async function restoreNotes(): Promise<void> {
  const notes =
    await getNotesForPage(location.href)

  for (const note of notes) {
    /**
     * 根据保存的 fingerprint，
     * 在当前页面中重新寻找对应 anchor。
     */
    const anchor =
      findAnchorFromFingerprint(
        note.anchor,
      )

    if (!anchor) {
      /**
       * 动态网页可能还没有渲染完。
       *
       * MutationObserver 后续会再次触发恢复，
       * 所以这里不用立即认为数据已经失效。
       */
      console.warn(
        'WebNote could not restore anchor:',
        note,
      )

      continue
    }

    /**
     * 如果当前 anchor 已经挂有 WebNote，
     * 说明这条笔记已经恢复过了。
     *
     * 避免 MutationObserver 多次恢复造成重复 Note。
     */
    if (
      anchor.dataset.webnoteAnchorId
    ) {
      continue
    }

    /**
     * 将保存的数据重新渲染成 Note UI。
     */
    createNote(anchor, {
      id: note.id,

      initialContent:
        note.content,

      onChange: async (
        noteId,
        content,
      ) => {
        await saveNote({
          ...note,
          id: noteId,
          content,
        })
      },

      onDelete: async (noteId) => {
        await deleteNote(
          location.href,
          noteId,
        )
      },
    })
  }
}

/**
 * 延迟执行一次笔记恢复。
 *
 * 如果短时间内连续发生很多 DOM mutation，
 * 只保留最后一次 restore。
 */
function scheduleRestore(): void {
  if (
    restoreTimer !== undefined
  ) {
    window.clearTimeout(
      restoreTimer,
    )
  }

  restoreTimer =
    window.setTimeout(() => {
      /**
       * Timer 已经开始执行，
       * 状态恢复为“当前没有待执行 restore”。
       */
      restoreTimer = undefined

      void restoreNotes()
    }, 300)
}

/**
 * ------------------------------
 * Runtime UI Cleanup
 * ------------------------------
 */

/**
 * 清理当前页面已经渲染出来的 WebNote UI。
 *
 * 注意：
 * 这里只清理 DOM 中的运行时状态，
 * 不删除 chrome.storage.local 中真正保存的数据。
 *
 * 它会被两个场景复用：
 *
 * 1. SPA 从 A 页面切换到 B 页面
 * 2. 用户主动清理当前页 / 当前网站笔记
 */
function clearRenderedNotes(): void {
  /**
   * 取消旧页面还没有执行的 restore。
   *
   * 否则可能：
   *
   * A 页面离开
   * → A 的 restoreTimer 随后执行
   * → 在 B 页面错误恢复。
   */
  if (
    restoreTimer !== undefined
  ) {
    window.clearTimeout(
      restoreTimer,
    )

    restoreTimer = undefined
  }

  /**
   * 删除所有 WebNote Note Host。
   *
   * Shadow DOM 会随着 Host 一起被删除。
   */
  document
    .querySelectorAll<HTMLElement>(
      '[data-webnote="true"][data-webnote-anchor-id]',
    )
    .forEach((noteHost) => {
      noteHost.remove()
    })

  /**
   * 清除原网页 anchor 上保存的运行时关联 ID。
   */
  document
    .querySelectorAll<HTMLElement>(
      '[data-webnote-anchor-id]',
    )
    .forEach((anchor) => {
      delete anchor.dataset
        .webnoteAnchorId
    })

  hoveredAnchor = null

  hideHighlight()
}

/**
 * ------------------------------
 * SPA URL Lifecycle
 * ------------------------------
 */

/**
 * 当 SPA URL 真正发生变化时执行。
 *
 * 职责非常明确：
 *
 * 1. 判断 URL 是否变化
 * 2. 清理上一页运行时 UI
 * 3. 更新当前 URL
 * 4. 为新页面安排笔记恢复
 */
function handlePageUrlChange(): void {
  const newUrl = location.href

  if (
    newUrl === currentPageUrl
  ) {
    return
  }

  /**
   * 先清理上一页的 Note UI。
   *
   * chrome.storage.local 数据仍然保留。
   */
  clearRenderedNotes()

  /**
   * WebNote 从现在开始认为自己已经进入新页面。
   */
  currentPageUrl = newUrl

  /**
   * SPA 新页面内容通常不是瞬间全部完成，
   * 因此继续使用 debounce restore。
   *
   * 如果正文随后继续异步加载，
   * MutationObserver 还会再次安排恢复。
   */
  scheduleRestore()
}

/**
 * SPA 通常通过：
 *
 * history.pushState()
 * history.replaceState()
 *
 * 修改浏览器 URL。
 *
 * 这两种调用本身不会触发 popstate，
 * 因此 WebNote 主动包装它们。
 */
const originalPushState =
  history.pushState

const originalReplaceState =
  history.replaceState

history.pushState = function (
  ...args: Parameters<
    History['pushState']
  >
): void {
  originalPushState.apply(
    history,
    args,
  )

  handlePageUrlChange()
}

history.replaceState =
  function (
    ...args: Parameters<
      History['replaceState']
    >
  ): void {
    originalReplaceState.apply(
      history,
      args,
    )

    handlePageUrlChange()
  }

/**
 * 浏览器前进 / 后退会触发 popstate。
 */
window.addEventListener(
  'popstate',
  () => {
    handlePageUrlChange()
  },
)

/**
 * ------------------------------
 * Mutation Observer
 * ------------------------------
 */

/**
 * 判断一个 DOM 节点是否属于
 * WebNote 自己插入的 Note Host。
 */
function isWebNoteNode(
  node: Node,
): boolean {
  if (
    !(node instanceof HTMLElement)
  ) {
    return false
  }

  return node.matches(
    '[data-webnote="true"]',
  )
}

/**
 * 判断一次 DOM mutation
 * 是否只是 WebNote 自己引起的。
 *
 * 创建或删除 Note Host 时，
 * 不应该因此重新 restoreNotes()。
 */
function isWebNoteMutation(
  mutation: MutationRecord,
): boolean {
  const changedNodes = [
    ...mutation.addedNodes,
    ...mutation.removedNodes,
  ]

  if (
    changedNodes.length === 0
  ) {
    return false
  }

  return changedNodes.every(
    isWebNoteNode,
  )
}

/**
 * MutationObserver 不再负责猜测 URL 是否变化。
 *
 * 它现在只负责一件事：
 *
 * “宿主网页 DOM 发生真实变化后，
 *  再尝试恢复一次笔记。”
 *
 * 这样可以处理 React / Next.js 页面正文异步加载。
 */
const pageObserver =
  new MutationObserver(
    (mutations) => {
      const onlyWebNoteChanges =
        mutations.every(
          isWebNoteMutation,
        )

      if (
        onlyWebNoteChanges
      ) {
        return
      }

      scheduleRestore()
    },
  )

pageObserver.observe(
  document.documentElement,
  {
    childList: true,
    subtree: true,
  },
)

/**
 * ------------------------------
 * Mouse Hover
 * ------------------------------
 */

/**
 * WebNote 开启后，
 * 根据鼠标所在 DOM 元素寻找候选 anchor。
 */
document.addEventListener(
  'mouseover',
  (event) => {
    if (!isActive) return

    if (
      !(event.target instanceof HTMLElement)
    ) {
      return
    }

    const target = event.target

    /**
     * 鼠标位于 WebNote Note UI 上时，
     * 不应该重新进行 anchor 选择。
     */
    const noteHost =
      target.closest<HTMLElement>(
        '[data-webnote="true"]',
      )

    if (noteHost) {
      const noteId =
        noteHost.dataset
          .webnoteAnchorId

      if (!noteId) return

      /**
       * Note Hover 时柔和高亮
       * 它所对应的原文 anchor。
       */
      const anchor =
        document.querySelector<HTMLElement>(
          `[data-webnote-anchor-id="${CSS.escape(
            noteId,
          )}"]:not([data-webnote="true"])`,
        )

      if (anchor) {
        showHighlight(
          anchor,
          true,
        )
      }

      return
    }

    const anchor =
      findAnchor(target)

    if (!anchor) {
      hoveredAnchor = null

      hideHighlight()

      return
    }

    hoveredAnchor = anchor

    showHighlight(anchor)
  },
)

/**
 * 鼠标离开 WebNote Note Host 后，
 * 关闭对应的柔和高亮。
 */
document.addEventListener(
  'mouseout',
  (event) => {
    if (
      !(event.target instanceof HTMLElement)
    ) {
      return
    }

    if (
      event.target.closest(
        '[data-webnote="true"]',
      )
    ) {
      hideHighlight()
    }
  },
)

/**
 * ------------------------------
 * Create Note
 * ------------------------------
 */

/**
 * WebNote 开启状态下点击页面，
 * 在当前 anchor 后创建一条笔记。
 */
document.addEventListener(
  'click',
  (event) => {
    if (!isActive) return

    if (
      !(event.target instanceof HTMLElement)
    ) {
      return
    }

    const target = event.target

    /**
     * 用户操作 WebNote 自己的 textarea / button 时，
     * 不应该创建新的 Note，
     * 也不能 preventDefault()。
     */
    if (
      target.closest(
        '[data-webnote="true"]',
      )
    ) {
      return
    }

    /**
     * WebNote ON 时，
     * 当前点击用于创建笔记，
     * 因此阻止链接等元素原来的默认行为。
     */
    event.preventDefault()

    const anchor =
      hoveredAnchor ??
      findAnchor(target)

    if (!anchor) {
      return
    }

    /**
     * 一个 anchor 当前只允许存在一条 Note。
     */
    if (
      anchor.dataset
        .webnoteAnchorId
    ) {
      return
    }

    const noteId =
      crypto.randomUUID()

    const anchorFingerprint =
      createAnchorFingerprint(
        anchor,
      )

    /**
     * 新笔记的初始持久化数据。
     */
    const note: StoredNote = {
      id: noteId,

      url: location.href,

      anchor:
        anchorFingerprint,

      content: '',
    }

    const noteElement =
      createNote(anchor, {
        id: noteId,

        onChange: async (
          id,
          content,
        ) => {
          await saveNote({
            ...note,
            id,
            content,
          })
        },

        onDelete: async (
          id,
        ) => {
          await deleteNote(
            location.href,
            id,
          )
        },
      })

    /**
     * createNote() 中 textarea 位于 Shadow DOM，
     * 因此需要通过 shadowRoot 找到它。
     */
    noteElement.shadowRoot
      ?.querySelector<HTMLTextAreaElement>(
        'textarea',
      )
      ?.focus()

    /**
     * 新 Note 即使还是空内容，
     * 也先保存下来，
     * 后续输入会通过 onChange 更新。
     */
    void saveNote(note)

    hoveredAnchor = null

    hideHighlight()
  },
)

/**
 * ------------------------------
 * Preview
 * ------------------------------
 */

/**
 * 为当前页面生成最终 Markdown，
 * 再交给 background 打开 Preview 页面。
 */
async function preparePreview():
  Promise<void> {
  const markdown =
    await exportCurrentPageMarkdown()

  await chrome.runtime.sendMessage({
    type:
      'WEBNOTE_OPEN_PREVIEW',

    payload: {
      title: document.title,
      url: location.href,
      markdown,
    },
  })
}

/**
 * ------------------------------
 * Background Messages
 * ------------------------------
 */

chrome.runtime.onMessage.addListener(
  (message) => {
    /**
     * WebNote ON / OFF。
     */
    if (
      message.type ===
      'WEBNOTE_TOGGLE'
    ) {
      isActive = !isActive

      console.log(
        `WebNote is now ${
          isActive
            ? 'ON'
            : 'OFF'
        }`,
      )

      if (!isActive) {
        hoveredAnchor = null

        hideHighlight()
      }

      return
    }

    /**
     * 生成当前页 Preview。
     */
    if (
      message.type ===
      'WEBNOTE_PREVIEW_REQUEST'
    ) {
      void preparePreview()

      return
    }

    /**
     * ------------------------------
     * 清理当前页面
     * ------------------------------
     */
    if (
      message.type ===
      'WEBNOTE_CONFIRM_CLEAR_PAGE'
    ) {
      const confirmed =
        window.confirm(
          '确定要清理当前页面的全部 WebNote 笔记吗？\n\n此操作无法撤销。',
        )

      if (!confirmed) {
        return
      }

      void chrome.runtime
        .sendMessage({
          type:
            'WEBNOTE_CLEAR_PAGE_REQUEST',

          url: location.href,
        })
        .catch((error) => {
          /**
           * 开发阶段重新加载插件后，
           * 老 content script 的 extension context
           * 可能已经失效。
           */
          console.debug(
            'WebNote could not request page cleanup:',
            error,
          )
        })

      return
    }

    /**
     * ------------------------------
     * 清理当前网站
     * ------------------------------
     */
    if (
      message.type ===
      'WEBNOTE_CONFIRM_CLEAR_SITE'
    ) {
      const origin =
        location.origin

      const confirmed =
        window.confirm(
          `确定要清理 ${origin} 下保存的全部 WebNote 笔记吗？\n\n这会删除该网站所有已记录页面的笔记，且无法撤销。`,
        )

      if (!confirmed) {
        return
      }

      void chrome.runtime
        .sendMessage({
          type:
            'WEBNOTE_CLEAR_SITE_REQUEST',

          origin,
        })
        .catch((error) => {
          console.debug(
            'WebNote could not request site cleanup:',
            error,
          )
        })

      return
    }

    /**
     * background 已经完成 storage 删除。
     *
     * 当前页面立即清理运行时 UI。
     */
    if (
      message.type ===
      'WEBNOTE_CLEAR_RENDERED_NOTES'
    ) {
      clearRenderedNotes()

      return
    }
  },
)

/**
 * ------------------------------
 * Initial Restore
 * ------------------------------
 *
 * Content script 首次进入页面时主动恢复一次。
 *
 * 如果正文此时还没完全加载，
 * MutationObserver 后续还会再次触发。
 */
scheduleRestore()