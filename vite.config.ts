import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { contentBrowserPlugin } from './vite-plugin-content'

export default defineConfig({
  plugins: [react(), tailwindcss(), contentBrowserPlugin()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    exclude: ['scripts/**', 'node_modules/**'],
    environmentMatchGlobs: [
      ['**/*.test.tsx', 'jsdom'],
    ],
  },
})
