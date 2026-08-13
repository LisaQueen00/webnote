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