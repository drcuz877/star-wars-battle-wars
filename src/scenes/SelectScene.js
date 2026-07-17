import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { CHARACTERS, overall } from '../data/characters.js'
import { portraitKey } from '../art/puppet.js'
import { RENDER_SCALE, applyCrispCamera } from '../util/display.js'

const ARCHETYPE_ICON = { saber: '🗡', blaster: '🔫', brawler: '🐻' }
const GOLD = '#ffe81f'

// Pick your fighter, then your opponent, from the full 28-character grid.
// Styled placeholder cards (portrait swatch + name + rating) until the
// Phase 4 art pass adds real character portraits.
export class SelectScene extends Phaser.Scene {
  constructor() {
    super('Select')
  }

  init(data) {
    this.mode = data?.mode ?? 'single'
  }

  create() {
    applyCrispCamera(this)
    const W = T.arena.width
    const H = T.arena.height

    // Deep-space backdrop: vertical gradient + layered starfield with a
    // few slow twinkles — cheap, but reads far richer than flat black.
    const sky = this.add.graphics()
    sky.fillGradientStyle(0x03030a, 0x03030a, 0x191a33, 0x141428, 1)
    sky.fillRect(0, 0, W, H)
    for (let i = 0; i < 110; i++) {
      const star = this.add.circle(
        Math.random() * W,
        Math.random() * H,
        Math.random() * 1.4 + 0.4,
        0xffffff,
        0.2 + Math.random() * 0.6,
      )
      if (i % 14 === 0) {
        this.tweens.add({
          targets: star,
          alpha: 0.1,
          duration: 900 + Math.random() * 1400,
          yoyo: true,
          repeat: -1,
        })
      }
    }

    this.picking = 'p1'
    this.p1 = null

    this.title = this.add
      .text(W / 2, 36, 'CHOOSE YOUR FIGHTER', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: GOLD,
        stroke: '#000000',
        strokeThickness: 6,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 10, fill: true },
      })
      .setOrigin(0.5)
    this.subtitle = this.add
      .text(W / 2, 64, 'LIGHT SIDE · 17        DARK SIDE · 11', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#8a8ab0',
      })
      .setOrigin(0.5)

    // 7 × 4 grid, light side first, dark side after — matching the spec table.
    const cols = 7
    const cardW = 126
    const cardH = 96
    const startX = (W - cols * cardW) / 2 + cardW / 2
    const startY = 128

    this.cards = [] // {id, x, y} — also used by the automated verify script
    CHARACTERS.forEach((c, i) => {
      const x = startX + (i % cols) * cardW
      const y = startY + Math.floor(i / cols) * cardH
      this.makeCard(c, x, y)
      this.cards.push({ id: c.id, x, y })
    })

    this.makeRandomButton()
    this.add.text(16, H - 20, `build ${__BUILD_TIME__}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#555577',
    })
  }

  makeCard(c, x, y) {
    const light = c.side === 'light'
    const sideColor = light ? 0x4da6ff : 0xff5555
    const container = this.add.container(x, y)

    const card = this.add
      .rectangle(0, 0, 118, 88, light ? 0x101a2e : 0x1f1016)
      .setStrokeStyle(2, sideColor, 0.75)
      .setInteractive({ useHandCursor: true })

    // Portrait band: arted characters show their real (battle-rig) head
    // over the band, with the archetype icon tucked into the corner;
    // everyone else keeps the colored swatch + centered icon until their
    // Phase 4 art lands.
    const portrait = this.add.rectangle(0, -25, 106, 32, c.color, 0.92)
    const portraitShade = this.add.rectangle(0, -17, 106, 15, 0x000000, 0.25)
    const headKey = portraitKey(this, c)
    const pieces = [portrait, portraitShade]
    if (headKey) {
      pieces.push(
        this.add.rectangle(0, -25, 106, 32, 0x000000, 0.45), // dim the band so the face pops
        this.add.image(0, -22, headKey).setScale(1.45 / RENDER_SCALE),
      )
    }
    const icon = this.add
      .text(headKey ? 44 : 0, headKey ? -33 : -25, ARCHETYPE_ICON[c.archetype], {
        fontSize: headKey ? '11px' : '15px',
      })
      .setOrigin(0.5)
      .setAlpha(0.9)
    pieces.push(icon)

    const name = this.add
      .text(0, 6, c.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 112 },
      })
      .setOrigin(0.5)
    const ovr = this.add
      .text(0, 32, `${overall(c)}`, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: GOLD,
      })
      .setOrigin(0.5)

    container.add([card, ...pieces, name, ovr])

    card.on('pointerover', () => {
      card.setFillStyle(light ? 0x1b2b4a : 0x331a22)
      this.tweens.add({ targets: container, scale: 1.07, duration: 90 })
      container.setDepth(10)
    })
    card.on('pointerout', () => {
      card.setFillStyle(light ? 0x101a2e : 0x1f1016)
      this.tweens.add({ targets: container, scale: 1, duration: 90 })
      container.setDepth(0)
    })
    card.on('pointerdown', () => this.pick(c, card))
  }

  makeRandomButton() {
    const W = T.arena.width
    const box = this.add
      .rectangle(W / 2, T.arena.height - 22, 170, 30, 0xffffff, 0.06)
      .setStrokeStyle(1, 0xffe81f, 0.6)
      .setInteractive({ useHandCursor: true })
    const label = this.add
      .text(W / 2, T.arena.height - 22, '🎲  RANDOM', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
    box.on('pointerover', () => label.setColor(GOLD))
    box.on('pointerout', () => label.setColor('#ffffff'))
    box.on('pointerdown', () => {
      const pool = CHARACTERS.filter((c) => c !== this.p1)
      this.pick(pool[Math.floor(Math.random() * pool.length)], null)
    })
  }

  pick(c, card) {
    if (this.picking === 'p1') {
      this.p1 = c
      // Tournament mode only needs the player's own fighter — the other
      // 15 are drawn randomly by createTournament(). Skip straight to
      // Difficulty instead of prompting for an opponent.
      if (this.mode === 'tournament') {
        this.scene.start('Difficulty', { mode: 'tournament', p1: c.id })
        return
      }
      this.picking = 'p2'
      this.title.setText('CHOOSE YOUR OPPONENT')
      this.subtitle.setText(`YOUR FIGHTER: ${c.name.toUpperCase()}`).setColor(GOLD)
      if (card) card.setStrokeStyle(3, 0xffe81f, 1)
    } else {
      this.scene.start('Difficulty', { mode: 'single', p1: this.p1.id, p2: c.id })
    }
  }
}
