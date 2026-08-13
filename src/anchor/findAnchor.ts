// src/anchor/findAnchor.ts

import type { AnchorFingerprint } from '../types/note'

/**
 * 当前允许作为笔记 anchor 的基础语义元素。
 *
 * 后面还会继续升级选择策略，
 * 现在先保留这一组相对可靠的阅读内容元素。
 */
export const ANCHOR_SELECTOR =
  'p, h1, h2, h3, h4, h5, h6, li, pre, blockquote'

/**
 * 从用户真正命中的 DOM 元素开始，
 * 沿 DOM 树向上寻找一个适合作为笔记 anchor 的元素。
 */
export function findAnchor(
  target: HTMLElement,
): HTMLElement | null {
  return target.closest<HTMLElement>(ANCHOR_SELECTOR)
}

/**
 * 规范化文本。
 *
 * 将：
 * - 换行
 * - Tab
 * - 连续多个空格
 *
 * 全部压缩成一个普通空格。
 *
 * 这样纯粹的网页排版变化不会导致文本匹配失败。
 */
function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * 为一个 DOM 元素生成结构 selector。
 *
 * 第一版策略：
 *
 * 1. 如果元素或祖先具有 id，就优先利用 id。
 * 2. 否则使用 tagName + :nth-of-type() 描述结构位置。
 *
 * 例如可能生成：
 *
 * body > main > article > p:nth-of-type(3)
 *
 * 或：
 *
 * #content > article > p:nth-of-type(3)
 */
function createCssSelector(element: HTMLElement): string {
  const segments: string[] = []

  let current: HTMLElement | null = element

  while (current && current !== document.body) {
    /**
     * 如果遇到 id，通常已经足够作为比较强的定位依据。
     *
     * CSS.escape() 用来处理 id 中可能出现的特殊字符。
     */
    if (current.id) {
      segments.unshift(`#${CSS.escape(current.id)}`)

      return segments.join(' > ')
    }

    // 当前元素的标签名。
    // 先保存成局部常量，避免后面的回调函数再次引用可能变化的 current。
    const tagName = current.tagName.toLowerCase()

    // 获取当前元素的父节点。
    // 显式声明类型，让 TypeScript 清楚这里可能为 null。
    const parent: HTMLElement | null = current.parentElement

    if (!parent) break

    /**
     * parent.children 是 HTMLCollection，
     * 转成 HTMLElement[] 后方便后续处理。
     */
    const siblings = Array.from(
    parent.children,
    ) as HTMLElement[]

    /**
     * 找出和当前元素相同标签类型的兄弟节点。
     *
     * 这里使用前面已经保存好的 tagName，
     * 而不是在回调里再次访问 current，
     * 避免 TypeScript 认为 current 可能已经变成 null。
     */
    const sameTagElements = siblings.filter(
    (child: HTMLElement) =>
        child.tagName.toLowerCase() === tagName,
    )

    if (sameTagElements.length > 1) {
    const index = sameTagElements.indexOf(current) + 1

    segments.unshift(
        `${tagName}:nth-of-type(${index})`,
    )
    } else {
    segments.unshift(tagName)
    }

    current = parent
  }

  /**
   * 如果一路都没有遇到带 id 的祖先，
   * selector 最终就从 body 开始。
   */
  segments.unshift('body')

  return segments.join(' > ')
}

/**
 * 根据当前 anchor 创建持久化 fingerprint。
 */
export function createAnchorFingerprint(
  anchor: HTMLElement,
): AnchorFingerprint {
  return {
    tagName: anchor.tagName.toLowerCase(),

    text: normalizeText(
      anchor.innerText || anchor.textContent || '',
    ),

    // 新增结构定位依据。
    selector: createCssSelector(anchor),
  }
}

/**
 * 根据保存的 fingerprint，
 * 尝试在刷新后的网页中重新找到 anchor。
 *
 * 当前恢复策略：
 *
 * ① selector + 文本验证
 * ↓ 失败
 * ② tagName + 完整文本匹配
 */
export function findAnchorFromFingerprint(
  fingerprint: AnchorFingerprint,
): HTMLElement | null {
  /**
   * ------------------------------------------------
   * 第一阶段：结构定位
   * ------------------------------------------------
   *
   * 新版本笔记拥有 selector 时，
   * 优先尝试直接找到原来的 DOM 位置。
   */
  if (fingerprint.selector) {
    const selectorMatch =
      document.querySelector<HTMLElement>(
        fingerprint.selector,
      )

    if (selectorMatch) {
      const tagName =
        selectorMatch.tagName.toLowerCase()

      const text = normalizeText(
        selectorMatch.innerText ||
          selectorMatch.textContent ||
          '',
      )

      /**
       * 不能只因为 selector 找到了元素就直接认定成功。
       *
       * 因为网页更新以后，
       * 原来的 DOM 位置可能已经变成了另一段内容。
       *
       * 所以再用 tagName 和文本进行一次验证。
       */
      if (
        tagName === fingerprint.tagName &&
        text === fingerprint.text
      ) {
        return selectorMatch
      }
    }
  }

  /**
   * ------------------------------------------------
   * 第二阶段：文本回退
   * ------------------------------------------------
   *
   * selector 不存在或者已经失效时，
   * 继续使用上一版的文本恢复算法。
   *
   * 因此旧版本已经保存的笔记仍然可以恢复。
   */
  const candidates =
    document.querySelectorAll<HTMLElement>(
      ANCHOR_SELECTOR,
    )

  for (const candidate of candidates) {
    const tagName =
      candidate.tagName.toLowerCase()

    const text = normalizeText(
      candidate.innerText ||
        candidate.textContent ||
        '',
    )

    if (
      tagName === fingerprint.tagName &&
      text === fingerprint.text
    ) {
      return candidate
    }
  }

  /**
   * 两种策略全部失败，
   * 当前版本就认为 anchor 无法恢复。
   */
  return null
}