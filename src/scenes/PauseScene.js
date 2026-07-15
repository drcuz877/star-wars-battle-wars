import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { applyCrispCamera } from '../util/display.js'

// Overlay launched on top of a paused BattleScene. Settings entries
// (control remapping, sound) arrive with the Phase 6 settings work.
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause')
  }

  create() {
    applyCrispCamera(this)
    const cx = T.arena.width / 2
    const cy = T.arena.height / 2
    this.add.rectangle(cx, cy, T.arena.width, T.arena.height, 0x000000, 0.65)

    // Panel in the menus' shared language: deep blue, gold-edged.
    this.add.rectangle(cx, cy + 10, 380, 330, 0x0c1424, 0.92).setStrokeStyle(2, 0xffe81f, 0.5)

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

    this.makeOption(cx, 240, 'RESUME', () => this.resumeBattle())
    this.makeOption(cx, 298, 'RESTART MATCH', () => this.restartBattle())
    this.makeOption(cx, 356, 'QUIT GAME', () => this.quitGame())

    this.add
      .text(cx, 408, 'settings (controls · sound) coming in a later phase', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#666688',
      })
      .setOrigin(0.5)
    this.add
      .text(cx, 430, 'ESC or P also resumes', {
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
    this.scene.resume('Battle')
  }

  restartBattle() {
    this.scene.stop()
    this.scene.get('Battle').scene.restart()
  }

  quitGame() {
    this.scene.stop()
    this.scene.stop('Battle')
    this.scene.start('Select')
  }
}
