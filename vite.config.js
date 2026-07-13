import { defineConfig } from 'vite'

export default defineConfig({
  base: '/star-wars-battle-wars/',
  define: {
    // Stamped into the app at build time; shown in-game so any device can
    // confirm which deploy it's running.
    __BUILD_TIME__: JSON.stringify(
      new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    ),
  },
})
