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
   * Note UI 只负责交互，
   * 真正的持久化逻辑交给外层处理。
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
 * 为指定 anchor 创建一条 WebNote 笔记。
 *
 * 当前版本使用 Shadow DOM 隔离 Note UI，
 * 尽量避免宿主网页 CSS 污染我们的样式。
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
   * ------------------------------------------------
   * Shadow Host
   * ------------------------------------------------
   *
   * 这个 div 会真正插入原网页 DOM。
   *
   * Note UI 本身不会直接作为它的普通子元素，
   * 而是被放进 Shadow Root 中。
   */
  const noteHost = document.createElement('div')

  // 标记这是 WebNote 自己创建的 DOM。
  noteHost.dataset.webnote = 'true'

  // 保存对应 anchor 的 ID。
  noteHost.dataset.webnoteAnchorId = anchorId

  /**
   * host 本身仍属于原网页文档流，
   * 所以这里只保留最基础的布局属性。
   */
  noteHost.style.display = 'block'
  noteHost.style.width = '100%'
  noteHost.style.margin = '12px 0'
  noteHost.style.boxSizing = 'border-box'

  /**
   * 创建 Shadow Root。
   *
   * mode: 'open'
   * 表示我们仍然可以通过 noteHost.shadowRoot
   * 获取里面的 DOM。
   */
  const shadowRoot = noteHost.attachShadow({
    mode: 'open',
  })

  /**
   * ------------------------------------------------
   * Shadow DOM 内部样式
   * ------------------------------------------------
   *
   * 样式放进 Shadow Root 后，
   * 宿主网页的大多数 CSS selector
   * 无法直接影响里面的元素。
   */
  const style = document.createElement('style')

  style.textContent = `
    :host {
      display: block;
      width: 100%;
      box-sizing: border-box;
    }

    * {
      box-sizing: border-box;
    }

    .webnote-container {
      width: 100%;
      overflow: hidden;

      border:
        1px solid rgba(139, 92, 246, 0.25);
      border-radius: 8px;

      background: #ffffff;
      color: #111111;

      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    .webnote-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      padding: 8px 12px;

      background:
        rgba(139, 92, 246, 0.06);

      border-bottom:
        1px solid rgba(139, 92, 246, 0.12);
    }

    .webnote-title {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.4;
    }

    .webnote-delete {
      display: flex;
      align-items: center;
      justify-content: center;

      width: 24px;
      height: 24px;

      padding: 0;
      border: none;
      border-radius: 4px;

      background: transparent;
      color: #666666;

      font: inherit;
      font-size: 18px;
      line-height: 1;

      cursor: pointer;
    }

    .webnote-delete:hover {
      background:
        rgba(0, 0, 0, 0.05);
    }

    .webnote-editor {
      display: block;

      width: 100%;
      min-height: 100px;

      padding: 12px;

      border: none;
      outline: none;

      resize: vertical;

      background: #ffffff;
      color: #111111;

      font: inherit;
      font-size: 14px;
      line-height: 1.6;
    }

    .webnote-editor::placeholder {
      color: #999999;
    }
  `

  /**
   * ------------------------------------------------
   * Note UI
   * ------------------------------------------------
   */
  const noteContainer =
    document.createElement('div')

  noteContainer.className =
    'webnote-container'

  /**
   * 标题栏。
   */
  const header = document.createElement('div')

  header.className =
    'webnote-header'

  /**
   * 标题。
   */
  const title = document.createElement('span')

  title.className =
    'webnote-title'

  title.textContent =
    '📝 WebNote'

  /**
   * 删除按钮。
   */
  const deleteButton =
    document.createElement('button')

  deleteButton.className =
    'webnote-delete'

  deleteButton.type = 'button'
  deleteButton.textContent = '×'
  deleteButton.title = '删除笔记'

  /**
   * 删除笔记时：
   *
   * 1. 通知外层删除 storage 数据
   * 2. 解除 anchor 和 note 的关系
   * 3. 删除整个 Shadow Host
   */
  deleteButton.addEventListener(
    'click',
    (event) => {
      event.stopPropagation()

      void onDelete?.(anchorId)

      delete anchor.dataset.webnoteAnchorId

      noteHost.remove()
    },
  )

  /**
   * 笔记编辑器。
   */
  const noteEditor =
    document.createElement('textarea')

  noteEditor.className =
    'webnote-editor'

  noteEditor.placeholder =
    '写点笔记...'

  noteEditor.value =
    initialContent

  /**
   * 输入防抖。
   *
   * 用户停止输入 300ms 后再通知外层保存。
   */
  let saveTimer: number | undefined

  noteEditor.addEventListener(
    'input',
    () => {
      if (saveTimer !== undefined) {
        window.clearTimeout(saveTimer)
      }

      saveTimer = window.setTimeout(
        () => {
          void onChange?.(
            anchorId,
            noteEditor.value,
          )
        },
        300,
      )
    },
  )

  /**
   * 组装 Note UI。
   */
  header.append(
    title,
    deleteButton,
  )

  noteContainer.append(
    header,
    noteEditor,
  )

  /**
   * Shadow Root 内加入样式和 UI。
   */
  shadowRoot.append(
    style,
    noteContainer,
  )

  /**
   * anchor 和 note 使用相同 ID。
   */
  anchor.dataset.webnoteAnchorId =
    anchorId

  /**
   * 把 Shadow Host 插到 anchor 后面。
   */
  anchor.insertAdjacentElement(
    'afterend',
    noteHost,
  )

  return noteHost
}