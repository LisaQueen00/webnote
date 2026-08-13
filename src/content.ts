import { findAnchor } from './anchor/findAnchor'
import {
  hideHighlight,
  showHighlight,
} from './highlight/highlight'
import { createNote } from './note/createNote'

console.log('WebNote content script loaded!')

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
 * 接收 background.ts 发来的消息。
 *
 * 用户每点击一次浏览器工具栏里的 WebNote 图标，
 * background.ts 就会发送 WEBNOTE_TOGGLE。
 */
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'WEBNOTE_TOGGLE') return

  // 切换 WebNote 的激活状态。
  isActive = !isActive

  console.log(`WebNote is now ${isActive ? 'ON' : 'OFF'}`)

  /**
   * 关闭 WebNote 时立即隐藏高亮。
   *
   * 这样用户点击图标关闭以后，
   * 页面会马上恢复到普通浏览状态。
   */
  if (!isActive) {
    hideHighlight()
  }
})

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

  // WebNote 开启选择模式时，
  // 暂时阻止链接跳转、按钮提交等默认行为。
  event.preventDefault()

  // WebNote 自己创建的 UI 不参与创建新 anchor。
  if (target.closest('[data-webnote="true"]')) return

  const anchor = findAnchor(target)

  if (!anchor) return

  // 当前一个 anchor 暂时只允许创建一条笔记。
  if (anchor.dataset.webnoteAnchorId) return

  console.log('WebNote clicked:', target)
  console.log('WebNote anchor:', anchor)

  // 具体怎样创建笔记，由 note 模块负责。
  // content.ts 这里只负责确定“什么时候、给谁创建笔记”。
  createNote(anchor)



  // 创建完成后隐藏当前 hover 高亮。
  hideHighlight()
})