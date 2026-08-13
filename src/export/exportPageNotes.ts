// src/export/exportPageNotes.ts

import {
  findAnchorFromFingerprint,
} from '../anchor/findAnchor'

import {
  getNotesForPage,
} from '../storage/noteStorage'

import type {
  StoredNote,
} from '../types/note'

import {
  anchorToMarkdown,
  createNoteMarkdownBlock,
} from './markdown'

/**
 * 一条已经成功重新绑定到当前 DOM 的笔记。
 *
 * note：
 * chrome.storage 中保存的数据
 *
 * anchor：
 * 当前页面中实际对应的 DOM 元素
 */
interface ResolvedNote {
  note: StoredNote
  anchor: HTMLElement
}

/**
 * 比较两个 DOM 元素在当前网页中的先后位置。
 *
 * Array.sort() 需要：
 *
 * < 0 → a 在前
 * > 0 → b 在前
 * = 0 → 无法判断 / 相同位置
 */
function compareDomOrder(
  a: HTMLElement,
  b: HTMLElement,
): number {
  const position =
    a.compareDocumentPosition(b)

  /**
   * FOLLOWING 表示 b 位于 a 后面。
   *
   * 因此：
   * a 应该排在 b 前。
   */
  if (
    position &
    Node.DOCUMENT_POSITION_FOLLOWING
  ) {
    return -1
  }

  /**
   * PRECEDING 表示 b 位于 a 前面。
   *
   * 因此：
   * a 应该排在 b 后。
   */
  if (
    position &
    Node.DOCUMENT_POSITION_PRECEDING
  ) {
    return 1
  }

  return 0
}

/**
 * 将当前页面所有可导出的 WebNote 笔记
 * 合成为一份 Markdown。
 *
 * 当前规则：
 *
 * 1. 只导出非空笔记
 * 2. 必须能够找到对应 anchor
 * 3. 按 anchor 在原网页中的 DOM 顺序排列
 * 4. 原文转换成 Markdown quote
 * 5. 用户笔记作为普通 Markdown 正文
 */
export async function exportCurrentPageMarkdown():
  Promise<string> {
  /**
   * 读取当前 URL 保存的全部笔记。
   */
  const storedNotes =
    await getNotesForPage(location.href)

  /**
   * 空笔记直接过滤。
   *
   * 用户可能只是误点创建了一条 Note，
   * 但没有实际输入内容。
   */
  const nonEmptyNotes =
    storedNotes.filter(
      (note) =>
        note.content.trim() !== '',
    )

  /**
   * 用于保存已经成功恢复 anchor 的笔记。
   */
  const resolvedNotes: ResolvedNote[] = []

  for (const note of nonEmptyNotes) {
    /**
     * 根据 fingerprint，
     * 在当前网页 DOM 中重新找到对应原文。
     */
    const anchor =
      findAnchorFromFingerprint(
        note.anchor,
      )

    /**
     * 如果网页已经变化，
     * 当前版本暂时跳过无法恢复的 anchor。
     */
    if (!anchor) {
      console.warn(
        'WebNote could not export anchor:',
        note,
      )

      continue
    }

    resolvedNotes.push({
      note,
      anchor,
    })
  }

  /**
   * 非常关键：
   *
   * 不按照笔记创建时间排序，
   * 而按照它们在原网页中的实际位置排序。
   */
  resolvedNotes.sort(
    (a, b) =>
      compareDomOrder(
        a.anchor,
        b.anchor,
      ),
  )

  /**
   * 将每一个：
   *
   * anchor + note
   *
   * 转换成：
   *
   * > 原文
   *
   * 用户笔记
   */
  const blocks =
    resolvedNotes
      .map(({ note, anchor }) => {
        const sourceMarkdown =
          anchorToMarkdown(anchor)

        return createNoteMarkdownBlock(
          sourceMarkdown,
          note.content,
        )
      })
      /**
       * 防御性过滤。
       *
       * 理论上前面已经过滤过空笔记，
       * 这里再防一层空字符串。
       */
      .filter(
        (block) =>
          block.trim().length > 0,
      )

  /**
   * 不同笔记块之间留两个换行。
   *
   * 不额外添加 ---
   * 保持最终 Markdown 简洁。
   */
  return blocks.join('\n\n')
}