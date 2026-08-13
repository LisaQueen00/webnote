// src/background.ts

import type { PreviewPayload } from './types/preview'

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
})

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
 * 保存临时预览数据并打开 WebNote Preview 页面。
 */
async function openPreview(
  payload: PreviewPayload,
): Promise<void> {
  /**
   * session storage 默认只对扩展页和
   * service worker 等 trusted context 开放。
   *
   * content script 不需要直接访问它。
   */
  await chrome.storage.session.set({
    webnotePreview: payload,
  })

  /**
   * 打开扩展自身的 preview.html。
   *
   * Chrome Tabs API 可以直接创建一个新的扩展页面标签页，
   * 不需要额外申请 tabs 权限来完成单纯的 tab 创建。
   */
  await chrome.tabs.create({
    url: chrome.runtime.getURL('preview.html'),
  })
}