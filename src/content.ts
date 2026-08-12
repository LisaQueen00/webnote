console.log('WebNote content script loaded!')

const ANCHOR_SELECTOR =
  'p, h1, h2, h3, h4, h5, h6, li, pre, blockquote'

document.addEventListener('click', (event) => {
  event.preventDefault()

  if (!(event.target instanceof HTMLElement)) return

  const target = event.target

  // 点击的是 WebNote 自己的 UI，就忽略
  if (target.closest('[data-webnote="true"]')) return

// 从真正点击到的元素开始，向上寻找合适的语义锚点
  const anchor = target.closest<HTMLElement>(ANCHOR_SELECTOR)

// 没找到合适的锚点就先不处理
  if (!anchor) return

  // 这个网页元素已经有笔记了，就不要重复创建
  if (target.dataset.webnoteAnchor === 'true') return

  console.log('WebNote clicked:', target)
  console.log('WebNote anchor:', anchor)

  const noteBox = document.createElement('textarea')

  noteBox.dataset.webnote = 'true'
  noteBox.placeholder = '📝 写点笔记...'

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

  anchor.dataset.webnoteAnchor = 'true'

  anchor.insertAdjacentElement('afterend', noteBox)
})