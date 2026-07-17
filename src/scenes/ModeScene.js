import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { applyCrispCamera } from '../util/display.js'
import { loadTournament } from '../tournament/state.js'
import { roundName } from '../tournament/bracket.js'
import { CHARACTERS } from '../data/characters.js'
import { playMusic, playSfx } from '../audio/audio.js'
import { isHolocronUnlocked, unlockHolocron } from '../holocron/unlock.js'
import { nameForKeyEvent } from '../input/keycodes.js'

const GOLD = '#ffe81f'

// The son's secret (spec: "Son's path"). Keyboard is a sliding window —
// only the trailing 7 keys need to match, so one wrong key doesn't force
// starting the whole sequence over. Touch taps the title logo instead,
// since he'll likely play on iPhone.
const HOLOCRON_SEQUENCE = ['UP', 'UP', 'DOWN', 'DOWN', 'A', 'S', 'D']
const HOLOCRON_TAP_TARGET = 7
const HOLOCRON_TAP_WINDOW_MS = 1200

// Landing scene after the crawl. Forks into a single battle, a fresh
// tournament, or (if one is saved) resuming an in-progress tournament.
export class ModeScene extends Phaser.Scene {
  constructor() {
    super('Mode')
  }

  create() {
    applyCrispCamera(this)
    playMusic('menu')
    this.input.on('pointerdown', () => playSfx('uiClick'))
    const W = T.arena.width
    const H = T.arena.height

    // Drew's poster (2026-07-17, Nano Banana) as the menu backdrop, scaled
    // to cover the arena, darkened so the title/buttons stay legible over
    // a busy image — same "dark overlay behind foreground UI" treatment
    // used on every other panel in the game.
    const bg = this.add.image(W / 2, H / 2, 'poster-ensemble')
    bg.setScale(Math.max(W / bg.width, H / bg.height))
    this.add.rectangle(W / 2, H / 2, W, H, 0x03030a, 0.55)

    const title = this.add
      .text(W / 2, 96, 'STAR WARS\nBATTLE WARS', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '46px',
        fontStyle: 'bold',
        color: GOLD,
        align: 'center',
        stroke: '#000000',
        strokeThickness: 6,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 10, fill: true },
      })
      .setOrigin(0.5)

    this.holocronTriggered = false
    this.setupHolocron(title)
    this.makeCodexLink()

    const savedTournament = loadTournament()

    this.buttons = [] // {id, x, y} — also used by the automated verify script

    let y = 280
    this.makeMenuButton('single', W / 2, y, 'SINGLE BATTLE', 'Pick two fighters, one match.', () => {
      this.scene.start('Select', { mode: 'single' })
    })

    y += 88
    this.makeMenuButton('tournament', W / 2, y, 'TOURNAMENT', 'Random 16-fighter bracket. Win it all.', () => {
      this.scene.start('Select', { mode: 'tournament' })
    })

    if (savedTournament && savedTournament.status === 'active') {
      y += 88
      const player = CHARACTERS.find((c) => c.id === savedTournament.playerId)
      const summary = `${player?.name ?? '?'} · ${roundName(savedTournament.currentRound)}`
      this.makeMenuButton('resume', W / 2, y, 'RESUME TOURNAMENT', summary, () => {
        // Explicit { result: null } — see BracketScene.init() / DifficultyScene
        // for why a bare scene.start('Bracket') can reapply a stale result.
        this.scene.start('Bracket', { result: null })
      })
    }

    this.add.text(16, H - 20, `build ${__BUILD_TIME__}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#555577',
    })
  }

  makeMenuButton(id, x, y, label, blurb, onSelect) {
    this.buttons.push({ id, x, y })
    const w = 380
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
    box.on('pointerdown', onSelect)
  }

  setupHolocron(title) {
    if (isHolocronUnlocked()) {
      this.makeHolocronLink()
      return
    }

    this.input.keyboard.removeAllListeners('keydown')
    let keyBuffer = []
    this.input.keyboard.on('keydown', (event) => {
      const name = nameForKeyEvent(event)
      if (!name) return
      keyBuffer.push(name)
      if (keyBuffer.length > HOLOCRON_SEQUENCE.length) keyBuffer.shift()
      if (
        keyBuffer.length === HOLOCRON_SEQUENCE.length &&
        keyBuffer.every((k, i) => k === HOLOCRON_SEQUENCE[i])
      ) {
        this.triggerHolocronUnlock()
      }
    })

    let tapCount = 0
    let lastTap = 0
    title.setInteractive()
    title.on('pointerdown', () => {
      const t = this.time.now
      if (t - lastTap > HOLOCRON_TAP_WINDOW_MS) tapCount = 0
      lastTap = t
      tapCount++
      if (tapCount >= HOLOCRON_TAP_TARGET) this.triggerHolocronUnlock()
    })
  }

  triggerHolocronUnlock() {
    if (this.holocronTriggered) return
    this.holocronTriggered = true
    unlockHolocron()
    playSfx('specialCast')
    this.cameras.main.flash(220, 255, 225, 130)
    this.add
      .text(T.arena.width / 2, T.arena.height / 2, 'JEDI HOLOCRON UNLOCKED', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: GOLD,
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(80)
    this.time.delayedCall(1000, () => this.scene.start('Holocron'))
  }

  makeHolocronLink() {
    const W = T.arena.width
    const H = T.arena.height
    const text = this.add
      .text(W - 16, H - 20, '◆ HOLOCRON', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#7a6a2a',
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
    text.on('pointerover', () => text.setColor(GOLD))
    text.on('pointerout', () => text.setColor('#7a6a2a'))
    text.on('pointerdown', () => this.scene.start('Holocron'))
  }

  // Always-visible public counterpart to the Holocron (Drew's idea,
  // 2026-07-17): browse the roster's stats/specials, no secret combo, no
  // editing. Top-right so it never collides with the mode-button stack
  // below, which grows a third row when a tournament is in progress.
  makeCodexLink() {
    const W = T.arena.width
    const text = this.add
      .text(W - 16, 20, '📖 CHARACTER CODEX', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#8a8ab0',
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
    text.on('pointerover', () => text.setColor(GOLD))
    text.on('pointerout', () => text.setColor('#8a8ab0'))
    text.on('pointerdown', () => this.scene.start('Codex'))
  }
}
