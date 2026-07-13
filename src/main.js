import Phaser from 'phaser'
import { TUNING as T } from './combat/tuning.js'
import { BattleScene } from './scenes/BattleScene.js'

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
  scene: [BattleScene],
})

// Handle for debugging and automated verification scripts.
window.game = game
