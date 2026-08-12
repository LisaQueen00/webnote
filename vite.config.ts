import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        content: resolve(import.meta.dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
})