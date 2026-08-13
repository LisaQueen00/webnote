// src/note/createNote.ts

/**
 * 为指定的网页 anchor 创建一条 WebNote 笔记。
 *
 * 当前 Note UI 包含：
 * - 笔记容器
 * - 标题栏
 * - 删除按钮
 * - textarea 编辑区域
 *
 * 后续还会继续加入：
 * - 保存状态
 * - Markdown 支持
 * - 折叠
 * - 持久化
 */
export function createNote(anchor: HTMLElement): HTMLDivElement {
  /**
   * 为这一组：
   *
   * anchor ↔ note
   *
   * 创建唯一 ID。
   *
   * 后续保存、恢复和导出笔记时，
   * 都会依赖这个 ID 建立关系。
   */
  const anchorId = crypto.randomUUID()

  /**
   * 创建整个 Note UI 的外层容器。
   *
   * 不再直接把 textarea 当成完整笔记，
   * 以后新的 UI 功能都可以继续放进这个容器里。
   */
  const noteContainer = document.createElement('div')

  // 标记整个容器属于 WebNote。
  noteContainer.dataset.webnote = 'true'

  // 记录它所对应的 anchor ID。
  noteContainer.dataset.webnoteAnchorId = anchorId

  /**
   * 当前仍然使用内联样式。
   *
   * 这样方便我们先把组件行为做出来。
   * 后续会统一解决样式文件和网页 CSS 污染问题。
   */
  noteContainer.style.display = 'block'
  noteContainer.style.width = '100%'
  noteContainer.style.margin = '12px 0'
  noteContainer.style.boxSizing = 'border-box'
  noteContainer.style.border = '1px solid rgba(139, 92, 246, 0.25)'
  noteContainer.style.borderRadius = '8px'
  noteContainer.style.background = '#ffffff'
  noteContainer.style.color = '#111111'
  noteContainer.style.fontFamily = 'sans-serif'
  noteContainer.style.overflow = 'hidden'

  /**
   * -----------------------------
   * Note Header
   * -----------------------------
   *
   * 标题栏用于承载 WebNote 标识，
   * 后面还可以继续加入：
   *
   * 保存状态 / 折叠 / Markdown 等操作。
   */
  const header = document.createElement('div')

  header.style.display = 'flex'
  header.style.alignItems = 'center'
  header.style.justifyContent = 'space-between'
  header.style.padding = '8px 12px'
  header.style.background = 'rgba(139, 92, 246, 0.06)'
  header.style.borderBottom = '1px solid rgba(139, 92, 246, 0.12)'

  /**
   * Note 标题。
   */
  const title = document.createElement('span')

  title.textContent = '📝 WebNote'

  title.style.fontSize = '13px'
  title.style.fontWeight = '600'
  title.style.lineHeight = '1.4'

  /**
   * 删除按钮。
   */
  const deleteButton = document.createElement('button')

  deleteButton.type = 'button'
  deleteButton.textContent = '×'
  deleteButton.title = '删除笔记'

  deleteButton.style.display = 'flex'
  deleteButton.style.alignItems = 'center'
  deleteButton.style.justifyContent = 'center'
  deleteButton.style.width = '24px'
  deleteButton.style.height = '24px'
  deleteButton.style.padding = '0'
  deleteButton.style.border = 'none'
  deleteButton.style.borderRadius = '4px'
  deleteButton.style.background = 'transparent'
  deleteButton.style.color = '#666666'
  deleteButton.style.fontSize = '18px'
  deleteButton.style.lineHeight = '1'
  deleteButton.style.cursor = 'pointer'

  /**
   * 点击删除按钮时：
   *
   * 1. 移除 Note UI。
   * 2. 删除原网页 anchor 上保存的关系 ID。
   *
   * 这样这个 anchor 就恢复成“没有笔记”的状态，
   * 后面还可以重新添加笔记。
   */
  deleteButton.addEventListener('click', (event) => {
    /**
     * 阻止这个点击继续冒泡到 document。
     *
     * 虽然 content.ts 本身也会排除 WebNote UI，
     * 但组件内部事件由组件自己处理会更加清晰。
     */
    event.stopPropagation()

    // 删除 anchor 上的关联信息。
    delete anchor.dataset.webnoteAnchorId

    // 从页面中删除整个笔记组件。
    noteContainer.remove()
  })

  /**
   * -----------------------------
   * Note Editor
   * -----------------------------
   */
  const noteEditor = document.createElement('textarea')

  noteEditor.placeholder = '写点笔记...'

  noteEditor.style.display = 'block'
  noteEditor.style.width = '100%'
  noteEditor.style.minHeight = '100px'
  noteEditor.style.padding = '12px'
  noteEditor.style.boxSizing = 'border-box'
  noteEditor.style.border = 'none'
  noteEditor.style.outline = 'none'
  noteEditor.style.resize = 'vertical'
  noteEditor.style.background = '#ffffff'
  noteEditor.style.color = '#111111'
  noteEditor.style.fontSize = '14px'
  noteEditor.style.fontFamily = 'inherit'
  noteEditor.style.lineHeight = '1.6'

  /**
   * 组装组件。
   *
   * header:
   *   title + deleteButton
   *
   * noteContainer:
   *   header + noteEditor
   */
  header.append(title, deleteButton)
  noteContainer.append(header, noteEditor)

  /**
   * 在原网页 anchor 上保存相同 ID。
   *
   * 到这里：
   *
   * anchor.dataset.webnoteAnchorId
   *
   * 和：
   *
   * noteContainer.dataset.webnoteAnchorId
   *
   * 就形成了一一对应关系。
   */
  anchor.dataset.webnoteAnchorId = anchorId

  /**
   * 把完整 Note UI 插到 anchor 后面。
   */
  anchor.insertAdjacentElement('afterend', noteContainer)

  /**
   * 创建笔记以后自动让编辑器获得焦点。
   *
   * 用户点击一段原文后，
   * 可以直接开始打字，不需要再额外点击 textarea。
   */
  noteEditor.focus()

  // 返回整个 Note UI，而不是单独返回 textarea。
  return noteContainer
}