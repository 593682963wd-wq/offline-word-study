import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  server:{host:'127.0.0.1',port:Number(process.env.PORT ?? 5173)},
  preview:{host:'127.0.0.1',port:Number(process.env.PORT ?? 4173)},
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: '词语练习 · 离线单词练习',
        short_name: '词语练习',
        description: '国际航班英文沟通词汇学习：发音、助记、拼写、听写、错词本、艾宾浩斯复习',
        theme_color: '#04070f',
        background_color: '#04070f',
        display: 'standalone',
        start_url: './',
        lang: 'zh-CN',
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,svg,png,ico,woff2,jpg,mp3}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
