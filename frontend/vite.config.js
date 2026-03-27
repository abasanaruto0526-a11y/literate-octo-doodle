import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: '音でつながるライフノート',
        short_name: 'ライフノート',
        description: '音声入力で日常を記録。感情分析・タグ付け・自然情報と共に進化するノートアプリ。',
        start_url: '/',
        id: '/',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true, // これを追加することで開発中（npm run dev）でもPWAとして認識・インストールできるようになる！
        type: 'module',
      },
      injectRegister: 'auto' // 自動でService Workerを登録
    })
  ],
})
