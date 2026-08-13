// src/types/preview.ts

/**
 * 从正文页面传给 WebNote 预览页的数据。
 */
export interface PreviewPayload {
  // 当前网页标题，用于预览页显示和生成文件名。
  title: string

  // 原网页地址。
  url: string

  // 已经按 DOM 顺序合并完成的最终 Markdown。
  markdown: string
}