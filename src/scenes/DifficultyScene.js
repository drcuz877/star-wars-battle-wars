import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { AI_TIERS } from '../data/ai-tiers.js'
import { CHARACTERS } from '../data/characters.js'
import { loadJSON, saveJSON } from '../util/storage.js'
import { portraitKey } from '../art/puppet.js'
import { RENDER_SCALE } from '../util/display.js'

const GOLD = '#ffe81f'

// Shown after picking both fighters, before Battle. Same gold/deep-space
// visual language as SelectScene — placeholder rank cards until Phase 4
// art (portraits are a select-screen concern, not this one).
export class DifficultyScene extends Phaser.Scene {
  constructor() {
    super('Difficulty')
  }

  init(data) {
    this.p1Id = data.p1
    this.p2Id = data.p2
  }

  create() {
    const W = T.arena.width
    const H = T.arena.height

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

    this.add
      .text(W / 2, 64, 'CHOOSE THE JEDI RANK', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: GOLD,
        stroke: '#000000',
        strokeThickness: 6,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 10, fill: true },
      })
      .setOrigin(0.5)
    this.add
      .text(W / 2, 96, 'Same stats every rank — only the reflexes change.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#8a8ab0',
      })
      .setOrigin(0.5)

    // The matchup this rank applies to, with portraits where they exist.
    const p1 = CHARACTERS.find((c) => c.id === this.p1Id)
    const p2 = CHARACTERS.find((c) => c.id === this.p2Id)
    if (p1 && p2) {
      const vs = this.add
        .text(W / 2, 136, `${p1.name.toUpperCase()}   VS   ${p2.name.toUpperCase()}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setAlpha(0.9)
      const k1 = portraitKey(this, p1)
      const k2 = portraitKey(this, p2)
      const half = vs.width / 2
      if (k1) this.add.image(W / 2 - half - 26, 134, k1).setScale(1.3 / RENDER_SCALE)
      if (k2) this.add.image(W / 2 + half + 26, 134, k2).setScale(1.3 / RENDER_SCALE)
    }

    const lastId = loadJSON('lastDifficulty', null)
    const cardW = 210
    const startX = W / 2 - ((AI_TIERS.length - 1) * cardW) / 2
    const y = H / 2 + 30

    this.cards = [] // {id, x, y} — also used by the automated verify script
    AI_TIERS.forEach((tier, i) => {
      const x = startX + i * cardW
      this.makeCard(tier, x, y, tier.id === lastId)
      this.cards.push({ id: tier.id, x, y })
    })

    this.add.text(16, H - 20, `build ${__BUILD_TIME__}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#555577',
    })
  }

  makeCard(tier, x, y, isLast) {
    const rankIndex = AI_TIERS.indexOf(tier)
    const container = this.add.container(x, y)

    const card = this.add
      .rectangle(0, 0, 190, 220, 0x101a2e)
      .setStrokeStyle(isLast ? 3 : 2, 0xffe81f, isLast ? 1 : 0.6)
      .setInteractive({ useHandCursor: true })

    // Rank-ladder pips instead of art — portraits are a Phase 4 concern.
    const pips = []
    for (let i = 0; i < AI_TIERS.length; i++) {
      pips.push(this.add.rectangle(-45 + i * 30, -78, 22, 10, i <= rankIndex ? 0xffe81f : 0x333355))
    }

    const label = this.add
      .text(0, -36, tier.label, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
    const blurb = this.add
      .text(0, 4, tier.blurb, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#8a8ab0',
        align: 'center',
        wordWrap: { width: 164 },
      })
      .setOrigin(0.5)
    const stats = this.add
      .text(0, 60, `Reaction ~${tier.reactionMs}ms\nDefends ~${Math.round(tier.defendRate * 100)}%`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#66ffff',
        align: 'center',
      })
      .setOrigin(0.5)
    const lastTag = isLast
      ? this.add
          .text(0, 96, 'LAST PLAYED', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '10px',
            fontStyle: 'bold',
            color: GOLD,
          })
          .setOrigin(0.5)
      : null

    container.add([card, ...pips, label, blurb, stats, ...(lastTag ? [lastTag] : [])])

    card.on('pointerover', () => {
      card.setFillStyle(0x1b2b4a)
      this.tweens.add({ targets: container, scale: 1.06, duration: 90 })
      container.setDepth(10)
    })
    card.on('pointerout', () => {
      card.setFillStyle(0x101a2e)
      this.tweens.add({ targets: container, scale: 1, duration: 90 })
      container.setDepth(0)
    })
    card.on('pointerdown', () => this.pick(tier))
  }

  pick(tier) {
    saveJSON('lastDifficulty', tier.id)
    this.scene.start('Battle', { p1: this.p1Id, p2: this.p2Id, difficulty: tier.id })
  }
}
