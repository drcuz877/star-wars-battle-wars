import Phaser from 'phaser'
import { getKeymap } from './keymap.js'

// Drew's default scheme: arrows move, Space jumps, A attacks, D defends.
// Special fires on W directly, or the original S+A chord (hold S, press A)
// — the chord's S key is a fixed secondary trigger, not remappable via
// Settings (see keymap.js).
export class KeyboardControls {
  constructor(scene) {
    this.scene = scene
    this.buildKeys()
  }

  buildKeys() {
    const map = getKeymap()
    this.keys = this.scene.input.keyboard.addKeys({
      left: map.left,
      right: map.right,
      jump: map.jump,
      attack: map.attack,
      defend: map.defend,
      chord: 'S',
      special: map.special,
    })
  }

  // Called when resuming a live battle from the pause menu, so a keymap
  // change made in Settings takes effect immediately instead of waiting
  // for the next rematch/new battle.
  rebind() {
    this.buildKeys()
  }

  read() {
    const k = this.keys
    const attackTapped = Phaser.Input.Keyboard.JustDown(k.attack)
    const chordHeld = k.chord.isDown
    return {
      left: k.left.isDown,
      right: k.right.isDown,
      defend: k.defend.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(k.jump),
      attackPressed: attackTapped && !chordHeld,
      specialPressed: (attackTapped && chordHeld) || Phaser.Input.Keyboard.JustDown(k.special),
    }
  }
}
