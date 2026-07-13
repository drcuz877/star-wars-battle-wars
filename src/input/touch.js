import { TUNING as T } from '../combat/tuning.js'

// On-screen buttons for phones/tablets: move + jump on the left,
// Attack / Defend / Special on the right. Special gets its own button on
// touch (no chord needed) and glows gold when the meter is full.
// Produces the same intents shape as the keyboard.
export class TouchControls {
  constructor(scene) {
    this.scene = scene
    scene.input.addPointer(3) // move + jump + attack fingers at the same time

    this.held = { left: false, right: false, defend: false }
    this.pressed = { jump: false, attack: false, special: false }

    const y = T.arena.height - 64

    this.makeButton(64, y, '◀', 'left', 'hold')
    this.makeButton(158, y, '▶', 'right', 'hold')
    this.makeButton(111, y - 88, 'JUMP', 'jump', 'press')

    this.makeButton(T.arena.width - 64, y, 'ATK', 'attack', 'press')
    this.makeButton(T.arena.width - 158, y, 'DEF', 'defend', 'hold')
    this.specialButton = this.makeButton(T.arena.width - 111, y - 88, 'SPC', 'special', 'press')
  }

  makeButton(x, y, label, action, mode) {
    const circle = this.scene.add
      .circle(x, y, 40, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.35)
      .setDepth(50)
      .setInteractive()
    this.scene.add
      .text(x, y, label, { fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(51)
      .setAlpha(0.75)

    const down = () => {
      circle.setFillStyle(0xffffff, 0.32)
      if (mode === 'hold') this.held[action] = true
      else this.pressed[action] = true
    }
    const up = () => {
      circle.setFillStyle(0xffffff, 0.12)
      if (mode === 'hold') this.held[action] = false
    }
    circle.on('pointerdown', down)
    circle.on('pointerup', up)
    circle.on('pointerout', up)
    return circle
  }

  read() {
    const intents = {
      left: this.held.left,
      right: this.held.right,
      defend: this.held.defend,
      jumpPressed: this.pressed.jump,
      attackPressed: this.pressed.attack,
      specialPressed: this.pressed.special,
    }
    this.pressed = { jump: false, attack: false, special: false }
    return intents
  }

  setSpecialReady(ready) {
    this.specialButton.setStrokeStyle(ready ? 3 : 2, ready ? 0xffe81f : 0xffffff, ready ? 1 : 0.35)
  }
}
