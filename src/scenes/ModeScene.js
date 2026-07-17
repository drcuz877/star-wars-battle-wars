import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { applyCrispCamera } from '../util/display.js'
import { loadTournament } from '../tournament/state.js'
import { roundName } from '../tournament/bracket.js'
import { CHARACTERS } from '../data/characters.js'

const GOLD = '#ffe81f'

// Landing scene after the crawl. Forks into a single battle, a fresh
// tournament, or (if one is saved) resuming an in-progress tournament.
export class ModeScene extends Phaser.Scene {
  constructor() {
    super('Mode')
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
        this.scene.start('Bracket')
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
}
