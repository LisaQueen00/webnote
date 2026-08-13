/**
 * WebNote 后台 Service Worker。
 *
 * 它不直接操作网页 DOM。
 * 当前职责只有一个：
 *
 * 用户点击浏览器工具栏上的 WebNote 图标时，
 * 通知当前标签页里的 content script 切换 ON / OFF 状态。
 */

chrome.action.onClicked.addListener(async (tab) => {
  // 某些 Chrome 内部页面可能没有正常的 tab.id，
  // 没有的话就无法给对应页面发送消息。
  if (!tab.id) return

  try {
    /**
     * 给当前标签页中的 content script 发送消息。
     *
     * content.ts 会监听这个消息，
     * 收到后切换自己的 isActive 状态。
     */
    await chrome.tabs.sendMessage(tab.id, {
      type: 'WEBNOTE_TOGGLE',
    })
  } catch (error) {
    /**
     * 如果当前页面没有加载 WebNote 的 content script，
     * 例如 chrome://extensions 这种受限页面，
     * sendMessage 可能会失败。
     *
     * 现在先简单打印日志即可。
     */
    console.log('WebNote could not toggle on this page:', error)
  }
})