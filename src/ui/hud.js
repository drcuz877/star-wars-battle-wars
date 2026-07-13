import { TUNING as T } from '../combat/tuning.js'

const HEALTH_W = 300
const STAMINA_W = 220
const SPECIAL_W = 160

// One corner of the HUD: name plate plus health / stamina / special bars.
// Left corner for the player, mirrored right corner for the opponent.
export class Hud {
  constructor(scene, fighter, side) {
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
  }
}
