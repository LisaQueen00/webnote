// src/highlight/highlight.ts

/**
 * WebNote 的独立高亮层。
 *
 * 它使用 fixed 定位覆盖在目标 anchor 上，
 * 不直接修改原网页元素本身的 border / outline，
 * 尽量减少对原页面样式和布局的影响。
 */
const highlightOverlay = document.createElement('div')

// 标记这是 WebNote 自己创建的 DOM。
// content.ts 可以通过这个标记避免把它重新识别成网页内容。
highlightOverlay.dataset.webnote = 'true'

// 高亮层不参与网页正常文档流。
highlightOverlay.style.position = 'fixed'

// 高亮层只负责视觉提示，不应该截获鼠标事件。
// 否则鼠标可能“点到高亮层”而不是下面真正的网页元素。
highlightOverlay.style.pointerEvents = 'none'

highlightOverlay.style.borderRadius = '4px'
highlightOverlay.style.boxSizing = 'border-box'

// 尽量保证高亮显示在普通网页内容上方。
// 这里使用接近 CSS z-index 上限的值。
highlightOverlay.style.zIndex = '2147483647'

// 默认隐藏，只有找到 anchor 时才显示。
highlightOverlay.style.display = 'none'

// 把高亮层挂到当前网页中。
// 它本身不会改变页面布局，因为 position 是 fixed。
document.body.appendChild(highlightOverlay)

/**
 * 显示指定 anchor 的高亮框。
 *
 * @param anchor 要高亮的网页锚点
 * @param soft 是否使用更淡的关联高亮
 *
 * soft = false：
 * 用户正在选择新的笔记位置。
 *
 * soft = true：
 * 用户把鼠标移动到已有笔记上，
 * 此时只淡淡提示“这条笔记对应这段原文”。
 */
export function showHighlight(
  anchor: HTMLElement,
  soft = false,
): void {
  // 获取 anchor 当前相对于浏览器视口的位置和尺寸。
  const rect = anchor.getBoundingClientRect()

  // 因为 overlay 使用 position: fixed，
  // 所以这里直接使用 getBoundingClientRect() 返回的视口坐标。
  highlightOverlay.style.left = `${rect.left}px`
  highlightOverlay.style.top = `${rect.top}px`
  highlightOverlay.style.width = `${rect.width}px`
  highlightOverlay.style.height = `${rect.height}px`

  // 选择模式下稍明显一些，
  // 已有笔记关联提示则更淡，避免影响阅读。
  highlightOverlay.style.border = soft
    ? '2px solid rgba(139, 92, 246, 0.18)'
    : '2px solid rgba(139, 92, 246, 0.32)'

  highlightOverlay.style.display = 'block'
}

/**
 * 隐藏当前 WebNote 高亮层。
 */
export function hideHighlight(): void {
  highlightOverlay.style.display = 'none'
}