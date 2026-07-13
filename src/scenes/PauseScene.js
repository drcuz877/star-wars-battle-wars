import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'

// Overlay launched on top of a paused BattleScene. Settings entries
// (control remapping, sound) arrive with the Phase 6 settings work.
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause')
  }

  create() {
    const cx = T.arena.width / 2
    this.add.rectangle(cx, T.arena.height / 2, T.arena.width, T.arena.height, 0x000000, 0.65)

    this.add
      .text(cx, 150, 'PAUSED', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#ffe81f',
      })
      .setOrigin(0.5)

    this.makeOption(cx, 250, 'RESUME', () => this.resumeBattle())
    this.makeOption(cx, 310, 'RESTART MATCH', () => this.restartBattle())

    this.add
      .text(cx, 375, 'settings (controls · sound) coming in a later phase', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#666688',
      })
      .setOrigin(0.5)
    this.add
      .text(cx, 410, 'ESC or P also resumes', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
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
}
