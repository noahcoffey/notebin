import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@milkdown/plugin-clipboard'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          milkdown: [
            '@milkdown/components',
            '@milkdown/core',
            '@milkdown/ctx',
            '@milkdown/plugin-clipboard',
            '@milkdown/plugin-history',
            '@milkdown/plugin-listener',
            '@milkdown/preset-commonmark',
            '@milkdown/preset-gfm',
            '@milkdown/react',
            '@milkdown/theme-nord',
            '@milkdown/utils',
          ],
          codemirror: [
            '@codemirror/autocomplete',
            '@codemirror/commands',
            '@codemirror/lang-markdown',
            '@codemirror/language-data',
            '@codemirror/search',
            '@codemirror/state',
            '@codemirror/view',
            'codemirror',
          ],
        },
      },
    },
  },
})
