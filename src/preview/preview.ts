// src/preview/preview.ts

import { marked } from 'marked'
import DOMPurify from 'dompurify'

import type {
  PreviewPayload,
} from '../types/preview'

import './preview.css'

/**
 * 从当前 Preview 页 URL 中读取 previewId。
 *
 * URL 形式：
 * preview.html?id=abc123
 */
function getPreviewId(): string | null {
  const params =
    new URLSearchParams(location.search)

  return params.get('id')
}

/**
 * Preview 页面入口。
 */
async function initPreview(): Promise<void> {
  const app =
    document.querySelector<HTMLDivElement>('#app')

  if (!app) return

  /**
   * 当前 Preview 页必须带有 previewId。
   */
  const previewId = getPreviewId()

  if (!previewId) {
    app.textContent =
      '缺少 WebNote Preview ID。'

    return
  }

  /**
   * 根据 previewId 构造独立 storage key。
   */
  const storageKey =
    `webnotePreview:${previewId}`

  const result =
    await chrome.storage.session.get(
      storageKey,
    )

  const payload =
    result[storageKey] as
      | PreviewPayload
      | undefined

  if (!payload) {
    app.textContent =
      '没有找到对应的 WebNote 预览数据。'

    return
  }
  /**
 * Preview 已经过期时，不再继续展示。
 *
 * 理论上 background 的 cleanup 会处理，
 * 这里再做一层校验，
 * 防止用户打开了很久以前留下的 Preview URL。
 */
  if (payload.expiresAt <= Date.now()) {
    await chrome.storage.session.remove(
      storageKey,
    )

    app.textContent =
    '这份 WebNote 预览已经过期，请从原页面重新生成。'

    return
  }

  /**
   * 创建整个预览页面结构。
   */
  const page =
    document.createElement('main')

  page.className = 'preview-page'

  /**
   * -----------------------------
   * Header
   * -----------------------------
   */
  const header =
    document.createElement('header')

  header.className = 'preview-header'

  const info =
    document.createElement('div')

  const title =
    document.createElement('h1')

  title.className = 'preview-title'
  title.textContent =
    payload.title || 'WebNote'

  const source =
    document.createElement('div')

  source.className = 'preview-source'
  source.textContent = payload.url

  info.append(title, source)

  /**
   * 两个唯一的操作按钮：
   *
   * 复制到剪贴板
   * 导出为文件
   */
  const actions =
    document.createElement('div')

  actions.className = 'preview-actions'

  const copyButton =
    createButton('复制到剪贴板')

  const exportButton =
    createButton('导出为文件')

  actions.append(
    copyButton,
    exportButton,
  )

  header.append(info, actions)

  /**
   * -----------------------------
   * Markdown Preview
   * -----------------------------
   */
  const preview =
    document.createElement('article')

  preview.className = 'markdown-preview'

  if (!payload.markdown.trim()) {
    /**
     * 当前页面没有任何非空笔记时，
     * 不需要制造一份空文件。
     */
    preview.classList.add('empty')

    preview.textContent =
      '当前页面还没有可导出的非空笔记。'

    copyButton.disabled = true
    exportButton.disabled = true
  } else {
    /**
     * Markdown → HTML。
     *
     * marked 本身不负责 HTML 安全过滤，
     * 因此最终写入 DOM 前交给 DOMPurify 清理。
     */
    const renderedHtml =
      await marked.parse(payload.markdown)

    preview.innerHTML =
      DOMPurify.sanitize(renderedHtml)
  }

  /**
   * -----------------------------
   * Copy
   * -----------------------------
   */
  copyButton.addEventListener(
    'click',
    async () => {
      await navigator.clipboard.writeText(
        payload.markdown,
      )

      /**
       * 给用户一个很轻的操作反馈。
       */
      copyButton.textContent = '已复制'

      window.setTimeout(() => {
        copyButton.textContent =
          '复制到剪贴板'
      }, 1200)
    },
  )

  /**
   * -----------------------------
   * Export .md
   * -----------------------------
   */
  exportButton.addEventListener(
    'click',
    () => {
      downloadMarkdown(payload)
    },
  )

  page.append(
    header,
    preview,
  )

  app.append(page)
}

/**
 * 创建 Preview 页面按钮。
 */
function createButton(
  text: string,
): HTMLButtonElement {
  const button =
    document.createElement('button')

  button.type = 'button'
  button.className = 'preview-button'
  button.textContent = text

  return button
}

/**
 * 将网页标题转换成适合作为文件名的文本。
 *
 * Windows 不允许文件名中包含：
 *
 * \ / : * ? " < > |
 */
function createFileName(
  title: string,
): string {
  const safeTitle = title
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return `${safeTitle || 'WebNote'}.md`
}

/**
 * 将最终 Markdown 保存为真正的 .md 文件。
 */
function downloadMarkdown(
  payload: PreviewPayload,
): void {
  /**
   * Blob 保存的内容就是最终 Markdown 原文。
   */
  const blob = new Blob(
    [payload.markdown],
    {
      type: 'text/markdown;charset=utf-8',
    },
  )

  const blobUrl =
    URL.createObjectURL(blob)

  const link =
    document.createElement('a')

  link.href = blobUrl
  link.download =
    createFileName(payload.title)

  /**
   * 临时放进 DOM 再触发下载，
   * 完成后立即清理。
   */
  document.body.appendChild(link)

  link.click()

  link.remove()

  URL.revokeObjectURL(blobUrl)
}

/**
 * 启动 Preview 页面。
 */
void initPreview()