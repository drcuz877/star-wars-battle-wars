import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { AI_TIERS } from '../data/ai-tiers.js'
import { CHARACTERS } from '../data/characters.js'
import { ARENAS } from './arenas/index.js'
import { loadJSON, saveJSON } from '../util/storage.js'
import { portraitKey } from '../art/puppet.js'
import { RENDER_SCALE, applyCrispCamera } from '../util/display.js'
import { createTournament } from '../tournament/bracket.js'
import { saveTournament } from '../tournament/state.js'

const GOLD = '#ffe81f'

// Shown after picking both fighters, before Battle. Same gold/deep-space
// visual language as SelectScene — placeholder rank cards until Phase 4
// art (portraits are a select-screen concern, not this one).
export class DifficultyScene extends Phaser.Scene {
  constructor() {
    super('Difficulty')
  }

  init(data) {
    this.mode = data?.mode ?? 'single'
    this.p1Id = data.p1
    this.p2Id = data.p2
  }

  create() {
    applyCrispCamera(this)
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

    // Tournaments randomize the arena per match, so there's nothing to
    // pick here — only single battles get the battleground row.
    if (this.mode !== 'tournament') this.makeArenaRow()

    this.add.text(16, H - 20, `build ${__BUILD_TIME__}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#555577',
    })
  }

  // Battleground picker for single battles: any arena, or the dice.
  // (Tournament mode will keep assigning arenas at random.)
  makeArenaRow() {
    const W = T.arena.width
    const y = 476
    this.arenaId = loadJSON('lastArena', 'random')
    if (this.arenaId !== 'random' && !ARENAS.some((a) => a.id === this.arenaId)) this.arenaId = 'random'

    this.add
      .text(W / 2, y - 26, 'BATTLEGROUND', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#8a8ab0',
      })
      .setOrigin(0.5)

    const options = [
      { id: 'random', label: '🎲 Random' },
      ...ARENAS.map((a) => ({ id: a.id, label: a.name.split(' — ')[0] })),
    ]

    // Build chips, then center the whole row.
    const pad = 10
    this.arenaChips = [] // {id, x, y} — also used by the automated verify script
    const pieces = options.map((o) => {
      const label = this.add
        .text(0, y, o.label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0, 0.5)
      const box = this.add
        .rectangle(0, y, label.width + pad * 2, 26, 0xffffff, 0.05)
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true })
      box.setDepth(1)
      label.setDepth(2)
      return { o, box, label }
    })
    const total = pieces.reduce((sum, p) => sum + p.box.width, 0) + (pieces.length - 1) * 8
    let x = W / 2 - total / 2
    for (const p of pieces) {
      p.box.setPosition(x, y)
      p.label.setPosition(x + pad, y)
      this.arenaChips.push({ id: p.o.id, x: x + p.box.width / 2, y })
      p.box.on('pointerdown', () => this.pickArena(p.o.id))
      x += p.box.width + 8
    }
    this.chipPieces = pieces
    this.refreshArenaRow()
  }

  refreshArenaRow() {
    for (const p of this.chipPieces) {
      const on = p.o.id === this.arenaId
      p.box.setStrokeStyle(on ? 2 : 1, on ? 0xffe81f : 0xffffff, on ? 1 : 0.25)
      p.box.setFillStyle(0xffffff, on ? 0.12 : 0.05)
      p.label.setColor(on ? '#ffe81f' : '#ffffff')
    }
  }

  pickArena(id) {
    this.arenaId = id
    saveJSON('lastArena', id)
    this.refreshArenaRow()
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
    if (this.mode === 'tournament') {
      const state = createTournament(this.p1Id, tier.id)
      saveTournament(state)
      // Explicit { result: null }, not a bare scene.start('Bracket') — when
      // no data is passed, Phaser falls back to reusing the LAST data
      // object that scene key was started with (a stale {result:'loss'}
      // from a previous tournament's elimination), silently eliminating
      // this brand-new tournament on arrival. See BracketScene.init().
      this.scene.start('Bracket', { result: null })
      return
    }
    this.scene.start('Battle', {
      mode: 'single',
      p1: this.p1Id,
      p2: this.p2Id,
      difficulty: tier.id,
      arena: this.arenaId,
    })
  }
}
