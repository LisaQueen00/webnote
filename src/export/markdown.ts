// src/export/markdown.ts

import TurndownService from 'turndown'

/**
 * WebNote 使用的 HTML → Markdown 转换器。
 *
 * 当前目标：
 * - 尽量保留原文中的粗体、斜体、代码、标题、列表等结构
 * - 输出常见 Markdown 风格
 */
const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
})

/**
 * 将网页中的一个 anchor 元素转换成 Markdown。
 *
 * 使用 outerHTML，而不是 textContent，
 * 是为了尽可能保留原文中的 HTML 语义结构。
 */
export function anchorToMarkdown(
  anchor: HTMLElement,
): string {
  return turndownService
    .turndown(anchor.outerHTML)
    .trim()
}

/**
 * 将一段 Markdown 整体转换成 blockquote。
 *
 * 例如：
 *
 * Hello
 *
 * **world**
 *
 * 会转换成：
 *
 * > Hello
 * >
 * > **world**
 *
 * 空行也需要转换成单独的 ">"，
 * 否则 Markdown 引用块可能会被中断。
 */
export function markdownToQuote(
  markdown: string,
): string {
  return markdown
    .split('\n')
    .map((line) => {
      if (line.trim() === '') {
        return '>'
      }

      return `> ${line}`
    })
    .join('\n')
}

/**
 * 将：
 *
 * 原文引用
 * +
 * 用户笔记正文
 *
 * 合成为 WebNote 最终导出的一个笔记块。
 *
 * 最终格式：
 *
 * > 原文……
 *
 * 我的笔记……
 */
export function createNoteMarkdownBlock(
  sourceMarkdown: string,
  noteContent: string,
): string {
  const source = sourceMarkdown.trim()
  const note = noteContent.trim()

  /**
   * 空笔记不参与最终导出。
   */
  if (!note) {
    return ''
  }

  const quotedSource =
    markdownToQuote(source)

  return `${quotedSource}\n\n${note}`
}