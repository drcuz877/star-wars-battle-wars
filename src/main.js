import Phaser from 'phaser'
import { TUNING as T } from './combat/tuning.js'
import { validateCharacters } from './data/characters.js'
import { SelectScene } from './scenes/SelectScene.js'
import { BattleScene } from './scenes/BattleScene.js'
import { PauseScene } from './scenes/PauseScene.js'

// Clamp any stat typos in characters.js before anything reads them.
validateCharacters()

// Crisp text on big/high-DPI screens (Phase 2 checkpoint feedback: menus
// looked blurry). Phaser draws each Text object to an internal texture at
// resolution 1 by default, and FIT-mode upscaling of the 960px-wide canvas
// to a large display blurs it. Default every Text object to the actual
// upscale factor (window size × device pixel ratio vs game size), capped
// at 3 (each step costs texture memory). Explicit style.resolution still wins.
const upscale = (window.innerWidth * (window.devicePixelRatio || 1)) / T.arena.width
const TEXT_DPR = Math.min(Math.max(1, Math.ceil(upscale)), 3)
const setStyle = Phaser.GameObjects.TextStyle.prototype.setStyle
Phaser.GameObjects.TextStyle.prototype.setStyle = function (style, updateText, setDefaults) {
  const out = setStyle.call(this, style, updateText, setDefaults)
  if (this.resolution === 0) this.resolution = TEXT_DPR
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
    width: T.arena.width,
    height: T.arena.height,
  },
  scene: [SelectScene, BattleScene, PauseScene],
})

// Handle for debugging and automated verification scripts.
window.game = game
