import Phaser from 'phaser'
import { TUNING as T } from './combat/tuning.js'
import { validateCharacters } from './data/characters.js'
import { SelectScene } from './scenes/SelectScene.js'
import { BattleScene } from './scenes/BattleScene.js'
import { PauseScene } from './scenes/PauseScene.js'

// Clamp any stat typos in characters.js before anything reads them.
validateCharacters()

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
