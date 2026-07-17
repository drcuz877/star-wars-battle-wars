import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { applyCrispCamera } from '../util/display.js'
import { playMusic, playSfx } from '../audio/audio.js'

const GOLD = '#ffe81f'

// Tournament format picker (Phase 7): sits between the mode menu's
// TOURNAMENT button and character select. Same button language as
// ModeScene so the flow reads as one menu system.
export class FormatScene extends Phaser.Scene {
  constructor() {
    super('Format')
  }

  create() {
    applyCrispCamera(this)
    playMusic('menu')
    this.input.on('pointerdown', () => playSfx('uiClick'))
    const W = T.arena.width
    const H = T.arena.height

    const sky = this.add.graphics()
    sky.fillGradientStyle(0x03030a, 0x03030a, 0x191a33, 0x141428, 1)
    sky.fillRect(0, 0, W, H)
    for (let i = 0; i < 90; i++) {
      this.add.circle(Math.random() * W, Math.random() * H, Math.random() * 1.4 + 0.4, 0xffffff, 0.2 + Math.random() * 0.6)
    }

    this.add
      .text(W / 2, 96, 'CHOOSE YOUR TOURNAMENT', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: GOLD,
        align: 'center',
        stroke: '#000000',
        strokeThickness: 6,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 10, fill: true },
      })
      .setOrigin(0.5)

    this.buttons = [] // {id, x, y} — also used by the automated verify script

    let y = 218
    this.makeButton('knockout', W / 2, y, 'KNOCKOUT', 'Random 16-fighter bracket. Lose once and you\'re out.')
    y += 88
    this.makeButton('group', W / 2, y, 'GROUP PLAY', '7 groups of 4, round-robin. Survive your group, then the bracket.')
    y += 88
    this.makeButton('league', W / 2, y, 'LEAGUE', 'Two divisions of 14, a full 13-match season. Top 8 reach the bracket.')

    this.makeBackLink()

    this.add.text(16, H - 20, `build ${__BUILD_TIME__}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#555577',
    })
  }

  makeButton(id, x, y, label, blurb) {
    this.buttons.push({ id, x, y })
    const w = 480
    const h = 70
    const box = this.add
      .rectangle(x, y, w, h, 0x101a2e, 0.85)
      .setStrokeStyle(2, 0xffe81f, 0.5)
      .setInteractive({ useHandCursor: true })
    const text = this.add
      .text(x, y - 12, label, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
    this.add
      .text(x, y + 16, blurb, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#8a8ab0',
      })
      .setOrigin(0.5)

    box.on('pointerover', () => {
      box.setFillStyle(0x1b2b4a, 0.9)
      text.setColor(GOLD)
    })
    box.on('pointerout', () => {
      box.setFillStyle(0x101a2e, 0.85)
      text.setColor('#ffffff')
    })
    box.on('pointerdown', () => this.scene.start('Select', { mode: 'tournament', format: id }))
  }

  makeBackLink() {
    const text = this.add
      .text(16, 20, '‹ MAIN MENU', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#8a8ab0',
      })
      .setInteractive({ useHandCursor: true })
    text.on('pointerover', () => text.setColor(GOLD))
    text.on('pointerout', () => text.setColor('#8a8ab0'))
    text.on('pointerdown', () => this.scene.start('Mode'))
  }
}
