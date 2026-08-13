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
 * Content Script 启动以后，
 * 自动恢复当前网页以前保存的笔记。
 */
void restoreNotes()

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