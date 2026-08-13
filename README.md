# WebNote

WebNote 是一个面向网页阅读场景的 Chrome 浏览器扩展。

它允许你在阅读网页时，直接基于页面中的原文内容创建笔记，并将笔记与对应的原文锚点关联保存。阅读完成后，可以按照原文在页面中的顺序，将相关原文与笔记合并为 Markdown，方便复制到 Obsidian 等笔记工具，或直接导出为 `.md` 文件。

## ✨ 核心功能

### 网页原位笔记

点击浏览器工具栏中的 WebNote 图标即可开启或关闭笔记模式。

开启后：

- 鼠标悬停网页内容时自动识别可作为笔记锚点的元素
- 使用高亮边框提示当前选中的原文
- 点击原文即可在对应位置插入笔记编辑框
- 每个笔记与对应的原文锚点建立唯一关联

关闭后，网页恢复正常交互，不影响链接、按钮等原有功能。

---

### 笔记持久化

WebNote 使用 `chrome.storage.local` 保存笔记。

每条笔记包含：

- 唯一 ID
- 页面 URL
- 原文 Anchor Fingerprint
- 用户笔记内容

重新打开或刷新页面后，WebNote 会尝试重新定位原文锚点并恢复对应笔记。

当前已支持：

- 普通页面刷新恢复
- 动态加载页面恢复
- SPA 页面路由切换后的笔记恢复

---

### Anchor 定位

WebNote 会优先选择具有明确语义的 HTML 元素，例如：

- `p`
- `h1` ~ `h6`
- `li`
- `pre`
- `blockquote`

同时也会针对部分 `div` / `span` 内容进行可读性判断。

为了在页面重新加载后重新找到原文，WebNote 会保存 Anchor Fingerprint，包括：

- 标签名
- 文本内容
- CSS Selector

恢复时优先通过 Selector 定位，并验证原文内容；定位失败时会尝试文本匹配。

---

### Shadow DOM 笔记组件

WebNote 的笔记编辑器使用 Shadow DOM。

这样可以尽量避免宿主网页的 CSS 样式污染笔记组件，例如：

- 字体覆盖
- transform
- input / textarea 样式覆盖
- button 样式冲突

笔记 UI 与网页本身保持相对独立。

---

## 📝 Markdown 导出

右键浏览器工具栏中的 WebNote 图标，选择：

> 预览当前页笔记

WebNote 会将当前页面中的有效笔记按照原文在 DOM 中的实际顺序合并。

例如：

```md
> Original paragraph with **important content**.

My note about this paragraph.

> Another original section.
>
> - item one
> - item two

Another note.
```

导出规则：

- 原文转换为 Markdown
- 原文统一使用 Markdown Blockquote
- 用户笔记作为普通 Markdown 正文
- 按网页原文顺序排序，而不是笔记创建时间
- 空笔记不会参与导出
- 不自动添加多余的“原文 / 笔记”标题
- 不强制插入分割线

---

## 👀 Preview

每次生成预览时，WebNote 会创建一个独立的 `previewId`。

因此多个页面的预览可以同时存在，互不覆盖。

Preview 页面提供两个操作：

- **复制到剪贴板**
- **导出为文件**

导出的文件格式为：

```text
网页标题.md
```

文件名中的 Windows 非法字符会自动处理。

Preview 临时数据保存在 `chrome.storage.session` 中，并带有过期时间。

过期的 Preview 数据会在以下时机自动清理：

- 扩展启动
- 创建新的 Preview
- 打开 Preview 页面

---

## 🧹 笔记清理

右键 WebNote 扩展图标可以执行：

### 清理当前页面笔记

只删除当前完整 URL 保存的 WebNote 笔记。

例如：

```text
https://example.com/page-a
```

不会影响：

```text
https://example.com/page-b
```

### 清理当前网站笔记

删除当前 `origin` 下所有页面保存的 WebNote 笔记。

例如：

```text
https://react.dev/learn
https://react.dev/reference/react
https://react.dev/reference/react/useEffect
```

可以一次性清理。

其他网站的数据不会受到影响。

---

## 🛠 技术栈

- Chrome Extension Manifest V3
- TypeScript
- Vite
- pnpm
- Native DOM API
- Shadow DOM
- Chrome Storage API
- Turndown
- Marked
- DOMPurify

当前版本暂未引入 React。

---

## 📁 项目结构

```text
webnote/
├─ public/
│  └─ manifest.json
│
├─ src/
│  ├─ anchor/
│  │  └─ findAnchor.ts
│  │
│  ├─ export/
│  │  ├─ markdown.ts
│  │  └─ exportPageNotes.ts
│  │
│  ├─ highlight/
│  │  └─ highlight.ts
│  │
│  ├─ note/
│  │  └─ createNote.ts
│  │
│  ├─ preview/
│  │  ├─ preview.ts
│  │  └─ preview.css
│  │
│  ├─ storage/
│  │  └─ noteStorage.ts
│  │
│  ├─ types/
│  │  ├─ note.ts
│  │  └─ preview.ts
│  │
│  ├─ background.ts
│  └─ content.ts
│
├─ preview.html
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
└─ README.md
```

---

## 🚀 本地开发

安装依赖：

```bash
pnpm install
```

构建扩展：

```bash
pnpm build
```

构建结果会生成在：

```text
dist/
```

然后打开 Chrome：

```text
chrome://extensions
```

开启：

> 开发者模式

点击：

> 加载已解压的扩展程序

选择项目中的：

```text
dist/
```

即可加载 WebNote。

每次重新构建后，需要在 `chrome://extensions` 中重新加载扩展。

如果修改了 Content Script，建议同时刷新正在测试的网页。

---

## 🎮 使用方式

### 创建笔记

1. 打开任意支持的网页
2. 点击 WebNote 扩展图标
3. WebNote 进入 ON 状态
4. 鼠标移动到需要记录的原文
5. 点击原文
6. 在出现的 WebNote 编辑框中输入笔记

再次点击扩展图标即可关闭笔记模式。

---

### 预览与导出

右键 WebNote 扩展图标：

```text
预览当前页笔记
```

随后会打开独立 Preview 页面。

可以：

```text
复制到剪贴板
```

或：

```text
导出为文件
```

---

### 清理笔记

右键扩展图标：

```text
清理当前页面笔记
```

或：

```text
清理当前网站笔记
```

删除操作需要确认。

---

## ⚠️ 当前版本说明

WebNote 当前仍处于早期 MVP 阶段。

目前已能够完成完整的核心工作流：

```text
网页阅读
    ↓
选择原文 Anchor
    ↓
创建笔记
    ↓
持久化保存
    ↓
页面重新加载 / SPA 切换恢复
    ↓
按原文顺序合并
    ↓
Markdown Preview
    ↓
复制 / 导出
    ↓
按页面或网站清理数据
```

但仍可能存在一些边界情况，例如：

- 页面结构发生大幅修改后 Anchor 可能无法恢复
- 特殊网页布局可能影响 Anchor 选择
- iframe / Shadow DOM 内部网页内容暂未专门处理
- 部分高度动态的网站可能仍需要进一步优化恢复策略
- 暂无统一的笔记 Library / 管理页面
- 暂无批量查看所有已保存网站笔记的界面

---

## 🗺 Future Ideas

后续可能探索：

- 更稳定的 Anchor Fingerprint
- WebNote Library
- 按网站 / 页面管理历史笔记
- 笔记搜索
- 更完善的 Markdown 导出策略
- 自定义导出模板
- 页面标题 / 元数据导出
- SPA 生命周期进一步优化
- 更丰富的笔记编辑能力
- 快捷键
- UI / UX 优化

这些功能目前不属于 MVP 的必要组成部分。

---

## 📌 Project Status

当前版本：

> MVP

当前核心流程已经可以实际用于网页阅读与 Markdown 笔记整理。

WebNote 的目标并不是完整保存整个网页，而是：

> **只保存你真正关注过、思考过、记录过的内容。**