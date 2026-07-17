import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { applyCrispCamera } from '../util/display.js'
import { playSfx } from '../audio/audio.js'

// Overlay launched on top of a paused BattleScene.
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause')
  }

  create() {
    applyCrispCamera(this)
    this.input.on('pointerdown', () => playSfx('uiClick'))
    const cx = T.arena.width / 2
    const cy = T.arena.height / 2
    this.add.rectangle(cx, cy, T.arena.width, T.arena.height, 0x000000, 0.65)

    // Panel in the menus' shared language: deep blue, gold-edged.
    this.add.rectangle(cx, cy + 20, 380, 370, 0x0c1424, 0.92).setStrokeStyle(2, 0xffe81f, 0.5)

    this.add
      .text(cx, 150, 'PAUSED', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '44px',
        fontStyle: 'bold',
        color: '#ffe81f',
        stroke: '#000000',
        strokeThickness: 6,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 10, fill: true },
      })
      .setOrigin(0.5)

    this.makeOption(cx, 226, 'RESUME', () => this.resumeBattle())
    this.makeOption(cx, 274, 'SETTINGS', () => this.scene.start('Settings'))
    this.makeOption(cx, 322, 'RESTART MATCH', () => this.restartBattle())
    this.makeOption(cx, 370, 'QUIT GAME', () => this.quitGame())

    this.add
      .text(cx, 412, 'ESC or P also resumes', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#666688',
      })
      .setOrigin(0.5)

    this.input.keyboard.on('keydown-ESC', () => this.resumeBattle())
    this.input.keyboard.on('keydown-P', () => this.resumeBattle())
  }

  makeOption(x, y, label, onSelect) {
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    text.on('pointerover', () => text.setColor('#ffe81f'))
    text.on('pointerout', () => text.setColor('#ffffff'))
    text.on('pointerdown', onSelect)
  }

  resumeBattle() {
    this.scene.stop()
    // Picks up any keymap change made in Settings immediately, instead of
    // waiting for the next rematch/new battle to rebuild the Key objects.
    this.scene.get('Battle').keyboard?.rebind()
    this.scene.resume('Battle')
  }

  restartBattle() {
    this.scene.stop()
    this.scene.get('Battle').scene.restart()
  }

  quitGame() {
    this.scene.stop()
    // A tournament match quit doesn't record a result — the saved bracket
    // is untouched, so landing back on Bracket just re-shows the same
    // pending match (Resume takes the identical path).
    const mode = this.scene.get('Battle').mode
    this.scene.stop('Battle')
    if (mode === 'tournament') {
      // Explicit { result: null } — a bare scene.start('Bracket') can
      // reapply a stale result from Bracket's last activation. See
      // BracketScene.init() / DifficultyScene.
      this.scene.start('Bracket', { result: null })
    } else {
      this.scene.start('Select')
    }
  }
}
