import Phaser from 'phaser'
import { registerSW } from 'virtual:pwa-register'
import { TUNING as T } from './combat/tuning.js'
import { validateCharacters } from './data/characters.js'
import { applyHolocronOverrides } from './holocron/overrides.js'
import { RENDER_SCALE } from './util/display.js'
import { CrawlScene } from './scenes/CrawlScene.js'
import { ModeScene } from './scenes/ModeScene.js'
import { SelectScene } from './scenes/SelectScene.js'
import { DifficultyScene } from './scenes/DifficultyScene.js'
import { BracketScene } from './scenes/BracketScene.js'
import { BattleScene } from './scenes/BattleScene.js'
import { PauseScene } from './scenes/PauseScene.js'
import { SettingsScene } from './scenes/SettingsScene.js'
import { HolocronScene } from './scenes/HolocronScene.js'
import { CodexScene } from './scenes/CodexScene.js'

// Clamp any stat typos in characters.js before anything reads them.
validateCharacters()
// Then layer in any of the son's saved Holocron edits (device-only).
applyHolocronOverrides()

// Crisp text on big/high-DPI screens. Phaser draws each Text object to an
// internal texture at resolution 1 by default, which looks blurry once the
// canvas is stretched to a large display. Default every Text object to
// RENDER_SCALE (see util/display.js). Explicit style.resolution still wins.
const setStyle = Phaser.GameObjects.TextStyle.prototype.setStyle
Phaser.GameObjects.TextStyle.prototype.setStyle = function (style, updateText, setDefaults) {
  const out = setStyle.call(this, style, updateText, setDefaults)
  if (this.resolution === 0) this.resolution = RENDER_SCALE
  return out
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#000000',
  physics: { default: 'arcade' },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Backing store at RENDER_SCALE× logical size; each scene zooms its
    // camera to match (util/display.js applyCrispCamera), so all code
    // keeps thinking in 960×540 while shapes rasterize at device res.
    width: T.arena.width * RENDER_SCALE,
    height: T.arena.height * RENDER_SCALE,
  },
  scene: [
    CrawlScene,
    ModeScene,
    SelectScene,
    DifficultyScene,
    BracketScene,
    BattleScene,
    PauseScene,
    SettingsScene,
    HolocronScene,
    CodexScene,
  ],
})

// Handle for debugging and automated verification scripts.
window.game = game

// Mobile browser toolbars (Safari AND Chrome) lie to CSS about the usable
// height — vh units and even fixed-position sizing track the layout
// viewport, which can be taller than what's actually on screen while a
// toolbar is showing, so the canvas got cut off top/bottom. visualViewport
// is the browser's honest report of the visible area: size #app from it
// directly and re-run Phaser's FIT scaling whenever it changes (toolbar
// show/hide, rotation).
const fitToVisibleViewport = () => {
  const app = document.getElementById('app')
  const vv = window.visualViewport
  app.style.width = `${vv ? vv.width : window.innerWidth}px`
  app.style.height = `${vv ? vv.height : window.innerHeight}px`
  game.scale.refresh()
}
window.visualViewport?.addEventListener('resize', fitToVisibleViewport)
window.addEventListener('resize', fitToVisibleViewport)
window.addEventListener('orientationchange', () => setTimeout(fitToVisibleViewport, 250))
fitToVisibleViewport()

// Home-screen installs used to need a manual redownload to see updates
// (checkpoint requirement: unacceptable). registerType: 'prompt' in
// vite.config.js means a new deploy is downloaded in the background but
// NOT auto-activated — reloading mid-battle would be jarring — so this
// just surfaces a tap-to-update toast whenever one's ready, independent
// of whatever scene happens to be showing.
const updateSW = registerSW({
  onNeedRefresh() {
    const toast = document.createElement('div')
    toast.textContent = '⬆ New version available — tap to update'
    Object.assign(toast.style, {
      position: 'fixed',
      left: '50%',
      bottom: '20px',
      transform: 'translateX(-50%)',
      background: '#0c1424',
      color: '#ffe81f',
      border: '2px solid #ffe81f',
      borderRadius: '8px',
      padding: '10px 18px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      zIndex: 9999,
      boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
    })
    toast.addEventListener('click', () => {
      toast.remove()
      updateSW(true)
    })
    document.body.appendChild(toast)
  },
})
