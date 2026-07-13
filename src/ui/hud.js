import { TUNING as T } from '../combat/tuning.js'

const HEALTH_W = 300
const STAMINA_W = 220
const SPECIAL_W = 160

// One corner of the HUD: name plate plus health / stamina / special bars.
// Left corner for the player, mirrored right corner for the opponent.
export class Hud {
  constructor(scene, fighter, side) {
    this.scene = scene
    this.fighter = fighter
    const left = side === 'left'
    const x = left ? 24 : T.arena.width - 24
    const originX = left ? 0 : 1

    scene.add
      .text(x, 14, fighter.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(originX, 0)

    this.healthFill = this.makeBar(scene, x, 48, HEALTH_W, 16, 0x3ddc55, originX)
    this.staminaFill = this.makeBar(scene, x, 68, STAMINA_W, 8, 0xffc94d, originX)
    this.specialFill = this.makeBar(scene, x, 82, SPECIAL_W, 8, 0x4da6ff, originX)

    // Flashes alongside the pulsing bar when the special is charged.
    this.readyText = this.scene.add
      .text(left ? x + SPECIAL_W + 10 : x - SPECIAL_W - 10, 82, 'READY!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffe81f',
      })
      .setOrigin(originX, 0.5)
      .setVisible(false)
    this.readyState = false
    this.pulse = null
  }

  makeBar(scene, x, y, width, height, color, originX) {
    scene.add.rectangle(x, y, width, height, 0x000000, 0.55).setOrigin(originX, 0.5)
    return scene.add
      .rectangle(x + (originX === 0 ? 2 : -2), y, width - 4, height - 4, color)
      .setOrigin(originX, 0.5)
  }

  update() {
    const f = this.fighter

    const hpPct = f.hp / T.fighter.maxHp
    this.healthFill.scaleX = hpPct
    this.healthFill.setFillStyle(hpPct > 0.5 ? 0x3ddc55 : hpPct > 0.25 ? 0xff9f2e : 0xff3b3b)

    this.staminaFill.scaleX = f.stamina / T.fighter.maxStamina

    this.specialFill.scaleX = f.special / T.fighter.maxSpecial
    this.specialFill.setFillStyle(f.specialReady ? 0xffe81f : 0x4da6ff)

    // Start/stop the ready flash only on state changes.
    if (f.specialReady !== this.readyState) {
      this.readyState = f.specialReady
      if (f.specialReady) {
        this.readyText.setVisible(true)
        this.pulse = this.scene.tweens.add({
          targets: [this.specialFill, this.readyText],
          alpha: 0.25,
          duration: 260,
          yoyo: true,
          repeat: -1,
        })
      } else {
        if (this.pulse) this.pulse.stop()
        this.specialFill.setAlpha(1)
        this.readyText.setVisible(false).setAlpha(1)
      }
    }
  }
}
