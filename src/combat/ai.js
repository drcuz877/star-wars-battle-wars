import { TUNING as T } from './tuning.js'

// Data-driven Jedi-rank AI: one engine, four tiers (src/data/ai-tiers.js).
// Every tier fights with identical character stats — only reaction speed,
// defend rate, aggression, stamina awareness, and special timing change.
// Produces the same intents object as the keyboard/touch input, so the
// Fighter can't tell the difference.
export class TierAI {
  constructor(tier) {
    this.tier = tier
    this.clock = 0
    this.nextDecision = 0
    this.plan = 'approach' // approach | idle | retreat
    this.defendUntil = 0
    this.prevOpponentCooldown = 0
    this.prevOpponentSpecial = false
    this.pendingDefendAt = -1
    this.queued = { attack: false, special: false, jump: false }
  }

  read(dtMs, self, opponent) {
    this.clock += dtMs
    const tier = this.tier
    const dist = Math.abs(opponent.rect.x - self.rect.x)
    const ranged = self.d.ranged

    // --- Reactive defend: fires independently of the decision cadence below.
    // Detect the opponent COMMITTING to an attack. A rising edge on
    // `cooldown` (0 -> >0) catches both melee swings (startSwing) and
    // blaster bolts (fireBolt) — both set cooldown identically in
    // fighter.js, and blaster characters never set `swinging` true, so
    // watching `swinging` alone would leave the AI blind to bolts.
    // Specials don't touch `cooldown` at all, so they need their own edge
    // on `specialRun` going from empty to active.
    const opponentJustAttacked = this.prevOpponentCooldown === 0 && opponent.cooldown > 0
    const opponentJustSpecialed = !this.prevOpponentSpecial && !!opponent.specialRun
    if ((opponentJustAttacked || opponentJustSpecialed) && this.pendingDefendAt < 0) {
      this.pendingDefendAt = this.clock + tier.reactionMs
    }
    this.prevOpponentCooldown = opponent.cooldown
    this.prevOpponentSpecial = !!opponent.specialRun

    if (this.pendingDefendAt >= 0 && this.clock >= this.pendingDefendAt) {
      if (Math.random() < tier.defendRate) this.defendUntil = this.clock + tier.defendHoldMs
      this.pendingDefendAt = -1
    }

    // --- Decision loop: re-plan movement/attack/special/jump on the tier's
    // reaction cadence (with jitter so every fighter of the same tier
    // doesn't decide in lockstep).
    const selfCanAfford = self.stamina >= self.d.staminaCost
    const opponentDrained = opponent.stamina < opponent.d.staminaCost
    const opening = opponent.hitstun > 0 || opponentDrained
    const selfCautious =
      tier.staminaCautionMult != null && self.stamina < self.d.staminaCost * tier.staminaCautionMult

    if (this.clock >= this.nextDecision) {
      this.nextDecision = this.clock + tier.reactionMs * (0.75 + Math.random() * 0.5)

      if (selfCautious) {
        this.plan = 'retreat'
      } else if (tier.punishDrainedStamina && opponentDrained) {
        // Press the advantage while the opponent can't swing back — this is
        // what closes the jump-dodge/attack-timing loophole: it reads the
        // same stamina number the HUD bar shows the player, not hidden state.
        this.plan = 'approach'
      } else {
        this.plan = ranged
          ? this.planRanged(tier, dist)
          : this.planMelee(tier, dist, opponent.d.ranged)
      }

      const inRange = ranged ? dist < T.ai.rangedInRange : dist < T.ai.meleeInRange
      if (!selfCautious && inRange && selfCanAfford) {
        const attackChance =
          tier.punishDrainedStamina && opponentDrained ? tier.openingAttackChance : tier.attackChance
        if (Math.random() < attackChance) this.queued.attack = true
      }

      if (!selfCautious && inRange && self.specialReady) {
        const specialChance = tier.savesSpecial
          ? opening
            ? tier.openingSpecialChance
            : tier.specialChance
          : tier.specialChance
        if (Math.random() < specialChance) this.queued.special = true
      }

      if (Math.random() < tier.jumpChance) this.queued.jump = true
    }

    const towards = Math.sign(opponent.rect.x - self.rect.x) || 1
    const intents = {
      left: false,
      right: false,
      defend: this.clock < this.defendUntil,
      jumpPressed: this.queued.jump,
      attackPressed: this.queued.attack,
      specialPressed: this.queued.special,
    }
    this.queued = { attack: false, special: false, jump: false }

    if (this.plan === 'approach' && dist > T.ai.meleeStopDistance) {
      if (towards < 0) intents.left = true
      else intents.right = true
    } else if (this.plan === 'retreat') {
      if (towards < 0) intents.right = true
      else intents.left = true
    }

    return intents
  }

  planMelee(tier, dist, opponentRanged) {
    // Chasing a kiting blaster is the whole job: close the gap and stay
    // close, every tier. Difficulty still varies by reaction speed, defend
    // rate, and special timing — but no melee fighter should ever let a
    // shooter sit at range unpunished (that was the Cad-Bane-beats-Yoda bug).
    if (opponentRanged) {
      return dist > T.ai.meleeStopDistance ? 'approach' : 'idle'
    }
    if (tier.spacing === 'tight') {
      if (dist > T.ai.meleeInRange) return 'approach'
      // Bait: hover just outside striking distance to lure a whiffed swing.
      if (tier.baitAttacks && dist > T.ai.meleeStopDistance && Math.random() < 0.4) return 'idle'
      return dist > T.ai.meleeStopDistance ? 'approach' : 'idle'
    }
    const r = Math.random()
    if (r < tier.approachBias) return 'approach'
    if (r < tier.approachBias + 0.23) return 'idle'
    return 'retreat'
  }

  planRanged(tier, dist) {
    const near = T.ai.rangedKiteNear
    const far = T.ai.rangedKiteFar
    if (tier.spacing === 'tight') {
      if (dist < near) return 'retreat'
      if (dist > far) return 'approach'
      // Bait: a brief step back to draw out a wasted shot or dash.
      if (tier.baitAttacks && Math.random() < 0.3) return 'retreat'
      return 'idle'
    }
    const r = Math.random()
    if (dist < near) return r < 0.6 ? 'retreat' : 'idle'
    if (dist > far) return r < 0.6 ? 'approach' : 'idle'
    return r < 0.25 ? 'approach' : r < 0.75 ? 'idle' : 'retreat'
  }
}
