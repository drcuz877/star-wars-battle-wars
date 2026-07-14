// ============================================================================
// STAR WARS BATTLE WARS — THE AI DIFFICULTY FILE
//
// Four "Jedi rank" difficulty tiers. Every tier fights with the SAME
// character stats from characters.js — only these numbers change. Edit a
// number, save, push; live ~1 minute later, same workflow as characters.js.
//
// What each field means:
//   reactionMs             How fast the AI notices things and re-plans.
//                          Also the delay between an opponent starting an
//                          attack and the AI deciding whether to defend it —
//                          lower = faster reflexes.
//   defendRate              0–1 chance the AI actually defends once its
//                          reaction time elapses after noticing an attack.
//   defendHoldMs            How long (ms) the AI holds its defend button
//                          once it decides to use it.
//   attackChance            0–1 chance per decision to attack when in range
//                          and able to afford it.
//   openingAttackChance     Used instead of attackChance when
//                          punishDrainedStamina is true and the opponent's
//                          stamina can't cover their own attack right now.
//   punishDrainedStamina    If true, the AI presses the advantage (closes
//                          distance + attacks near-certainly) the moment
//                          the opponent can't afford to swing back. This is
//                          what closes the jump-dodge/attack-timing
//                          loophole from the Phase 2 checkpoint.
//   specialChance           0–1 chance per decision to use a charged
//                          special, rolled whenever savesSpecial is false,
//                          or as a small fallback when it's true.
//   openingSpecialChance    Used instead of specialChance when savesSpecial
//                          is true and the opponent is stunned or
//                          stamina-drained (an "opening").
//   savesSpecial            If true, mostly holds a charged special until
//                          an opening appears instead of firing it whenever
//                          ready.
//   jumpChance               0–1 chance per decision to hop.
//   approachBias             Only used when spacing is 'loose': rough
//                          chance to choose closing the distance over
//                          holding/backing off on a neutral decision.
//   spacing                  'loose' = casual, some randomness (lower
//                          tiers). 'tight' = archetype-optimal: saber
//                          users close hard and stay close, blaster users
//                          hold their ideal poking range with little
//                          wasted movement.
//   staminaCautionMult       null = never backs off for its own stamina
//                          (Initiate: mashes till empty). A number means it
//                          starts backing off once its stamina drops below
//                          (attack stamina cost × this multiplier) — higher
//                          = more cautious, earlier retreat.
//   baitAttacks              Jedi Master only: sometimes hovers right at
//                          the edge of its range instead of closing, to
//                          lure a whiffed swing it can then punish.
// ============================================================================

export const AI_TIERS = [
  {
    id: 'initiate',
    label: 'Initiate',
    blurb: 'Easy — great for a first fight.',
    reactionMs: 650,
    defendRate: 0.05,
    defendHoldMs: 350,
    attackChance: 0.3,
    openingAttackChance: 0.3,
    punishDrainedStamina: false,
    specialChance: 0.15,
    openingSpecialChance: 0.15,
    savesSpecial: false,
    jumpChance: 0.06,
    approachBias: 0.5,
    spacing: 'loose',
    staminaCautionMult: null,
    baitAttacks: false,
  },
  {
    id: 'padawan',
    label: 'Padawan',
    blurb: 'Learning the ropes.',
    reactionMs: 400,
    defendRate: 0.25,
    defendHoldMs: 400,
    attackChance: 0.45,
    openingAttackChance: 0.45,
    punishDrainedStamina: false,
    specialChance: 0.3,
    openingSpecialChance: 0.3,
    savesSpecial: false,
    jumpChance: 0.06,
    approachBias: 0.55,
    spacing: 'loose',
    staminaCautionMult: 1.0,
    baitAttacks: false,
  },
  {
    id: 'jedi-knight',
    label: 'Jedi Knight',
    blurb: 'Sharp reflexes — punishes mistakes.',
    reactionMs: 250,
    defendRate: 0.5,
    defendHoldMs: 450,
    attackChance: 0.55,
    openingAttackChance: 0.9,
    punishDrainedStamina: true,
    specialChance: 0.15,
    openingSpecialChance: 0.8,
    savesSpecial: true,
    jumpChance: 0.05,
    approachBias: 0.6,
    spacing: 'loose',
    staminaCautionMult: 1.3,
    baitAttacks: false,
  },
  {
    id: 'jedi-master',
    label: 'Jedi Master',
    blurb: 'Near-perfect. Bring your A-game.',
    reactionMs: 140,
    defendRate: 0.75,
    defendHoldMs: 500,
    attackChance: 0.6,
    openingAttackChance: 0.95,
    punishDrainedStamina: true,
    specialChance: 0.1,
    openingSpecialChance: 0.95,
    savesSpecial: true,
    jumpChance: 0.04,
    approachBias: 0.65,
    spacing: 'tight',
    staminaCautionMult: 1.6,
    baitAttacks: true,
  },
]

export const DEFAULT_TIER_ID = 'initiate'

export function tierById(id) {
  return AI_TIERS.find((t) => t.id === id) ?? AI_TIERS.find((t) => t.id === DEFAULT_TIER_ID)
}
