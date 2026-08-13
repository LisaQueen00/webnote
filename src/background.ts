// src/background.ts

import type { PreviewPayload } from './types/preview'


chrome.runtime.onStartup.addListener(() => {
  void cleanupExpiredPreviews()
})


/**
 * Preview 临时缓存保留时间。
 *
 * 当前先设为 24 小时。
 * 用户即使误关 Preview，也还有机会重新打开后续生成的预览；
 * 同时旧缓存不会无限积累。
 */
const PREVIEW_TTL_MS =
  24 * 60 * 60 * 1000

/**
 * WebNote 右键菜单 ID。
 *
 * 使用固定 ID，后续在点击事件中可以准确识别。
 */
const PREVIEW_MENU_ID = 'webnote-preview-current-page'

/**
 * 扩展安装或更新时创建右键菜单。
 *
 * contexts: ['action']
 * 表示这个菜单只出现在 WebNote 工具栏图标的右键菜单里。
 */
chrome.runtime.onInstalled.addListener(async () => {
  /**
   * 开发阶段经常重新加载扩展，
   * 先清理旧菜单可以避免重复创建。
   */
  await chrome.contextMenus.removeAll()

  chrome.contextMenus.create({
    id: PREVIEW_MENU_ID,
    title: '预览当前页笔记',
    contexts: ['action'],
  })
  /**
   * 更新或重新安装扩展后，
   * 顺便清一次过期 Preview。
   */
  await cleanupExpiredPreviews()  
},)

/**
 * 左键点击 WebNote 图标：
 * 切换当前页面的 ON / OFF 状态。
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'WEBNOTE_TOGGLE',
    })
  } catch (error) {
    /**
     * chrome:// 等受限页面可能没有 WebNote content script。
     */
    console.log(
      'WebNote could not toggle on this page:',
      error,
    )
  }
})

/**
 * 右键菜单点击事件。
 */
chrome.contextMenus.onClicked.addListener(
  async (info, tab) => {
    // 只处理“预览当前页笔记”这一项。
    if (info.menuItemId !== PREVIEW_MENU_ID) return

    if (!tab?.id) return

    try {
      /**
       * 告诉当前网页里的 content script：
       *
       * “现在生成这一页的 Markdown。”
       *
       * Markdown 的生成必须在 content script 中完成，
       * 因为那里才能访问当前网页 DOM。
       */
      await chrome.tabs.sendMessage(tab.id, {
        type: 'WEBNOTE_PREVIEW_REQUEST',
      })
    } catch (error) {
      console.log(
        'WebNote could not preview this page:',
        error,
      )
    }
  },
)

/**
 * 接收 content script 生成好的预览数据。
 */
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'WEBNOTE_OPEN_PREVIEW') return

  const payload =
    message.payload as PreviewPayload

  /**
   * storage.session 很适合这里：
   *
   * 它只负责把本次预览数据临时从
   * background 传给 preview.html，
   * 不需要永久保存。
   */
  void openPreview(payload)
})

/**
 * 打开一个独立 Preview。
 *
 * 每次预览都生成自己的 previewId，
 * 因此多个预览页可以同时存在，不会互相覆盖。
 */
async function openPreview(
  payload: Omit<PreviewPayload, 'id' | 'createdAt' | 'expiresAt' >,
): Promise<void> {
  /**
   * 每次创建新 Preview 前，
   * 顺便清理一次已经过期的旧缓存。
   */
  await cleanupExpiredPreviews()

  const previewId =
    crypto.randomUUID()

  const createdAt = Date.now()

  const previewPayload:
    PreviewPayload = {
    ...payload,

    id: previewId,

    createdAt,

    /**
     * 过期时间由创建时间 + TTL 得出。
     */
    expiresAt:
      createdAt + PREVIEW_TTL_MS,
  }

  const storageKey =
    `webnotePreview:${previewId}`

  await chrome.storage.session.set({
    [storageKey]:
      previewPayload,
  })

  const previewUrl =
    chrome.runtime.getURL(
      `preview.html?id=${encodeURIComponent(
        previewId,
      )}`,
    )

  await chrome.tabs.create({
    url: previewUrl,
  })
}


/**
 * 清理 storage.session 中已经过期的 Preview 数据。
 *
 * WebNote Preview 的 key 都统一使用：
 *
 * webnotePreview:<previewId>
 *
 * 因此这里只检查这个前缀，
 * 不影响 storage.session 中未来可能出现的其他数据。
 */
async function cleanupExpiredPreviews():
  Promise<void> {
  const allItems =
    await chrome.storage.session.get(null)

  const now = Date.now()

  const expiredKeys: string[] = []

  for (
    const [key, value]
    of Object.entries(allItems)
  ) {
    /**
     * 只处理 WebNote Preview 数据。
     */
    if (
      !key.startsWith(
        'webnotePreview:',
      )
    ) {
      continue
    }

    const preview =
      value as
        | PreviewPayload
        | undefined

    /**
     * 如果数据结构异常，
     * 暂时不贸然删除。
     *
     * 只删除明确已经过期的数据。
     */
    if (
      !preview ||
      typeof preview.expiresAt !== 'number'
    ) {
      continue
    }

    if (preview.expiresAt <= now) {
      expiredKeys.push(key)
    }
  }

  /**
   * Chrome Storage 支持一次删除多个 key。
   */
  if (expiredKeys.length > 0) {
    await chrome.storage.session.remove(
      expiredKeys,
    )
  }
}