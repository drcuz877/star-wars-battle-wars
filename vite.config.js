import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/star-wars-battle-wars/',
  define: {
    // Stamped into the app at build time; shown in-game so any device can
    // confirm which deploy it's running.
    __BUILD_TIME__: JSON.stringify(
      new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    ),
  },
  plugins: [
    VitePWA({
      // 'prompt', not 'autoUpdate' — a silently-reloading app mid-battle
      // would be jarring. main.js listens for onNeedRefresh and shows an
      // in-game toast; the reload only happens if the player taps it.
      registerType: 'prompt',
      injectRegister: 'auto',
      workbox: {
        // Default globPatterns miss audio — precache everything needed to
        // play a full match offline (checkpoint: "plays in airplane mode").
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,ico,ogg,mp3}'],
      },
      manifest: {
        name: 'Star Wars Battle Wars',
        short_name: 'Battle Wars',
        description: '1v1 real-time Star Wars fighting game — 28 characters, tournaments, and a secret stat editor.',
        start_url: '/star-wars-battle-wars/',
        scope: '/star-wars-battle-wars/',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
