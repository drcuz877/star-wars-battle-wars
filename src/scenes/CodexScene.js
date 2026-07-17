import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { applyCrispCamera, RENDER_SCALE } from '../util/display.js'
import { CHARACTERS, overall } from '../data/characters.js'
import { portraitKey } from '../art/puppet.js'
import { playSfx } from '../audio/audio.js'
import { isOverridden } from '../holocron/overrides.js'

const GOLD = '#ffe81f'
const STAT_KEYS = ['str', 'spd', 'frc', 'def']
const STAT_LABELS = { str: 'STRENGTH', spd: 'SPEED', frc: 'THE FORCE', def: 'DEFENSE' }
const ARCHETYPE_ICON = { saber: '🗡', blaster: '🔫', brawler: '🐻' }
const ARCHETYPE_BLURB = {
  saber: 'Melee saberwork — hold Defend to block, time it right and deflect bolts back.',
  blaster: 'Fights at range — Defend is a quick dodge with invulnerability frames.',
  brawler: 'Heavy melee, no deflect — Defend braces for a big reduction, biggest health bar in the game.',
}

// Read-only sibling to the Holocron (Drew's idea, 2026-07-17): browse the
// full roster and learn a character's kit without being able to touch the
// numbers. Always reachable from the main menu, no secret combo — the
// Holocron stays the hidden editor, this is the public reference.
export class CodexScene extends Phaser.Scene {
  constructor() {
    super('Codex')
  }

  create() {
    applyCrispCamera(this)
    this.input.on('pointerdown', () => playSfx('uiClick'))
    const W = T.arena.width
    const H = T.arena.height

    const sky = this.add.graphics()
    sky.fillGradientStyle(0x03030a, 0x03030a, 0x191a33, 0x141428, 1)
    sky.fillRect(0, 0, W, H)
    for (let i = 0; i < 90; i++) {
      this.add.circle(
        Math.random() * W,
        Math.random() * H,
        Math.random() * 1.4 + 0.4,
        0xffffff,
        0.15 + Math.random() * 0.5,
      )
    }

    this.makeBackLink()

    this.add
      .text(W / 2, 36, 'CHARACTER CODEX', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: GOLD,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
    this.add
      .text(W / 2, 64, 'browse the roster — stats and specials, no editing', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#8a8ab0',
      })
      .setOrigin(0.5)

    this.index = 0
    this.portraitImg = null
    this.buildCarousel()
    this.buildStatRows()
    this.buildFooter()

    this.refresh()
  }

  get character() {
    return CHARACTERS[this.index]
  }

  step(dir) {
    this.index = (this.index + dir + CHARACTERS.length) % CHARACTERS.length
    this.refresh()
  }

  buildCarousel() {
    const W = T.arena.width
    const cy = 140

    this.makeArrow(W / 2 - 260, cy, '‹', () => this.step(-1))
    this.makeArrow(W / 2 + 260, cy, '›', () => this.step(1))

    this.portraitX = W / 2
    this.portraitY = cy

    this.nameText = this.add
      .text(W / 2, 215, '', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
    this.metaText = this.add
      .text(W / 2, 240, '', { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#8a8ab0' })
      .setOrigin(0.5)
  }

  makeArrow(x, y, label, onSelect) {
    const circle = this.add
      .circle(x, y, 26, 0xffffff, 0.06)
      .setStrokeStyle(1, 0xffffff, 0.3)
      .setInteractive({ useHandCursor: true })
    const text = this.add
      .text(x, y, label, { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '26px', color: '#ffffff' })
      .setOrigin(0.5)
    circle.on('pointerover', () => {
      circle.setStrokeStyle(2, 0xffe81f, 0.8)
      text.setColor(GOLD)
    })
    circle.on('pointerout', () => {
      circle.setStrokeStyle(1, 0xffffff, 0.3)
      text.setColor('#ffffff')
    })
    circle.on('pointerdown', onSelect)
  }

  buildStatRows() {
    const W = T.arena.width
    const startY = 286
    const stepY = 40
    this.rows = {}
    STAT_KEYS.forEach((key, i) => {
      const y = startY + i * stepY
      this.add
        .text(W / 2 - 260, y, STAT_LABELS[key], {
          fontFamily: 'Arial, sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#8a8ab0',
        })
        .setOrigin(0, 0.5)

      const valueText = this.add
        .text(W / 2 + 210, y, '', {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: GOLD,
        })
        .setOrigin(0.5)
      const barBg = this.add.rectangle(W / 2 - 130, y, 320, 12, 0xffffff, 0.08).setOrigin(0, 0.5)
      const bar = this.add.rectangle(W / 2 - 130, y, 0, 12, 0xffe81f, 0.85).setOrigin(0, 0.5)

      this.rows[key] = { valueText, bar }
    })
  }

  buildFooter() {
    const W = T.arena.width
    const H = T.arena.height

    this.ovrText = this.add
      .text(W / 2, H - 96, '', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    this.specialText = this.add
      .text(W / 2, H - 72, '', { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#7ff0ff' })
      .setOrigin(0.5)

    this.archetypeBlurb = this.add
      .text(W / 2, H - 46, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#8a8ab0',
        align: 'center',
        wordWrap: { width: 640 },
      })
      .setOrigin(0.5)

    this.editedTag = this.add
      .text(W / 2, H - 18, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#7fe08f',
      })
      .setOrigin(0.5)
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

  refresh() {
    const c = this.character

    this.portraitImg?.destroy()
    this.portraitImg = null
    const key = portraitKey(this, c)
    if (key) {
      this.portraitImg = this.add.image(this.portraitX, this.portraitY, key).setScale(4.5 / RENDER_SCALE)
    }

    this.nameText.setText(c.name)
    const side = c.side === 'light' ? 'LIGHT SIDE' : 'DARK SIDE'
    this.metaText.setText(`${ARCHETYPE_ICON[c.archetype] ?? ''}  ${side} · ${c.archetype.toUpperCase()}`)

    for (const key of STAT_KEYS) {
      const row = this.rows[key]
      const v = c.stats[key]
      row.valueText.setText(`${v}`)
      row.bar.width = (320 * v) / 25
    }

    this.ovrText.setText(`OVERALL: ${overall(c)}`)
    this.specialText.setText(`SPECIAL: ${c.special?.name ?? '—'}`)
    this.archetypeBlurb.setText(ARCHETYPE_BLURB[c.archetype] ?? '')
    this.editedTag.setText(isOverridden(c.id) ? '★ edited via the Holocron' : '')
  }
}
