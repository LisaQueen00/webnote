console.log('WebNote content script loaded!')

document.addEventListener('click', (event) => {
  event.preventDefault()

  if (!(event.target instanceof HTMLElement)) return

  const target = event.target

  // 点击的是 WebNote 自己的 UI，就忽略
  if (target.closest('[data-webnote="true"]')) return

  // 这个网页元素已经有笔记了，就不要重复创建
  if (target.dataset.webnoteAnchor === 'true') return

  console.log('WebNote clicked:', target)

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

  target.dataset.webnoteAnchor = 'true'

  target.insertAdjacentElement('afterend', noteBox)
})