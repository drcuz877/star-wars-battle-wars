import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { CHARACTERS, overall } from '../data/characters.js'

const ARCHETYPE_ICON = { saber: '🗡', blaster: '🔫', brawler: '🐻' }

// Pick your fighter, then your opponent, from the full 28-character grid.
// Placeholder cards (color swatch + name + rating) until the Phase 4 art
// pass adds portraits.
export class SelectScene extends Phaser.Scene {
  constructor() {
    super('Select')
  }

  create() {
    this.add.rectangle(T.arena.width / 2, T.arena.height / 2, T.arena.width, T.arena.height, 0x0a0a14)

    this.picking = 'p1'
    this.p1 = null

    this.title = this.add
      .text(T.arena.width / 2, 34, 'CHOOSE YOUR FIGHTER', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffe81f',
      })
      .setOrigin(0.5)

    // 7 × 4 grid, light side first, dark side after — matching the spec table.
    const cols = 7
    const cardW = 126
    const cardH = 96
    const startX = (T.arena.width - cols * cardW) / 2 + cardW / 2
    const startY = 116

    this.cards = [] // {id, x, y} — also used by the automated verify script
    CHARACTERS.forEach((c, i) => {
      const x = startX + (i % cols) * cardW
      const y = startY + Math.floor(i / cols) * cardH
      this.makeCard(c, x, y)
      this.cards.push({ id: c.id, x, y })
    })

    this.makeRandomButton()
    this.add.text(24, T.arena.height - 24, `build ${__BUILD_TIME__}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#555577',
    })
  }

  makeCard(c, x, y) {
    const sideColor = c.side === 'light' ? 0x4da6ff : 0xff5555
    const card = this.add
      .rectangle(x, y, 118, 88, 0x1c1c2e)
      .setStrokeStyle(2, sideColor, 0.7)
      .setInteractive({ useHandCursor: true })

    this.add.rectangle(x, y - 27, 30, 22, c.color)
    this.add
      .text(x, y + 4, c.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 112 },
      })
      .setOrigin(0.5)
    this.add
      .text(x, y + 32, `${overall(c)}  ${ARCHETYPE_ICON[c.archetype]}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#8a8ab0',
      })
      .setOrigin(0.5)

    card.on('pointerover', () => card.setFillStyle(0x2e2e4a))
    card.on('pointerout', () => card.setFillStyle(0x1c1c2e))
    card.on('pointerdown', () => this.pick(c, card))
  }

  makeRandomButton() {
    const btn = this.add
      .text(T.arena.width / 2, T.arena.height - 26, '🎲 RANDOM', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    btn.on('pointerover', () => btn.setColor('#ffe81f'))
    btn.on('pointerout', () => btn.setColor('#ffffff'))
    btn.on('pointerdown', () => {
      const pool = CHARACTERS.filter((c) => c !== this.p1)
      this.pick(pool[Math.floor(Math.random() * pool.length)], null)
    })
  }

  pick(c, card) {
    if (this.picking === 'p1') {
      this.p1 = c
      this.picking = 'p2'
      this.title.setText(`${c.name.toUpperCase()} — CHOOSE YOUR OPPONENT`)
      if (card) card.setStrokeStyle(3, 0xffe81f, 1)
    } else {
      this.scene.start('Battle', { p1: this.p1.id, p2: c.id })
    }
  }
}
