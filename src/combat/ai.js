import { TUNING as T } from './tuning.js'

// Phase 1 sparring partner: re-plans a few times per second with simple
// rules and plenty of randomness. Deliberately beatable — the real
// Jedi-rank brains arrive in Phase 3. Produces the same intents object as
// the keyboard/touch input, so the Fighter can't tell the difference.
export class SparAI {
  constructor() {
    this.clock = 0
    this.nextDecision = 0
    this.plan = 'approach' // approach | idle | retreat
    this.defendUntil = 0
    this.queued = { attack: false, special: false, jump: false }
  }

  read(dtMs, self, opponent) {
    this.clock += dtMs
    const dist = Math.abs(opponent.rect.x - self.rect.x)
    const inRange = dist < 100

    if (this.clock >= this.nextDecision) {
      this.nextDecision = this.clock + 250 + Math.random() * 350
      const r = Math.random()
      this.plan = r < 0.55 ? 'approach' : r < 0.78 ? 'idle' : 'retreat'

      // Occasionally react to the player's swing by blocking for a moment.
      if (opponent.swinging && Math.random() < 0.25) this.defendUntil = this.clock + 500

      if (inRange && Math.random() < 0.5 && self.stamina >= T.attack.staminaCost) {
        this.queued.attack = true
      }
      if (inRange && self.specialReady && Math.random() < 0.35) this.queued.special = true
      if (Math.random() < 0.06) this.queued.jump = true
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

    if (this.plan === 'approach' && dist > 70) {
      if (towards < 0) intents.left = true
      else intents.right = true
    } else if (this.plan === 'retreat') {
      if (towards < 0) intents.right = true
      else intents.left = true
    }

    return intents
  }
}
