import {
  createAnchorFingerprint,
  findAnchor,
  findAnchorFromFingerprint,
} from './anchor/findAnchor'
import {
  hideHighlight,
  showHighlight,
} from './highlight/highlight'
import { createNote } from './note/createNote'
import {
  deleteNote,
  getNotesForPage,
  saveNote,
} from './storage/noteStorage'

import type { StoredNote } from './types/note'

import {exportCurrentPageMarkdown,} from './export/exportPageNotes'

console.log('WebNote content script loaded!')

/**
 * 当前 WebNote 认为正在处理的页面 URL。
 *
 * SPA 路由切换时 content script 本身不会重新加载，
 * 所以需要自己判断 location.href 是否已经变化。
 */
let currentPageUrl = location.href

/**
 * restoreNotes() 的 debounce timer。
 *
 * 动态网页一次渲染可能连续产生大量 DOM mutation，
 * 我们不希望每个 mutation 都执行一次笔记恢复。
 */
let restoreTimer: number | undefined

/**
 * 清理当前页面中 WebNote 已经渲染出来的运行时 UI 和标记。
 *
 * 注意：
 * 这里只删除 DOM 中的 Note UI 和 anchor 标记，
 * 不删除 chrome.storage.local 中真正保存的笔记数据。
 */
function clearRenderedNotes(): void {
  /**
   * 删除 WebNote Note Host。
   *
   * Note UI 本身现在位于 Shadow DOM 中，
   * 但 Shadow Host 仍然是普通 DOM 元素，
   * 所以可以直接从 document 中找到。
   */
  document
    .querySelectorAll<HTMLElement>(
      '[data-webnote="true"][data-webnote-anchor-id]',
    )
    .forEach((noteHost) => {
      noteHost.remove()
    })

  /**
   * 清掉原网页 anchor 上的运行时关联 ID。
   *
   * 如果不清理，
   * restoreNotes() 会认为这些 anchor 已经恢复过。
   */
  document
    .querySelectorAll<HTMLElement>(
      '[data-webnote-anchor-id]',
    )
    .forEach((anchor) => {
      delete anchor.dataset.webnoteAnchorId
    })

  // 页面切换时顺便隐藏旧的高亮。
  hideHighlight()
}

/**
 * 延迟执行一次恢复。
 *
 * 动态页面经常连续修改 DOM，
 * 因此等待短暂稳定后再寻找 anchor。
 */
function scheduleRestore(): void {
  if (restoreTimer !== undefined) {
    window.clearTimeout(restoreTimer)
  }

  restoreTimer = window.setTimeout(() => {
    void restoreNotes()
  }, 300)
}

/**
 * 检查当前 URL 是否发生变化。
 *
 * 对传统整页导航来说 content script 会重新加载；
 * 这个逻辑主要是处理 React / Next.js 等 SPA 路由。
 */
function checkPageChange(): void {
  const newUrl = location.href

  // URL 没变，只说明当前页面 DOM 可能更新了。
  if (newUrl === currentPageUrl) {
    scheduleRestore()
    return
  }

  /**
   * SPA 已经切换到了另一个 URL。
   */
  currentPageUrl = newUrl

  // 清理上一页面的运行时 DOM 状态。
  clearRenderedNotes()

  // 等新页面内容渲染后重新恢复当前 URL 的笔记。
  scheduleRestore()
}

/**
 * 监听动态网页 DOM 变化。
 *
 * 这同时解决两个问题：
 *
 * 1. 首次刷新时正文异步加载较晚
 * 2. SPA 路由切换后新页面重新渲染
 */
const pageObserver = new MutationObserver(() => {
  checkPageChange()
})

pageObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
})

/**
 * 浏览器前进 / 后退时会触发 popstate。
 *
 * MutationObserver 通常也会捕获随后的 DOM 变化，
 * 这里额外监听一次，让页面切换响应更直接。
 */
window.addEventListener('popstate', () => {
  checkPageChange()
})

/**
 * 首次进入页面时主动恢复一次。
 *
 * 即使第一次正文还没有加载完成，
 * 后面的 MutationObserver 仍会再次触发恢复。
 */
scheduleRestore()


// WebNote 默认关闭。
// 只有用户点击浏览器工具栏图标后，才进入选择模式。
let isActive = false


/**
 * 根据 WebNote 保存的 anchor ID，
 * 找回与某条笔记对应的原网页元素。
 */
function findAnchorById(anchorId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-webnote-anchor-id="${anchorId}"]`,
  )
}

/**
 * 接收来自 background.ts 的命令。
 *
 * 当前支持：
 *
 * WEBNOTE_TOGGLE
 * → 切换笔记选择模式
 *
 * WEBNOTE_PREVIEW_REQUEST
 * → 生成当前页面完整 Markdown 并打开预览
 */
chrome.runtime.onMessage.addListener((message) => {
  /**
   * ------------------------------
   * WebNote ON / OFF
   * ------------------------------
   */
  if (message.type === 'WEBNOTE_TOGGLE') {
    isActive = !isActive

    console.log(
      `WebNote is now ${isActive ? 'ON' : 'OFF'}`,
    )

    if (!isActive) {
      hideHighlight()
    }

    return
  }

  /**
   * ------------------------------
   * Markdown Preview
   * ------------------------------
   */
  if (message.type === 'WEBNOTE_PREVIEW_REQUEST') {
    /**
     * 导出过程需要读取 storage 和当前 DOM，
     * 因此是异步操作。
     */
    void preparePreview()
  }
})

/**
 * 为当前网页生成最终 Markdown，
 * 再交给 background 打开预览页面。
 */
async function preparePreview(): Promise<void> {
  const markdown =
    await exportCurrentPageMarkdown()

  /**
   * 将最终结果交给 background。
   *
   * 注意这里传的是已经合并好的最终 Markdown，
   * preview 页面不再重新参与任何笔记排序或转换。
   */
  await chrome.runtime.sendMessage({
    type: 'WEBNOTE_OPEN_PREVIEW',

    payload: {
      title: document.title,
      url: location.href,
      markdown,
    },
  })
}

/**
 * 鼠标移动时预览当前 anchor。
 */
document.addEventListener('mousemove', (event) => {
  /**
   * WebNote 没开启时直接退出。
   *
   * 这是整个开关机制最重要的一层：
   * OFF 状态下，我们完全不处理网页的 mousemove。
   */
  if (!isActive) return

  if (!(event.target instanceof HTMLElement)) return

  const target = event.target

  // 判断鼠标是否位于 WebNote 自己创建的 UI 中。
  const webNoteElement = target.closest<HTMLElement>(
    '[data-webnote="true"]',
  )

  if (webNoteElement) {
    // 如果当前 WebNote UI 关联了某个 anchor，
    // 就淡淡高亮对应原文。
    const anchorId = webNoteElement.dataset.webnoteAnchorId

    if (anchorId) {
      const anchor = findAnchorById(anchorId)

      if (anchor) {
        showHighlight(anchor, true)
        return
      }
    }

    // 其他 WebNote UI 不显示 anchor。
    hideHighlight()
    return
  }

  const anchor = findAnchor(target)

  if (!anchor) {
    hideHighlight()
    return
  }

  // 用户正在选择网页内容时显示正常强度的高亮。
  showHighlight(anchor, true)
})

/**
 * 页面加载完成以后，
 * 从 chrome.storage 中读取这个 URL 保存的笔记，
 * 并尝试重新找到对应 anchor。
 */
async function restoreNotes(): Promise<void> {
  const notes = await getNotesForPage(location.href)

  for (const note of notes) {
    /**
     * 根据之前保存的 anchor fingerprint，
     * 尝试在当前 DOM 中重新找到原文。
     */
    const anchor = findAnchorFromFingerprint(note.anchor)

    // 网页内容可能已经发生变化。
    // 找不到 anchor 时，这一版暂时跳过。
    if (!anchor) {
      console.warn(
        'WebNote could not restore anchor:',
        note,
      )

      continue
    }

    // 防止重复创建同一 anchor 的 Note UI。
    if (anchor.dataset.webnoteAnchorId) continue

    /**
     * 恢复已有 Note UI。
     */
    createNote(anchor, {
      id: note.id,
      initialContent: note.content,

      onChange: async (noteId, content) => {
        await saveNote({
          ...note,
          id: noteId,
          content,
        })
      },

      onDelete: async (noteId) => {
        await deleteNote(location.href, noteId)
      },
    })
  }
}

/**
 * 点击网页内容时创建笔记。
 */
document.addEventListener('click', (event) => {
  /**
   * WebNote 关闭时必须立刻退出。
   *
   * 特别注意：
   * event.preventDefault() 必须放在这个判断之后。
   *
   * 否则即使 WebNote OFF，
   * 我们仍然会阻止网页链接跳转。
   */
  if (!isActive) return

  if (!(event.target instanceof HTMLElement)) return

  const target = event.target

  // WebNote 自己创建的 UI 不参与创建新 anchor。
  if (target.closest('[data-webnote="true"]')) return

  // WebNote 开启选择模式时，
  // 暂时阻止链接跳转、按钮提交等默认行为。
  event.preventDefault()

  const anchor = findAnchor(target)

  if (!anchor) return

  // 当前一个 anchor 暂时只允许创建一条笔记。
  if (anchor.dataset.webnoteAnchorId) return

  console.log('WebNote clicked:', target)
  console.log('WebNote anchor:', anchor)

  // 具体怎样创建笔记，由 note 模块负责。
  // content.ts 这里只负责确定“什么时候、给谁创建笔记”。
  // 为新笔记创建唯一 ID。
const noteId = crypto.randomUUID()

// 保存 anchor 的第一版特征。
const anchorFingerprint =
  createAnchorFingerprint(anchor)

// 创建数据对象。
const note: StoredNote = {
  id: noteId,
  url: location.href,
  anchor: anchorFingerprint,
  content: '',
}

// 创建 Note UI。
const noteElement = createNote(anchor, {
  id: noteId,

  onChange: async (id, content) => {
    await saveNote({
      ...note,
      id,
      content,
    })
  },

  onDelete: async (id) => {
    await deleteNote(location.href, id)
  },
})

/**
 * 新创建的笔记让编辑器自动获得焦点。
 *
 * textarea 现在位于 Shadow DOM 中，
 * 所以需要先通过 shadowRoot 进入组件内部。
 */
noteElement.shadowRoot
  ?.querySelector<HTMLTextAreaElement>(
    'textarea',
  )
  ?.focus()

// 先保存空笔记，建立持久化关系。
void saveNote(note)



  // 创建完成后隐藏当前 hover 高亮。
  hideHighlight()
})