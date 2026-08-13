// src/note/createNote.ts

/**
 * 创建 Note UI 时允许传入的配置。
 */
interface CreateNoteOptions {
  // 笔记唯一 ID。
  id: string

  // 恢复已有笔记时使用。
  initialContent?: string

  /**
   * 用户修改笔记内容时触发。
   *
   * 外层负责决定怎么持久化，
   * Note UI 本身不直接依赖 chrome.storage。
   */
  onChange?: (
    noteId: string,
    content: string,
  ) => void | Promise<void>

  /**
   * 用户删除笔记时触发。
   */
  onDelete?: (
    noteId: string,
  ) => void | Promise<void>
}

/**
 * 为指定 anchor 创建 WebNote Note UI。
 */
export function createNote(
  anchor: HTMLElement,
  options: CreateNoteOptions,
): HTMLDivElement {
  const {
    id: anchorId,
    initialContent = '',
    onChange,
    onDelete,
  } = options

  /**
   * 创建整个 Note UI 外层。
   */
  const noteContainer = document.createElement('div')

  noteContainer.dataset.webnote = 'true'
  noteContainer.dataset.webnoteAnchorId = anchorId

  noteContainer.style.display = 'block'
  noteContainer.style.width = '100%'
  noteContainer.style.margin = '12px 0'
  noteContainer.style.boxSizing = 'border-box'
  noteContainer.style.border =
    '1px solid rgba(139, 92, 246, 0.25)'
  noteContainer.style.borderRadius = '8px'
  noteContainer.style.background = '#ffffff'
  noteContainer.style.color = '#111111'
  noteContainer.style.fontFamily = 'sans-serif'
  noteContainer.style.overflow = 'hidden'

  /**
   * ---------------------------
   * Header
   * ---------------------------
   */
  const header = document.createElement('div')

  header.style.display = 'flex'
  header.style.alignItems = 'center'
  header.style.justifyContent = 'space-between'
  header.style.padding = '8px 12px'
  header.style.background = 'rgba(139, 92, 246, 0.06)'
  header.style.borderBottom =
    '1px solid rgba(139, 92, 246, 0.12)'

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
   * 点击删除：
   *
   * 1. 通知外层删除持久化数据
   * 2. 解除 anchor 关系
   * 3. 删除 Note UI
   */
  deleteButton.addEventListener('click', (event) => {
    event.stopPropagation()

    // 不阻塞 UI 删除，
    // storage 删除可以异步完成。
    void onDelete?.(anchorId)

    delete anchor.dataset.webnoteAnchorId

    noteContainer.remove()
  })

  /**
   * ---------------------------
   * Editor
   * ---------------------------
   */
  const noteEditor = document.createElement('textarea')

  noteEditor.placeholder = '写点笔记...'

  // 如果这是从 storage 恢复出来的笔记，
  // 直接把之前内容填回来。
  noteEditor.value = initialContent

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
   * 保存防抖计时器。
   *
   * 我们不希望用户每敲一个字，
   * 都立即执行一次 storage 写入。
   */
  let saveTimer: number | undefined

  noteEditor.addEventListener('input', () => {
    if (saveTimer !== undefined) {
      window.clearTimeout(saveTimer)
    }

    /**
     * 停止输入 300ms 后再保存。
     *
     * 这就是一个非常简单的 debounce。
     */
    saveTimer = window.setTimeout(() => {
      void onChange?.(
        anchorId,
        noteEditor.value,
      )
    }, 300)
  })

  /**
   * 组装 Note UI。
   */
  header.append(title, deleteButton)
  noteContainer.append(header, noteEditor)

  /**
   * anchor 和 note 使用同一个 ID。
   */
  anchor.dataset.webnoteAnchorId = anchorId

  anchor.insertAdjacentElement(
    'afterend',
    noteContainer,
  )

  return noteContainer
}