// src/types/preview.ts

/**
 * 一次预览的数据。
 *
 * previewId 用来区分不同预览页面，
 * 避免多个预览互相覆盖。
 */
export interface PreviewPayload {
  // 本次预览唯一 ID。
  id: string

  // 当前网页标题。
  title: string

  // 原网页地址。
  url: string

  // 最终合成后的 Markdown。
  markdown: string

  // 创建时间戳。
  createdAt: number

  // Preview 缓存过期时间。
  expiresAt: number
}