// src/anchor/findAnchor.ts

import type { AnchorFingerprint } from '../types/note'

/**
 * 当前第一版允许作为笔记锚点的语义元素。
 *
 * 后续我们会逐步升级这里的选择策略。
 */
export const ANCHOR_SELECTOR =
  'p, h1, h2, h3, h4, h5, h6, li, pre, blockquote'

/**
 * 从用户真正点击到的 DOM 元素开始，
 * 沿 DOM 树向上寻找合适的语义 anchor。
 */
export function findAnchor(
  target: HTMLElement,
): HTMLElement | null {
  return target.closest<HTMLElement>(ANCHOR_SELECTOR)
}

/**
 * 规范化网页文本。
 *
 * HTML 中可能存在：
 *
 * 多个空格
 * 换行
 * tab
 *
 * 我们把它们统一压缩成一个空格，
 * 避免仅仅因为排版不同就无法匹配。
 */
function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * 根据一个已经选中的 anchor，
 * 生成用于持久化的“锚点指纹”。
 */
export function createAnchorFingerprint(
  anchor: HTMLElement,
): AnchorFingerprint {
  return {
    tagName: anchor.tagName.toLowerCase(),
    text: normalizeText(anchor.innerText || anchor.textContent || ''),
  }
}

/**
 * 页面重新加载以后，
 * 根据之前保存的锚点指纹尝试重新找到原网页元素。
 *
 * 第一版算法：
 *
 * 1. 找出所有支持的语义元素
 * 2. 标签名相同
 * 3. 规范化后的文本完全相同
 *
 * 后续这个函数会成为 Anchor Engine
 * 一个非常重要的升级点。
 */
export function findAnchorFromFingerprint(
  fingerprint: AnchorFingerprint,
): HTMLElement | null {
  const candidates =
    document.querySelectorAll<HTMLElement>(ANCHOR_SELECTOR)

  for (const candidate of candidates) {
    const tagName = candidate.tagName.toLowerCase()

    const text = normalizeText(
      candidate.innerText || candidate.textContent || '',
    )

    if (
      tagName === fingerprint.tagName &&
      text === fingerprint.text
    ) {
      return candidate
    }
  }

  return null
}