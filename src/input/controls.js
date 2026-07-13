import Phaser from 'phaser'

// Drew's default scheme: arrows move, Space jumps, A attacks, D defends.
// Special fires on W directly, or the original S+A chord (hold S, press A).
export class KeyboardControls {
  constructor(scene) {
    this.keys = scene.input.keyboard.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      jump: 'SPACE',
      attack: 'A',
      defend: 'D',
      chord: 'S',
      special: 'W',
    })
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
