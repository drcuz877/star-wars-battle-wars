import Phaser from 'phaser'
import { TUNING as T } from './tuning.js'
import { specialConfig } from './derive.js'
import { playSfx } from '../audio/audio.js'

// The 9 mechanical templates behind all 28 signature specials. Every
// character's special entry in characters.js names one of these plus any
// number overrides; damage/heal/stun amounts are multiplied by the
// character's potency (0.6–1.4× from their FRC or STR).
//
// Each template can define:
//   start(f, run)      fired the moment the special begins
//   update(f, run, dt) per-frame while it runs (omit = instant special)
//   end(f, run)        cleanup when it finishes or is interrupted
//   locks: true        fighter can't move/attack while it runs

export function startSpecial(f) {
  const cfg = specialConfig(f.character)
  const run = { template: cfg.template, cfg, P: f.d.potency, t: 0 }
  f.special = 0
  f.specialRun = run
  f.popup(cfg.name.toUpperCase(), '#ffe81f', 17)
  playSfx('specialCast')
  const tpl = TEMPLATES[cfg.template]
  tpl.start?.(f, run)
  // Instant specials (grip, buff, heal, sureShot) finish on the spot —
  // unless start() already ended the run itself.
  if (!tpl.update && f.specialRun === run) endSpecial(f)
}

export function updateSpecial(f, dtMs) {
  const run = f.specialRun
  run.t += dtMs
  TEMPLATES[run.template].update?.(f, run, dtMs)
}

export function cancelSpecial(f) {
  endSpecial(f)
}

export function specialLocks(run) {
  return !!TEMPLATES[run.template].locks
}

function endSpecial(f) {
  const run = f.specialRun
  if (!run) return
  TEMPLATES[run.template].end?.(f, run)
  f.specialRun = null
}

// ---------------------------------------------------------------------------

const opponentOf = (f) => f.scene.opponentOf(f)

function inFront(f, opp) {
  return Math.sign(opp.rect.x - f.rect.x) === f.facing || Math.abs(opp.rect.x - f.rect.x) < 30
}

function meleeOverlap(f, opp, reach) {
  return !opp.ko && Phaser.Geom.Rectangle.Overlaps(f.hitbox(reach), opp.rect.getBounds())
}

// Quick colored slash rectangle for dash/flurry hits.
function slashFlash(f, color) {
  const hb = f.hitbox(T.attack.reach + 14)
  const slash = f.scene.add
    .rectangle(hb.centerX, hb.centerY, hb.width, 34, color, 0.9)
    .setDepth(30)
    .setAngle(Phaser.Math.Between(-30, 30))
  f.scene.tweens.add({ targets: slash, alpha: 0, duration: 160, onComplete: () => slash.destroy() })
}

// Force Push: translucent shock arcs race from the caster's palm to the
// target, then a burst lands.
function pushWave(f, opp) {
  const scene = f.scene
  const x0 = f.rect.x + f.facing * (T.fighter.width / 2 + 8)
  const y0 = f.rect.y - 14
  for (let i = 0; i < 3; i++) {
    scene.time.delayedCall(i * 60, () => {
      const arc = scene.add
        .ellipse(x0, y0, 12, 34 + i * 8)
        .setStrokeStyle(3, 0xcfe4ff, 0.85)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(35)
      scene.tweens.add({
        targets: arc,
        x: opp.rect.x,
        scaleY: 1.7,
        alpha: 0,
        duration: 240,
        ease: 'Quad.easeOut',
        onComplete: () => arc.destroy(),
      })
    })
  }
  scene.time.delayedCall(200, () => ringBurst(scene, opp.rect.x, opp.rect.y - 10, 0x9fc4ff, 2.5))
}

// Force Choke / Freeze: rings CONTRACT around the held target instead of
// bursting outward — the squeeze, not the shove.
function gripSqueeze(scene, opp) {
  for (let i = 0; i < 2; i++) {
    scene.time.delayedCall(i * 130, () => {
      const ring = scene.add
        .circle(opp.rect.x, opp.rect.y - 18, 40)
        .setStrokeStyle(4, 0xb46bff, 0.9)
        .setDepth(40)
      scene.tweens.add({
        targets: ring,
        scale: 0.3,
        alpha: 0.15,
        duration: 330,
        ease: 'Quad.easeIn',
        onComplete: () => ring.destroy(),
      })
    })
  }
}

function ringBurst(scene, x, y, color, scale = 4) {
  const ring = scene.add.circle(x, y, 24).setStrokeStyle(5, color).setDepth(40)
  scene.tweens.add({
    targets: ring,
    scale,
    alpha: 0,
    duration: 380,
    ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  })
}

// Jagged lightning bolt (Palpatine/Dooku) or flame cone (Boba) per beam tick.
function beamVisual(f, opp, flame) {
  const scene = f.scene
  const g = scene.add.graphics().setDepth(35)
  const x0 = f.rect.x + f.facing * (T.fighter.width / 2)
  const y0 = f.rect.y - 20
  if (flame) {
    const len = Math.min(Math.abs(opp.rect.x - x0) + 30, 200)
    g.fillStyle(0xff8833, 0.55)
    g.fillTriangle(x0, y0, x0 + f.facing * len, y0 - 34, x0 + f.facing * len, y0 + 34)
  } else {
    g.lineStyle(3, 0xaaddff, 1)
    const x1 = opp.rect.x
    const y1 = opp.rect.y - 10
    g.beginPath()
    g.moveTo(x0, y0)
    const segs = 6
    for (let i = 1; i < segs; i++) {
      const t = i / segs
      g.lineTo(
        x0 + (x1 - x0) * t + Phaser.Math.Between(-14, 14),
        y0 + (y1 - y0) * t + Phaser.Math.Between(-16, 16),
      )
    }
    g.lineTo(x1, y1)
    g.strokePath()
  }
  scene.tweens.add({ targets: g, alpha: 0, duration: 140, onComplete: () => g.destroy() })
}

const TEMPLATES = {
  // Sustained damage while the target stays in range in front of the
  // caster: Force Lightning, Sith Lightning, Flame Projector.
  beam: {
    locks: true,
    start(f, run) {
      run.nextTick = 0
      f.body.setVelocityX(0)
    },
    update(f, run) {
      const cfg = run.cfg
      if (run.t >= cfg.durationMs) return cancelSpecial(f)
      if (run.t < run.nextTick) return
      run.nextTick += cfg.tickMs
      const opp = opponentOf(f)
      const dist = Math.abs(opp.rect.x - f.rect.x)
      if (opp.ko || dist > cfg.range || !inFront(f, opp) || Math.abs(opp.rect.y - f.rect.y) > 80) return
      beamVisual(f, opp, cfg.flame)
      opp.applyHit({
        charges: false,
        attacker: f,
        damage: cfg.tickDamage * run.P,
        knockback: 50,
        hitstunMs: cfg.tickStunMs,
        ranged: true,
      })
    },
  },

  // Instant ranged grab: Force Choke, Force Freeze, Force Push, stun shots.
  // Stuns for stunMs; Push variants add knockback instead.
  grip: {
    start(f, run) {
      const cfg = run.cfg
      const opp = opponentOf(f)
      const dist = Math.abs(opp.rect.x - f.rect.x)
      if (opp.ko || dist > cfg.range || !inFront(f, opp)) {
        f.popup('WHIFF', '#8a8ab0', 14)
        return
      }
      // Same mechanic, three visual flavors: a blaster user's stun shot
      // flashes gold at the target; a Force shove sends wave arcs across;
      // a zero-knockback hold squeezes rings inward around the victim.
      if (f.d.ranged) ringBurst(f.scene, opp.rect.x, opp.rect.y - 10, 0xffd24a, 2)
      else if ((cfg.knockback ?? 0) > 0) pushWave(f, opp)
      else gripSqueeze(f.scene, opp)
      opp.applyHit({
        charges: false,
        attacker: f,
        damage: cfg.damage * run.P,
        knockback: cfg.knockback,
        hitstunMs: cfg.stunMs,
        ranged: true,
      })
      // Cad Bane's Quick Draw: the stun shot is followed by a real bolt.
      if (cfg.followUpBolt) {
        f.scene.projectiles.spawn({
          fromSpecial: true,
          owner: f,
          x: f.rect.x + f.facing * (T.fighter.width / 2 + 12),
          y: f.rect.y - 12,
          vx: f.facing * T.bolt.speed * 1.2,
          damage: f.d.boltDamage * 1.4,
          color: 0xffd24a,
        })
      }
    },
  },

  // Fires count special bolts, staggered: missiles (arc), Maul's returning
  // saber, homing Whistling Birds, multi-shot pistol volleys.
  projectile: {
    start(f, run) {
      run.fired = 0
      run.nextAt = 0
    },
    update(f, run) {
      const cfg = run.cfg
      while (run.fired < cfg.count && run.t >= run.nextAt) {
        run.fired++
        run.nextAt += cfg.gapMs
        f.scene.projectiles.spawn({
          fromSpecial: true,
          owner: f,
          x: f.rect.x + f.facing * (T.fighter.width / 2 + 12),
          y: f.rect.y - 16 - (cfg.homing ? run.fired * 7 : 0),
          vx: f.facing * cfg.speed,
          vy: cfg.arc ? -300 : 0,
          damage: cfg.damage * run.P,
          knockback: 260,
          homing: cfg.homing,
          returning: cfg.returning,
          arc: cfg.arc,
          target: opponentOf(f),
          color: cfg.returning ? (f.character.saber?.colors?.[0] ?? 0xffd24a) : 0xffd24a,
          width: 24,
          height: 9,
        })
      }
      if (run.fired >= cfg.count) cancelSpecial(f)
    },
  },

  // Wookiee Rage (timed damage/toughness buff) and Shatterpoint
  // (critNext: the next landed hit crits through block and armor).
  buff: {
    start(f, run) {
      const cfg = run.cfg
      if (cfg.critNext) {
        f.critNext = true
        ringBurst(f.scene, f.rect.x, f.rect.y - 20, 0xffd700, 3)
      } else {
        f.buffMs = cfg.durationMs
        f.buffDamageMult = 1 + (cfg.damageMult - 1) * run.P
        f.buffTakenMult = 1 - (1 - cfg.damageTakenMult) * run.P
        ringBurst(f.scene, f.rect.x, f.rect.y - 20, 0xff8844, 3.5)
      }
    },
  },

  // Force Heal, Force Serenity (stamina), Grogu's Force Barrier
  // (brief invulnerability + a shockwave push).
  heal: {
    start(f, run) {
      const cfg = run.cfg
      const healed = Math.round(cfg.hp * run.P)
      if (healed > 0) {
        f.hp = Math.min(f.d.maxHp, f.hp + healed)
        f.popup(`+${healed}`, '#3ddc55')
      }
      if (cfg.stamina) f.stamina = Math.min(T.fighter.maxStamina, f.stamina + cfg.stamina)
      ringBurst(f.scene, f.rect.x, f.rect.y - 20, 0x3ddc55, 3)
      if (cfg.barrierMs) {
        f.barrierMs = cfg.barrierMs
        const opp = opponentOf(f)
        if (!opp.ko && Math.abs(opp.rect.x - f.rect.x) < 170) {
          opp.applyHit({
          charges: false,
            charges: false,
        charges: false,
            attacker: f,
            damage: cfg.barrierPushDamage,
            knockback: cfg.barrierPush,
            hitstunMs: 250,
          })
        }
      }
    },
  },

  // Forward strike dash with repeated hit chances: Force Whirlwind,
  // Relentless Assault, jetpack dives, Riot Breaker.
  dash: {
    locks: true,
    start(f, run) {
      run.hits = 0
      run.nextHit = 0
      f.body.setVelocityX(f.facing * run.cfg.speed)
    },
    update(f, run) {
      const cfg = run.cfg
      if (run.t >= cfg.durationMs || run.hits >= cfg.hits) return cancelSpecial(f)
      f.body.setVelocityX(f.facing * cfg.speed) // out-muscle drag
      if (run.t < run.nextHit) return
      const opp = opponentOf(f)
      if (meleeOverlap(f, opp, T.attack.reach + 10)) {
        run.hits++
        run.nextHit = run.t + cfg.rehitMs
        slashFlash(f, f.weaponColor)
        opp.applyHit({
          charges: false,
        charges: false,
          attacker: f,
          damage: (cfg.hitDamage ?? T.templates.dash.hitDamage) * run.P,
          knockback: run.hits >= cfg.hits ? cfg.knockback : 120,
          hitstunMs: 220,
          melee: true,
        })
      }
    },
    end(f) {
      if (!f.ko && f.hitstun <= 0) f.body.setVelocityX(0)
    },
  },

  // High Ground: hold the stance; the next melee hit is negated and
  // reflected, and bolts bounce back (handled in applyHit/projectiles).
  counter: {
    locks: true,
    start(f, run) {
      f.counterActive = true
      f.counterReflect = run.cfg.reflectDamage * run.P
      f.body.setVelocityX(0)
      ringBurst(f.scene, f.rect.x, f.rect.y - 20, 0xffffff, 2.5)
    },
    update(f, run) {
      if (run.t >= run.cfg.stanceMs) cancelSpecial(f)
    },
    end(f) {
      f.counterActive = false
    },
  },

  // Stationary rapid multi-hit: Twin Saber Frenzy, Four-Arm Fury.
  // Grievous alternates his stolen blue and green blades.
  flurry: {
    locks: true,
    start(f, run) {
      run.hits = 0
      run.nextHit = 0
      f.body.setVelocityX(0)
    },
    update(f, run) {
      const cfg = run.cfg
      if (run.hits >= cfg.hits || run.t > cfg.hits * cfg.rehitMs + 250) return cancelSpecial(f)
      if (run.t < run.nextHit) return
      run.nextHit = run.t + cfg.rehitMs
      const opp = opponentOf(f)
      if (meleeOverlap(f, opp, T.attack.reach + cfg.reachBonus)) {
        run.hits++
        const colors = f.character.saber?.colors ?? [0xffffff]
        slashFlash(f, colors[run.hits % colors.length])
        opp.applyHit({
          charges: false,
        charges: false,
          attacker: f,
          damage: cfg.hitDamage * run.P,
          knockback: run.hits >= cfg.hits ? 320 : 80,
          hitstunMs: 190,
          melee: true,
        })
      }
    },
  },

  // Han shot first: a single heavy bolt that can't be blocked, dodged,
  // or deflected (jumping over it is fair game).
  sureShot: {
    start(f, run) {
      const cfg = run.cfg
      f.scene.cameras.main.flash(110, 255, 240, 200)
      f.scene.projectiles.spawn({
        fromSpecial: true,
        owner: f,
        x: f.rect.x + f.facing * (T.fighter.width / 2 + 12),
        y: f.rect.y - 12,
        vx: f.facing * cfg.speed,
        damage: cfg.damage * run.P,
        knockback: 420,
        sure: true,
        color: 0xffffff,
        width: 28,
        height: 8,
      })
    },
  },
}
