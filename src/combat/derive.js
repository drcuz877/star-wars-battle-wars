import { TUNING as T } from './tuning.js'

// Turns a character's 0–25 stats into the actual combat numbers, using the
// base + perPoint formulas in tuning.js. Used by the Fighter in the real
// game AND by the sim.js balance harness, so the two can never disagree.
// Deliberately Phaser-free so it runs in plain Node.
export function deriveStats(character) {
  const s = character.stats
  const d = T.derive
  const isBrawler = character.archetype === 'brawler'
  const ranged = character.archetype === 'blaster'

  const potencyStat = character.special.scales === 'frc' ? s.frc : s.str

  return {
    archetype: character.archetype,
    ranged,
    armor: character.armor ? d.armorFlat.base + d.armorFlat.perDef * s.def : 0,

    maxHp: Math.round(
      d.hp.base + d.hp.perDef * s.def + d.hp.perStr * s.str + (isBrawler ? d.hp.brawlerBonus : 0),
    ),
    damage:
      (d.meleeDamage.base + d.meleeDamage.perStr * s.str) * (isBrawler ? d.brawlerDamageMult : 1),
    boltDamage: d.boltDamage.base + d.boltDamage.perStr * s.str,
    moveSpeed: d.moveSpeed.base + d.moveSpeed.perSpd * s.spd,
    attackCooldownMs: d.attackCooldownMs.base + d.attackCooldownMs.perSpd * s.spd,
    staminaCost: Math.round(
      T.attack.staminaCost * (d.staminaCostMult.base + d.staminaCostMult.perSpd * s.spd),
    ),
    knockback: d.knockback.base + d.knockback.perStr * s.str,
    meterGainMult: d.meterGainMult.base + d.meterGainMult.perFrc * s.frc,

    // Defensive kit numbers — which ones apply depends on the archetype.
    blockMult: isBrawler
      ? d.braceMult.base + d.braceMult.perDef * s.def
      : d.blockMult.base + d.blockMult.perDef * s.def,
    deflectWindowMs: d.deflectWindowMs.base + d.deflectWindowMs.perDef * s.def,
    dodgeIframesMs: d.dodgeIframesMs.base + d.dodgeIframesMs.perDef * s.def,
    dodgeCooldownMs: d.dodgeCooldownMs.base + d.dodgeCooldownMs.perSpd * s.spd,

    potency: d.specialPotency.base + d.specialPotency.perStat * potencyStat,
  }
}

// A character's special config = template defaults overridden by any
// numbers set on the character's special entry in characters.js.
export function specialConfig(character) {
  return { ...T.templates[character.special.template], ...character.special }
}
