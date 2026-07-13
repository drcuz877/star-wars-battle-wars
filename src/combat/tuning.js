// All combat "feel" numbers live here — tweak these to change how fights play.
// Times are in milliseconds, speeds in pixels/second, damage in HP points.
export const TUNING = {
  arena: { width: 960, height: 540, groundY: 470 },

  round: { timeSeconds: 90 },

  fighter: {
    width: 40,
    height: 80,
    moveSpeed: 260,
    jumpVelocity: 620,
    gravity: 1500,
    maxHp: 100,
    maxStamina: 100,
    maxSpecial: 100,
  },

  attack: {
    damage: 8,
    reach: 42, // how far the swing extends in front of the fighter
    windupMs: 90, // telegraph before the swing can connect
    activeMs: 140, // window where the swing can land
    cooldownMs: 420, // minimum gap after a swing before the next one
    staminaCost: 25,
    knockback: 240,
    hitstunMs: 260,
    meterGainOnHit: 15, // special meter gained per clean hit landed
    meterGainOnBlocked: 5,
  },

  special: {
    damage: 20,
    reach: 70,
    windupMs: 140,
    activeMs: 220,
    cooldownMs: 700,
    knockback: 420,
    hitstunMs: 420,
  },

  defend: {
    damageMultiplier: 0.3, // blocked hits only do 30% damage
    blockedHitstunMs: 90,
  },

  stamina: {
    regenPerSecond: 35,
    regenDelayMs: 400, // pause after an attack before stamina starts refilling
  },
}
