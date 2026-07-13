import Phaser from 'phaser'

class PlaceholderScene extends Phaser.Scene {
  constructor() {
    super('Placeholder')
  }

  create() {
    const { width, height } = this.scale

    this.add
      .text(width / 2, height / 2 - 20, 'STAR WARS BATTLE WARS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        color: '#ffe81f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height / 2 + 20, 'Phase 0 — pipeline online', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  scene: [PlaceholderScene],
})
