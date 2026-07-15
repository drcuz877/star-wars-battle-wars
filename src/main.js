import Phaser from 'phaser'
import { TUNING as T } from './combat/tuning.js'
import { validateCharacters } from './data/characters.js'
import { RENDER_SCALE } from './util/display.js'
import { CrawlScene } from './scenes/CrawlScene.js'
import { SelectScene } from './scenes/SelectScene.js'
import { DifficultyScene } from './scenes/DifficultyScene.js'
import { BattleScene } from './scenes/BattleScene.js'
import { PauseScene } from './scenes/PauseScene.js'

// Clamp any stat typos in characters.js before anything reads them.
validateCharacters()

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
  scene: [CrawlScene, SelectScene, DifficultyScene, BattleScene, PauseScene],
})

// Handle for debugging and automated verification scripts.
window.game = game
