import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
         /**
         * Content Script。
         */
        content: resolve(
          import.meta.dirname,
          'src/content.ts',
        ),

        /**
         * Manifest V3 Service Worker。
         */
        background: resolve(
          import.meta.dirname,
          'src/background.ts',
        ),

        /**
         * WebNote 独立 Markdown 预览页面。
         *
         * Vite 支持将多个 HTML 页面作为构建入口。
         */
        preview: resolve(
          import.meta.dirname,
          'preview.html',
        ),
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