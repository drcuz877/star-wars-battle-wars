import Phaser from 'phaser'
import { TUNING as T } from './tuning.js'

// All flying things: blaster bolts, special projectiles (missiles, saber
// throws, Whistling Birds), and deflected bolts on their way back.
// Owned by the BattleScene; hit resolution goes through Fighter.applyHit
// so blocking / dodging / armor all work the same as melee.
export class Projectiles {
  constructor(scene) {
    this.scene = scene
    this.bolts = []
  }

  spawn(opts) {
    const w = opts.width ?? T.bolt.width
    const h = opts.height ?? T.bolt.height
    const bolt = {
      owner: opts.owner,
      x: opts.x,
      y: opts.y,
      vx: opts.vx,
      vy: opts.vy ?? 0,
      damage: opts.damage,
      knockback: opts.knockback ?? opts.owner.d.knockback,
      stunMs: opts.stunMs ?? 0,
      homing: opts.homing ?? false,
      returning: opts.returning ?? false,
      arc: opts.arc ?? false,
      sure: opts.sure ?? false, // First Shot: can't be blocked, dodged, or deflected
      fromSpecial: opts.fromSpecial ?? false, // special bolts don't recharge the meter
      target: opts.target ?? null,
      traveled: 0,
      flipped: false,
      dodgedBy: new Set(),
      rect: this.scene.add.rectangle(opts.x, opts.y, w, h, opts.color ?? 0xff4444).setDepth(20),
    }
    this.bolts.push(bolt)
    return bolt
  }

  update(dtMs, fighters) {
    const dt = dtMs / 1000
    for (const bolt of this.bolts) {
      if (bolt.arc) bolt.vy += 900 * dt
      if (bolt.homing && bolt.target && !bolt.target.ko) {
        const dy = bolt.target.rect.y - bolt.y
        bolt.vy = Phaser.Math.Clamp(bolt.vy + Math.sign(dy) * 700 * dt, -220, 220)
      }
      if (bolt.returning && !bolt.flipped && bolt.traveled > 380) {
        bolt.flipped = true
        bolt.vx = -bolt.vx
      }

      bolt.x += bolt.vx * dt
      bolt.y += bolt.vy * dt
      bolt.traveled += Math.abs(bolt.vx) * dt
      bolt.rect.setPosition(bolt.x, bolt.y)

      const bounds = bolt.rect.getBounds()
      for (const f of fighters) {
        if (f === bolt.owner || f.ko || bolt.dead) continue
        if (!Phaser.Geom.Rectangle.Overlaps(bounds, f.rect.getBounds())) continue

        // Barrier stops everything; dodge i-frames let anything dodgeable
        // pass clean through (First Shot is undodgeable).
        if (f.invulnerable || (!bolt.sure && f.dodging)) {
          if (!bolt.dodgedBy.has(f)) {
            bolt.dodgedBy.add(f)
            f.popup(f.invulnerable ? 'BARRIER' : 'DODGE', '#7ff0ff', 15)
          }
          continue
        }

        // Saber timed block (or an active High Ground counter) sends the
        // bolt back at whoever fired it.
        if (!bolt.sure && (f.canDeflect() || f.counterActive)) {
          bolt.owner = f
          bolt.vx = -bolt.vx * T.bolt.deflectSpeedMult
          bolt.homing = false
          bolt.returning = false
          bolt.dodgedBy.clear()
          bolt.rect.setFillStyle(0x66ffff)
          f.popup('DEFLECT', '#66ffff')
          continue
        }

        f.applyHit({
          attacker: bolt.owner,
          damage: bolt.damage,
          knockback: bolt.knockback,
          // Normal blaster bolts stun less than special projectiles, so a
          // closing melee fighter isn't repeatedly reset on the approach.
          hitstunMs: Math.max(
            bolt.stunMs,
            T.attack.hitstunMs * (bolt.fromSpecial ? 0.8 : T.bolt.hitstunMult),
          ),
          unblockable: bolt.sure,
          ranged: true,
          charges: !bolt.fromSpecial,
        })
        bolt.dead = true
      }

      // A caught returning blade, or anything off-screen, disappears.
      if (bolt.flipped && bolt.traveled > 800) bolt.dead = true
      if (bolt.x < -60 || bolt.x > T.arena.width + 60 || bolt.y > T.arena.groundY + 30) {
        bolt.dead = true
      }
    }

    this.bolts = this.bolts.filter((b) => {
      if (b.dead) b.rect.destroy()
      return !b.dead
    })
  }
}
