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

    // Touch-capable LAPTOPS get compact buttons: on a big physical screen
    // the full-size pads swallowed the corners (and hid short fighters
    // like Yoda and Grogu behind them). Phones keep finger-sized pads.
    const k = Math.min(window.innerWidth, window.innerHeight) >= 700 ? 0.62 : 1
    this.k = k
    const W = T.arena.width
    const y = T.arena.height - 64 * k

    this.makeButton(64 * k, y, '◀', 'left', 'hold')
    this.makeButton(158 * k, y, '▶', 'right', 'hold')
    this.makeButton(111 * k, y - 88 * k, 'JUMP', 'jump', 'press')

    this.makeButton(W - 64 * k, y, 'ATK', 'attack', 'press')
    this.makeButton(W - 158 * k, y, 'DEF', 'defend', 'hold')
    this.specialButton = this.makeButton(W - 111 * k, y - 88 * k, 'SPC', 'special', 'press')
  }

  makeButton(x, y, label, action, mode) {
    const circle = this.scene.add
      .circle(x, y, 40 * this.k, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.35)
      .setDepth(50)
      .setInteractive()
    this.scene.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.round(16 * (this.k === 1 ? 1 : 0.75))}px`,
        color: '#ffffff',
      })
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
    if (ready === this.specialReadyState) return
    this.specialReadyState = ready
    if (ready) {
      this.specialButton.setStrokeStyle(4, 0xffe81f, 1)
      this.specialPulse = this.scene.tweens.add({
        targets: this.specialButton,
        alpha: 0.4,
        duration: 280,
        yoyo: true,
        repeat: -1,
      })
    } else {
      if (this.specialPulse) this.specialPulse.stop()
      this.specialButton.setAlpha(1).setStrokeStyle(2, 0xffffff, 0.35)
    }
  }
}
