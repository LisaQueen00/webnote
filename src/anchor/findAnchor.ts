// src/anchor/findAnchor.ts

/**
 * 当前第一版允许作为笔记锚点的语义元素。
 *
 * 这些元素通常代表一段完整、可阅读的内容：
 * 段落、标题、列表项、代码块、引用等。
 *
 * 后续这里不会只是不断增加 selector，
 * 而会逐步升级成更智能的 anchor 选择策略。
 */
const ANCHOR_SELECTOR =
  'p, h1, h2, h3, h4, h5, h6, li, pre, blockquote'

/**
 * 从用户实际命中的 DOM 元素开始，
 * 沿 DOM 树向上寻找适合作为笔记锚点的元素。
 *
 * 例如：
 *
 * <p>
 *   Hello <strong>world</strong>
 * </p>
 *
 * 如果用户点击 <strong>，
 * closest() 会向父级查找并最终返回外层 <p>。
 */
export function findAnchor(
  target: HTMLElement,
): HTMLElement | null {
  return target.closest<HTMLElement>(ANCHOR_SELECTOR)
}