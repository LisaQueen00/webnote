// src/types/note.ts

/**
 * 用于描述一个网页 anchor 的特征。
 *
 * 第一版暂时使用：
 * - HTML 标签名
 * - 元素中的文本
 *
 * 后续会继续加入 selector、prefix、suffix 等信息，
 * 提高网页发生变化后的恢复能力。
 */
export interface AnchorFingerprint {
  tagName: string
  text: string
}

/**
 * WebNote 持久化到 chrome.storage 中的数据结构。
 */
export interface StoredNote {
  // 每条笔记自己的唯一 ID。
  id: string

  // 创建这条笔记时所在的网页。
  url: string

  // 用于刷新页面后重新寻找原文。
  anchor: AnchorFingerprint

  // 用户实际输入的笔记内容。
  content: string
}