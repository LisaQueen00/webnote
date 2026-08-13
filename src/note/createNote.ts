// src/note/createNote.ts

/**
 * 为指定 anchor 创建一条新的 WebNote 笔记。
 *
 * 当前版本仍然使用原生 textarea。
 * 后续这里会继续升级成真正的笔记组件，
 * 例如加入标题栏、删除按钮、保存状态等。
 */
export function createNote(anchor: HTMLElement): HTMLTextAreaElement {
  /**
   * 为这一组：
   *
   * anchor ↔ note
   *
   * 生成唯一 ID。
   *
   * 这个 ID 后续会用于：
   * - 找回原文 anchor
   * - 保存笔记
   * - 恢复笔记
   * - 删除笔记
   * - Markdown 导出
   */
  const anchorId = crypto.randomUUID()

  // 创建当前最简单的笔记输入框。
  const noteBox = document.createElement('textarea')

  /**
   * 标记这是 WebNote 自己创建的 DOM。
   *
   * content.ts 在处理鼠标事件时，
   * 会利用这个标记排除 WebNote 自己的 UI。
   */
  noteBox.dataset.webnote = 'true'

  /**
   * 在笔记元素上记录对应 anchor 的 ID。
   *
   * 这样即使以后笔记 UI 和 anchor
   * 不再紧挨着，也仍然能够建立对应关系。
   */
  noteBox.dataset.webnoteAnchorId = anchorId

  noteBox.placeholder = '📝 写点笔记...'

  /**
   * 当前仍然使用内联样式快速构建原型。
   *
   * 后面会把样式独立出去，
   * 并进一步解决网页 CSS 污染的问题。
   */
  noteBox.style.display = 'block'
  noteBox.style.width = '100%'
  noteBox.style.minHeight = '100px'
  noteBox.style.margin = '12px 0'
  noteBox.style.padding = '12px'
  noteBox.style.boxSizing = 'border-box'
  noteBox.style.border = '1px solid #ccc'
  noteBox.style.borderRadius = '8px'
  noteBox.style.background = '#fff'
  noteBox.style.color = '#111'
  noteBox.style.fontSize = '14px'
  noteBox.style.fontFamily = 'sans-serif'

  /**
   * 原网页 anchor 保存相同 ID。
   *
   * 从这里开始，
   * anchor 和 note 就有了明确的数据关系。
   */
  anchor.dataset.webnoteAnchorId = anchorId

  /**
   * 将笔记插入 anchor 后面。
   *
   * 当前 WebNote 的核心体验就是：
   *
   * 原文
   * ↓
   * 笔记
   * ↓
   * 后续原文
   */
  anchor.insertAdjacentElement('afterend', noteBox)

  // 返回创建好的笔记元素，
  // 方便调用方后续继续操作。
  return noteBox
}