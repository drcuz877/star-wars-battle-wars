// All combat "feel" numbers live here — tweak these to change how fights play.
// Times are in milliseconds, speeds in pixels/second, damage in HP points.
// Per-character numbers are DERIVED from these plus the 0–25 stats in
// src/data/characters.js — the formulas live in src/combat/derive.js.
export const TUNING = {
  arena: { width: 960, height: 540, groundY: 470 },

  round: { timeSeconds: 90 },

  fighter: {
    width: 40,
    height: 80,
    jumpVelocity: 620,
    gravity: 1500,
    maxStamina: 100,
    maxSpecial: 100,
  },

  // Every hit's damage is nudged by up to ±12% so favorites usually win
  // but never certainly.
  variance: 0.12,

  // Legendary duels: when BOTH fighters rate at or above minOvr, both get
  // the HP multiplier so top-tier matches last longer. Applying it only
  // when the two are top-tier together means no gap ever widens — a
  // Yoda-vs-Grogu match is completely unaffected.
  epicDuel: { minOvr: 85, hpMult: 1.35 },

  // How the 0–25 stats become combat numbers: value = base + perPoint × stat.
  derive: {
    hp: { base: 60, perDef: 1.0, perStr: 0.4, brawlerBonus: 8 },
    meleeDamage: { base: 4, perStr: 0.3 },
    boltDamage: { base: 3.5, perStr: 0.28 },
    moveSpeed: { base: 200, perSpd: 4 },
    attackCooldownMs: { base: 540, perSpd: -9 }, // faster attacks at high SPD
    staminaCostMult: { base: 1.15, perSpd: -0.014 }, // high SPD tires slower
    knockback: { base: 180, perStr: 4 },
    meterGainMult: { base: 1, perFrc: 0.045 }, // FRC charges specials much faster
    blockMult: { base: 0.45, perDef: -0.008 }, // saber block damage multiplier
    braceMult: { base: 0.42, perDef: -0.005 }, // brawler brace (stronger, no deflect)
    armorFlat: { base: 0, perDef: 0.07 }, // Mandalorian flat reduction per hit
    deflectWindowMs: { base: 110, perDef: 5 }, // timed-block bolt deflect window
    dodgeIframesMs: { base: 200, perDef: 6 },
    dodgeCooldownMs: { base: 1400, perSpd: -18 },
    // Special power multiplier from the special's scaling stat (frc or str):
    // 0.6× at stat 0 up to 1.6× at stat 25.
    specialPotency: { base: 0.6, perStat: 0.04 },
  },

  attack: {
    reach: 42, // how far a melee swing extends in front of the fighter
    windupMs: 90, // telegraph before the swing can connect
    activeMs: 140, // window where the swing can land
    staminaCost: 25,
    hitstunMs: 260,
    meterGainOnHit: 15, // special meter gained per clean hit landed
    meterGainOnBlocked: 5,
  },

  bolt: {
    speed: 540,
    width: 18,
    height: 6,
    deflectSpeedMult: 1.15, // deflected bolts fly back a little faster
  },

  dodge: {
    speed: 420, // slide velocity during the dodge
    staminaCost: 20,
    recoverMs: 120, // vulnerable tail after the i-frames end
  },

  defend: {
    blockedHitstunMs: 90,
  },

  stamina: {
    regenPerSecond: 35,
    regenDelayMs: 400, // pause after an attack before stamina starts refilling
  },

  // Default numbers for the 9 special-move templates. A character's
  // special entry in characters.js can override any of these, and damage /
  // heal / stun amounts are multiplied by that character's potency
  // (0.6–1.4× from their scaling stat).
  templates: {
    beam: { durationMs: 1300, tickMs: 200, tickDamage: 5, range: 270, tickStunMs: 150 },
    grip: { damage: 12, stunMs: 700, range: 240, knockback: 0 },
    projectile: { count: 1, damage: 14, speed: 560, gapMs: 150 },
    buff: { durationMs: 5000, damageMult: 1.35, damageTakenMult: 0.75, critMult: 2.6 },
    heal: { hp: 22, stamina: 0, barrierMs: 0, barrierPush: 460, barrierPushDamage: 6 },
    dash: { hits: 3, hitDamage: 7, speed: 720, durationMs: 420, rehitMs: 130, knockback: 300 },
    counter: { stanceMs: 900, reflectDamage: 14 },
    flurry: { hits: 5, hitDamage: 3.6, rehitMs: 150, reachBonus: 12 },
    sureShot: { damage: 18, speed: 1050 },
  },
}
