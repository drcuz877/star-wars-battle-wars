import { TUNING as T } from '../combat/tuning.js'
import { portraitKey } from '../art/puppet.js'
import { RENDER_SCALE } from '../util/display.js'

const HEALTH_W = 268
const STAMINA_W = 194
const SPECIAL_W = 146
const GOLD = 0xffe81f

// One corner of the HUD: portrait chip, name plate, and health / stamina /
// special bars on a translucent panel (so they read on bright arenas like
// Hoth). Left corner for the player, mirrored right for the opponent.
export class Hud {
  constructor(scene, fighter, side) {
    this.scene = scene
    this.fighter = fighter
    const left = side === 'left'
    const W = T.arena.width
    const originX = left ? 0 : 1
    const bx = left ? 76 : W - 76 // bars/name anchor, past the portrait

    // Stroked shapes are positioned by CENTER: Phaser renders a stroke
    // skewed when a Rectangle has a non-centered origin (seen as a
    // diagonal artifact on the mirrored right panel).
    const cx = (offset) => (left ? offset : W - offset)
    scene.add
      .rectangle(cx(8 + 192), 50, 384, 88, 0x0a101e, 0.55)
      .setStrokeStyle(1, GOLD, 0.3)

    // Portrait chip: the fighter's actual battle-rig head, framed in the
    // character's side color (blue light / red dark).
    const sideColor = fighter.character.side === 'light' ? 0x4da6ff : 0xff5555
    scene.add.rectangle(cx(18 + 24), 40, 48, 52, 0x10182c, 0.9).setStrokeStyle(2, sideColor, 0.9)
    const key = portraitKey(scene, fighter.character)
    if (key) scene.add.image(cx(42), 41, key).setScale(1.7 / RENDER_SCALE)

    scene.add
      .text(bx, 12, `${fighter.name}${left ? '  (YOU)' : ''}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(originX, 0)

    this.healthFill = this.makeBar(scene, bx, 46, HEALTH_W, 15, 0x3ddc55, originX)
    this.staminaFill = this.makeBar(scene, bx, 66, STAMINA_W, 8, 0xffc94d, originX)
    this.specialFill = this.makeBar(scene, bx, 80, SPECIAL_W, 8, 0x4da6ff, originX)

    // Flashes alongside the pulsing bar when the special is charged.
    this.readyText = this.scene.add
      .text(left ? bx + SPECIAL_W + 10 : bx - SPECIAL_W - 10, 80, 'READY!', {
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
    // Backing is center-positioned (see stroke note above); the fill
    // keeps its edge origin so scaleX drains it toward the screen edge.
    const dir = originX === 0 ? 1 : -1
    scene.add
      .rectangle(x + (dir * width) / 2, y, width, height, 0x000000, 0.6)
      .setStrokeStyle(1, 0xffffff, 0.18)
    return scene.add
      .rectangle(x + dir * 2, y, width - 4, height - 4, color)
      .setOrigin(originX, 0.5)
  }

  update() {
    const f = this.fighter

    const hpPct = f.hp / f.d.maxHp
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
