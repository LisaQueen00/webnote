// src/storage/noteStorage.ts

import type { StoredNote } from '../types/note'

/**
 * 为当前网页生成 storage key。
 *
 * Chrome storage 本质上是一个 key-value 存储，
 * 所以我们把同一个网页的所有笔记放在一个数组里。
 *
 * 例如：
 *
 * webnote:https://example.com/
 */
function getStorageKey(url: string): string {
  return `webnote:${url}`
}

/**
 * 读取某个网页保存的全部笔记。
 */
export async function getNotesForPage(
  url: string,
): Promise<StoredNote[]> {
  const key = getStorageKey(url)

  const result = await chrome.storage.local.get(key)

  return (result[key] as StoredNote[] | undefined) ?? []
}

/**
 * 保存或更新一条笔记。
 *
 * 如果 ID 已经存在：
 * → 更新
 *
 * 如果不存在：
 * → 新增
 */
export async function saveNote(
  note: StoredNote,
): Promise<void> {
  const key = getStorageKey(note.url)

  const notes = await getNotesForPage(note.url)

  const existingIndex = notes.findIndex(
    (item) => item.id === note.id,
  )

  if (existingIndex >= 0) {
    // 已存在同 ID 笔记，更新原记录。
    notes[existingIndex] = note
  } else {
    // 新笔记加入数组。
    notes.push(note)
  }

  await chrome.storage.local.set({
    [key]: notes,
  })
}

/**
 * 删除指定笔记。
 */
export async function deleteNote(
  url: string,
  noteId: string,
): Promise<void> {
  const key = getStorageKey(url)

  const notes = await getNotesForPage(url)

  const remainingNotes = notes.filter(
    (note) => note.id !== noteId,
  )

  await chrome.storage.local.set({
    [key]: remainingNotes,
  })
}

/**
 * 删除某一个完整 URL 对应的全部笔记。
 *
 * 例如：
 * https://react.dev/learn
 *
 * 只会删除这一页，不影响同网站其他页面。
 */
export async function deleteNotesForPage(
  url: string,
): Promise<void> {
  const storageKey = getStorageKey(url)

  await chrome.storage.local.remove(storageKey)
}

/**
 * 删除某个 origin 下保存的所有 WebNote 页面笔记。
 *
 * 例如：
 * origin = https://react.dev
 *
 * 会删除：
 * https://react.dev/learn
 * https://react.dev/reference/react
 * ...
 *
 * 但不会删除其他网站。
 */
export async function deleteNotesForOrigin(
  origin: string,
): Promise<number> {
  /**
   * 读取 storage.local 中所有数据。
   *
   * 当前 WebNote 的持久笔记 key 格式为：
   *
   * webnote:<完整URL>
   */
  const allItems =
    await chrome.storage.local.get(null)

  const keysToDelete: string[] = []

  for (const key of Object.keys(allItems)) {
    if (!key.startsWith('webnote:')) {
      continue
    }

    /**
     * 去掉 "webnote:" 前缀，
     * 得到原始页面 URL。
     */
    const pageUrl =
      key.slice('webnote:'.length)

    try {
      const parsedUrl = new URL(pageUrl)

      if (parsedUrl.origin === origin) {
        keysToDelete.push(key)
      }
    } catch {
      /**
       * 如果未来 storage 中出现其他结构，
       * 无法解析为 URL 的 key 不做处理。
       */
      continue
    }
  }

  if (keysToDelete.length > 0) {
    await chrome.storage.local.remove(
      keysToDelete,
    )
  }

  /**
   * 返回实际删除了多少个“页面记录”。
   *
   * 后面如果做 UI 提示时可以直接使用。
   */
  return keysToDelete.length
}