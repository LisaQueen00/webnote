// src/types/note.ts

/**
 * 用于描述一个网页 anchor 的持久化特征。
 *
 * WebNote 会保存多个定位依据，而不是只依赖一种方法。
 * 这样网页结构发生轻微变化时，还有机会通过其他特征恢复。
 */
export interface AnchorFingerprint {
  /**
   * anchor 的 HTML 标签名。
   *
   * 例如：
   * p / h2 / li / pre
   */
  tagName: string

  /**
   * anchor 中经过规范化处理后的文本。
   *
   * 用于 selector 失效后的文本匹配。
   */
  text: string

  /**
   * anchor 在当前 DOM 中的结构路径。
   *
   * 这里使用可选属性，是为了兼容我们之前已经保存到
   * chrome.storage 中的旧笔记。
   *
   * 旧数据没有 selector 也依然能够恢复。
   */
  selector?: string
}

/**
 * WebNote 持久化的数据结构。
 */
export interface StoredNote {
  // 每条笔记自己的唯一 ID。
  id: string

  // 创建笔记时所在的网页。
  url: string

  // 用于重新寻找原文 anchor。
  anchor: AnchorFingerprint

  // 用户实际输入的笔记内容。
  content: string
}