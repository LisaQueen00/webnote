import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // 网页中运行的 Content Script。
        content: resolve(import.meta.dirname, 'src/content.ts'),

        // Chrome 扩展后台运行的 Service Worker。
        background: resolve(import.meta.dirname, 'src/background.ts'),
      },

      output: {
        /**
         * 保证构建结果直接生成：
         *
         * dist/content.js
         * dist/background.js
         *
         * 这样文件名才能和 manifest.json 对应。
         */
        entryFileNames: '[name].js',
      },
    },
  },
})