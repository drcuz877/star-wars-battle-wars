import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { applyCrispCamera } from '../util/display.js'
import { isMuted, getVolume, setMuted, setVolume, playSfx } from '../audio/audio.js'
import { getKeymap, setBinding, resetKeymap, ACTION_LABELS, RESERVED_KEYS } from '../input/keymap.js'
import { nameForKeyEvent } from '../input/keycodes.js'

const GOLD = '#ffe81f'
const ACTIONS = ['left', 'right', 'jump', 'attack', 'defend', 'special']

// Reachable from the pause menu (spec, Phase 1 checkpoint feedback).
// Overlays a paused BattleScene the same visual way Pause does — Battle
// keeps rendering its last frame dimmed behind this scene.
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings')
  }

  create() {
    applyCrispCamera(this)
    this.input.on('pointerdown', () => playSfx('uiClick'))
    const cx = T.arena.width / 2
    const cy = T.arena.height / 2
    this.listeningFor = null

    this.add.rectangle(cx, cy, T.arena.width, T.arena.height, 0x000000, 0.72)
    this.add.rectangle(cx, cy, 560, 500, 0x0c1424, 0.94).setStrokeStyle(2, 0xffe81f, 0.5)

    this.add
      .text(cx, cy - 218, 'SETTINGS', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '38px',
        fontStyle: 'bold',
        color: GOLD,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)

    this.add
      .text(cx - 250, cy - 160, 'SOUND', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#8a8ab0',
      })
      .setOrigin(0, 0.5)
    this.makeSoundRow(cx, cy - 128)

    this.add
      .text(cx - 250, cy - 90, 'CONTROLS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#8a8ab0',
      })
      .setOrigin(0, 0.5)

    this.promptText = this.add
      .text(cx, cy + 168, '', { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#ffd24a' })
      .setOrigin(0.5)

    this.rows = {}
    ACTIONS.forEach((action, i) => this.makeControlRow(cx, cy - 54 + i * 38, action))

    this.makeOption(cx - 130, cy + 208, 'RESET DEFAULTS', () => {
      resetKeymap()
      this.refreshRows()
      this.flash('Controls reset to default.')
    })
    this.makeOption(cx + 130, cy + 208, 'BACK', () => this.goBack())

    this.add
      .text(cx, cy + 234, 'click a control, then press the new key · ESC cancels/backs out', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#666688',
      })
      .setOrigin(0.5)

    this.input.keyboard.removeAllListeners('keydown')
    this.input.keyboard.on('keydown', (event) => this.handleKeydown(event))
  }

  handleKeydown(event) {
    if (this.listeningFor) {
      const action = this.listeningFor
      this.listeningFor = null
      if (event.key !== 'Escape') {
        const name = nameForKeyEvent(event)
        if (name && !RESERVED_KEYS.includes(name)) {
          setBinding(action, name)
          this.flash('')
        } else {
          this.flash('That key is reserved for menus — try another.')
        }
      }
      this.refreshRows()
      return
    }
    if (event.key === 'Escape') this.goBack()
  }

  makeSoundRow(cx, y) {
    const levels = [
      { id: 'off', label: 'OFF', apply: () => setMuted(true) },
      { id: 'low', label: 'LOW', apply: () => { setMuted(false); setVolume(0.35) } },
      { id: 'med', label: 'MED', apply: () => { setMuted(false); setVolume(0.7) } },
      { id: 'high', label: 'HIGH', apply: () => { setMuted(false); setVolume(1) } },
    ]
    const chipW = 100
    const startX = cx - ((levels.length - 1) * chipW) / 2
    this.soundChips = levels.map((lvl, i) => {
      const x = startX + i * chipW
      const box = this.add
        .rectangle(x, y, chipW - 10, 34, 0xffffff, 0.06)
        .setStrokeStyle(1, 0xffffff, 0.3)
        .setInteractive({ useHandCursor: true })
      const label = this.add
        .text(x, y, lvl.label, { fontFamily: 'Arial, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#ffffff' })
        .setOrigin(0.5)
      box.on('pointerdown', () => {
        lvl.apply()
        this.refreshSoundChips()
      })
      return { ...lvl, box, label }
    })
    this.refreshSoundChips()
  }

  refreshSoundChips() {
    const current = isMuted() ? 'off' : getVolume() >= 0.85 ? 'high' : getVolume() <= 0.5 ? 'low' : 'med'
    for (const chip of this.soundChips) {
      const on = chip.id === current
      chip.box.setStrokeStyle(on ? 2 : 1, on ? 0xffe81f : 0xffffff, on ? 1 : 0.3)
      chip.box.setFillStyle(0xffffff, on ? 0.12 : 0.06)
      chip.label.setColor(on ? GOLD : '#ffffff')
    }
  }

  makeControlRow(cx, y, action) {
    const label = this.add
      .text(cx - 200, y, ACTION_LABELS[action], {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5)
    const box = this.add
      .rectangle(cx + 170, y, 110, 32, 0xffffff, 0.06)
      .setStrokeStyle(1, 0xffffff, 0.3)
      .setInteractive({ useHandCursor: true })
    const keyText = this.add
      .text(cx + 170, y, '', { fontFamily: 'Arial, sans-serif', fontSize: '14px', fontStyle: 'bold', color: GOLD })
      .setOrigin(0.5)
    box.on('pointerover', () => box.setStrokeStyle(2, 0xffe81f, 0.8))
    box.on('pointerout', () => box.setStrokeStyle(this.listeningFor === action ? 2 : 1, this.listeningFor === action ? 0xffe81f : 0xffffff, this.listeningFor === action ? 1 : 0.3))
    box.on('pointerdown', () => {
      this.listeningFor = action
      this.flash('')
      this.refreshRows()
    })
    this.rows[action] = { box, keyText }
    this.refreshRows()
  }

  refreshRows() {
    const map = getKeymap()
    for (const action of ACTIONS) {
      const row = this.rows[action]
      if (!row) continue
      const listening = this.listeningFor === action
      row.keyText.setText(listening ? '...' : map[action])
      row.box.setStrokeStyle(listening ? 2 : 1, listening ? 0xffe81f : 0xffffff, listening ? 1 : 0.3)
      row.box.setFillStyle(0xffffff, listening ? 0.14 : 0.06)
    }
    if (this.listeningFor) this.promptText.setText('Press a key for ' + ACTION_LABELS[this.listeningFor] + '... (ESC cancels)')
    else if (this.promptText.text.startsWith('Press a key')) this.promptText.setText('')
  }

  flash(message) {
    this.promptText.setText(message)
  }

  makeOption(x, y, label, onSelect) {
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    text.on('pointerover', () => text.setColor(GOLD))
    text.on('pointerout', () => text.setColor('#ffffff'))
    text.on('pointerdown', onSelect)
  }

  goBack() {
    this.scene.start('Pause')
  }
}
