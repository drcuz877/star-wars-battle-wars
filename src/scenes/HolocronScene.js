import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { applyCrispCamera, RENDER_SCALE } from '../util/display.js'
import { CHARACTERS, overall } from '../data/characters.js'
import { portraitKey } from '../art/puppet.js'
import { playSfx } from '../audio/audio.js'
import { setStat, isOverridden, restoreCanon } from '../holocron/overrides.js'

const GOLD = '#ffe81f'
const STAT_KEYS = ['str', 'spd', 'frc', 'def']
const STAT_LABELS = { str: 'STRENGTH', spd: 'SPEED', frc: 'THE FORCE', def: 'DEFENSE' }
const ARCHETYPE_ICON = { saber: '🗡', blaster: '🔫', brawler: '🐻' }

// The son's secret editor (spec: "Son's path"). Pick any character, nudge
// STR/SPD/FRC/DEF with +/- steppers, OVR updates live. Edits mutate the
// shared CHARACTERS array in place (see holocron/overrides.js) and persist
// as localStorage overrides on this device only.
export class HolocronScene extends Phaser.Scene {
  constructor() {
    super('Holocron')
  }

  create() {
    applyCrispCamera(this)
    this.input.on('pointerdown', () => playSfx('uiClick'))
    const W = T.arena.width
    const H = T.arena.height

    const sky = this.add.graphics()
    sky.fillGradientStyle(0x0a0518, 0x0a0518, 0x241033, 0x160a22, 1)
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
      .text(W / 2, 36, 'JEDI HOLOCRON', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: GOLD,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
    this.add
      .text(W / 2, 64, 'secret stat editor — edits save to this device only', {
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

      const minus = this.makeStepper(W / 2 + 70, y, '−', () => this.nudge(key, -1))
      const valueText = this.add
        .text(W / 2 + 130, y, '', {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: GOLD,
        })
        .setOrigin(0.5)
      const plus = this.makeStepper(W / 2 + 190, y, '+', () => this.nudge(key, 1))
      const barBg = this.add.rectangle(W / 2 - 130, y, 160, 10, 0xffffff, 0.08).setOrigin(0, 0.5)
      const bar = this.add.rectangle(W / 2 - 130, y, 0, 10, 0xffe81f, 0.85).setOrigin(0, 0.5)

      this.rows[key] = { valueText, bar, minus, plus }
    })
  }

  makeStepper(x, y, label, onSelect) {
    const box = this.add
      .rectangle(x, y, 32, 32, 0xffffff, 0.08)
      .setStrokeStyle(1, 0xffffff, 0.3)
      .setInteractive({ useHandCursor: true })
    const text = this.add
      .text(x, y, label, { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5)
    box.on('pointerover', () => box.setStrokeStyle(2, 0xffe81f, 0.8))
    box.on('pointerout', () => box.setStrokeStyle(1, 0xffffff, 0.3))
    box.on('pointerdown', onSelect)
    return box
  }

  nudge(key, delta) {
    const current = this.character.stats[key]
    setStat(this.character.id, key, current + delta)
    playSfx('uiClick')
    this.refresh()
  }

  buildFooter() {
    const W = T.arena.width
    const H = T.arena.height

    this.ovrText = this.add
      .text(W / 2, H - 100, '', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    this.editedTag = this.add
      .text(W / 2, H - 78, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#7fe08f',
      })
      .setOrigin(0.5)

    const restoreText = this.add
      .text(W / 2, H - 44, 'RESTORE CANON (all characters)', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ff8877',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    restoreText.on('pointerover', () => restoreText.setColor('#ffaa99'))
    restoreText.on('pointerout', () => restoreText.setColor('#ff8877'))
    restoreText.on('pointerdown', () => {
      restoreCanon()
      this.refresh()
      this.flash('All characters restored to canon stats.')
    })

    this.flashText = this.add
      .text(W / 2, H - 18, '', { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#7fe08f' })
      .setOrigin(0.5)
  }

  flash(message) {
    this.flashText.setText(message)
    this.tweens.killTweensOf(this.flashText)
    this.flashText.setAlpha(1)
    this.tweens.add({ targets: this.flashText, alpha: 0, delay: 1400, duration: 500 })
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
      row.bar.width = (160 * v) / 25
    }

    this.ovrText.setText(`OVERALL: ${overall(c)}`)
    this.editedTag.setText(isOverridden(c.id) ? '★ EDITED FROM CANON' : '')
  }
}
