// Headless balance harness — no Phaser, runs in plain Node:
//   node src/combat/sim.js               round-robin, 60 fights per pair
//   node src/combat/sim.js --fights 200  more fights = steadier numbers
//   node src/combat/sim.js --pair vader padme   drill into one matchup
//
// Simulates simplified 1v1 duels using the SAME derived stats and tuning
// as the real game (src/combat/derive.js), with SparAI-like behavior:
// close/kite to range, attack on cooldown, block/dodge reactions, specials
// on a full meter. It approximates real-time play — use it to sanity-check
// that favorites usually win and stat edits don't wreck the balance,
// then confirm feel by actually playing.
import { CHARACTERS, overall, validateCharacters } from '../data/characters.js'
import { deriveStats, specialConfig } from './derive.js'
import { TUNING as T } from './tuning.js'

validateCharacters()

const DT = 0.05 // seconds per tick
const JUMP_EVADE = 0.12 // chance a bolt is hopped over
const BLOCK_RATE = 0.25 // chance a melee-kit defender is blocking when hit
const TIMED_BLOCK = 0.4 // fraction of saber blocks that are timed deflects
const DODGE_RATE = 0.28 // chance a blaster-kit defender dodges a hit

const vary = (dmg) => dmg * (1 + (Math.random() * 2 - 1) * T.variance)

function makeSide(character) {
  return {
    c: character,
    d: deriveStats(character),
    cfg: specialConfig(character),
    hp: 0,
    stam: T.fighter.maxStamina,
    meter: 0,
    x: 0,
    cd: 0,
    stun: 0,
    sinceAttack: 9,
    dodgeCd: 0,
    buffT: 0,
    dmgMult: 1,
    takenMult: 1,
    critNext: false,
    counterT: 0,
    barrierT: 0,
  }
}

// One attack landing attempt, mirroring Fighter.applyHit's rules.
function resolveHit(att, def, dmg, { melee = false, sure = false, stun = 0.26, noMeter = false } = {}) {
  if (def.barrierT > 0) return
  if (!melee && !sure && Math.random() < JUMP_EVADE) return // hopped the bolt

  const defMeleeKit = def.d.archetype !== 'blaster'
  if (!sure && !defMeleeKit && def.dodgeCd <= 0 && Math.random() < DODGE_RATE) {
    def.dodgeCd = def.d.dodgeCooldownMs / 1000
    return
  }
  if (def.counterT > 0 && !sure) {
    // High Ground: melee is negated and thrown back; bolts reflect too.
    def.counterT = 0
    resolveHit(def, att, melee ? def.counterReflect : dmg, { stun: 0.35 })
    return
  }

  let blocked = false
  let crit = false
  dmg = vary(dmg) * att.dmgMult * def.takenMult
  if (att.critNext) {
    crit = true
    att.critNext = false
    dmg *= T.templates.buff.critMult
  }
  if (!sure && !crit && defMeleeKit && Math.random() < BLOCK_RATE) {
    // Timed saber blocks deflect bolts back at the shooter.
    if (!melee && def.d.archetype === 'saber' && Math.random() < TIMED_BLOCK) {
      resolveHit(def, att, dmg, {})
      return
    }
    blocked = true
    dmg *= def.d.blockMult
  }
  if (!crit) dmg -= def.d.armor
  dmg = Math.max(1, Math.round(dmg))

  def.hp -= dmg
  def.stun = Math.max(def.stun, blocked ? 0.09 : stun)
  if (!noMeter) {
    att.meter = Math.min(
      T.fighter.maxSpecial,
      att.meter +
        (blocked ? T.attack.meterGainOnBlocked : T.attack.meterGainOnHit * att.d.meterGainMult),
    )
  }
}

function fireSpecial(att, def, dist) {
  const cfg = att.cfg
  const P = att.d.potency
  att.meter = 0
  switch (cfg.template) {
    case 'beam': {
      const ticks = Math.floor(cfg.durationMs / cfg.tickMs)
      if (dist <= cfg.range) {
        for (let i = 0; i < ticks; i++) {
          if (Math.random() < 0.7) resolveHit(att, def, cfg.tickDamage * P, { stun: 0.15, noMeter: true })
        }
      }
      att.cd = Math.max(att.cd, cfg.durationMs / 1000)
      break
    }
    case 'grip':
      if (dist <= cfg.range) {
        resolveHit(att, def, cfg.damage * P, { stun: cfg.stunMs / 1000, noMeter: true })
        if (cfg.followUpBolt) resolveHit(att, def, att.d.boltDamage * 1.4, { noMeter: true })
      }
      break
    case 'projectile':
      for (let i = 0; i < cfg.count; i++) resolveHit(att, def, cfg.damage * P, { noMeter: true })
      break
    case 'buff':
      if (cfg.critNext) att.critNext = true
      else {
        att.buffT = cfg.durationMs / 1000
        att.dmgMult = 1 + (cfg.damageMult - 1) * P
        att.takenMult = 1 - (1 - cfg.damageTakenMult) * P
      }
      break
    case 'heal':
      att.hp = Math.min(att.d.maxHp, att.hp + cfg.hp * P)
      att.stam = Math.min(T.fighter.maxStamina, att.stam + cfg.stamina)
      if (cfg.barrierMs) att.barrierT = cfg.barrierMs / 1000
      break
    case 'dash':
      if (dist <= 220) {
        const hitDamage = cfg.hitDamage ?? T.templates.dash.hitDamage
        for (let i = 0; i < cfg.hits; i++) {
          // Knockback interrupts chains: later hits aren't guaranteed.
          if (i > 0 && Math.random() < 0.3) break
          resolveHit(att, def, hitDamage * P, { melee: true, stun: 0.22, noMeter: true })
        }
      }
      att.cd = Math.max(att.cd, cfg.durationMs / 1000)
      break
    case 'counter':
      att.counterT = cfg.stanceMs / 1000
      att.counterReflect = cfg.reflectDamage * P
      break
    case 'flurry':
      if (dist <= 120) {
        for (let i = 0; i < cfg.hits; i++) {
          if (i > 0 && Math.random() < 0.3) break
          resolveHit(att, def, cfg.hitDamage * P, { melee: true, stun: 0.19, noMeter: true })
        }
      }
      att.cd = Math.max(att.cd, (cfg.hits * cfg.rehitMs) / 1000)
      break
    case 'sureShot':
      resolveHit(att, def, cfg.damage * P, { sure: true, stun: 0.3, noMeter: true })
      break
  }
}

function actSide(self, other) {
  const dist = Math.abs(other.x - self.x)
  const dir = Math.sign(other.x - self.x) || 1
  const ranged = self.d.ranged

  if (self.stun > 0) {
    self.stun -= DT
    return
  }

  // Keep to the kit's preferred range. Backing away is slower than
  // advancing (T.fighter.backpedalMult) — same anti-kite rule as the real
  // game, so the sim doesn't over-credit blasters for out-running melee.
  if (ranged) {
    if (dist < 200) self.x -= dir * self.d.moveSpeed * T.fighter.backpedalMult * DT
    else if (dist > 430) self.x += dir * self.d.moveSpeed * DT
  } else if (dist > 70) {
    self.x += dir * self.d.moveSpeed * DT
  }
  self.x = Math.max(30, Math.min(T.arena.width - 30, self.x))

  const attackRange = ranged ? 440 : 100
  if (dist <= attackRange && self.cd <= 0) {
    if (self.meter >= T.fighter.maxSpecial) {
      fireSpecial(self, other, dist)
      self.sinceAttack = 0
      self.cd = Math.max(self.cd, 0.5)
    } else if (self.stam >= self.d.staminaCost) {
      resolveHit(self, other, ranged ? self.d.boltDamage : self.d.damage, { melee: !ranged })
      self.stam -= self.d.staminaCost
      self.sinceAttack = 0
      self.cd = (T.attack.windupMs + T.attack.activeMs + self.d.attackCooldownMs) / 1000
    }
  }
}

export function duel(charA, charB) {
  const a = makeSide(charA)
  const b = makeSide(charB)
  // Legendary-duel HP bonus, same rule as BattleScene.
  if (overall(charA) >= T.epicDuel.minOvr && overall(charB) >= T.epicDuel.minOvr) {
    a.d.maxHp = Math.round(a.d.maxHp * T.epicDuel.hpMult)
    b.d.maxHp = Math.round(b.d.maxHp * T.epicDuel.hpMult)
  }
  a.hp = a.d.maxHp
  b.hp = b.d.maxHp
  a.x = 300
  b.x = 660

  for (let t = 0; t < T.round.timeSeconds; t += DT) {
    for (const s of [a, b]) {
      s.cd -= DT
      s.dodgeCd -= DT
      s.barrierT -= DT
      s.sinceAttack += DT
      if (s.buffT > 0) {
        s.buffT -= DT
        if (s.buffT <= 0) {
          s.dmgMult = 1
          s.takenMult = 1
        }
      }
      if (s.counterT > 0) s.counterT -= DT
      if (s.sinceAttack > T.stamina.regenDelayMs / 1000) {
        s.stam = Math.min(T.fighter.maxStamina, s.stam + T.stamina.regenPerSecond * DT)
      }
    }
    // Alternate initiative so neither side always swings first.
    if (Math.random() < 0.5) {
      actSide(a, b)
      if (b.hp > 0) actSide(b, a)
    } else {
      actSide(b, a)
      if (a.hp > 0) actSide(a, b)
    }
    if (a.hp <= 0 || b.hp <= 0) break
  }

  if (a.hp <= 0 && b.hp <= 0) return Math.random() < 0.5 ? charA : charB
  if (b.hp <= 0) return charA
  if (a.hp <= 0) return charB
  return a.hp / a.d.maxHp >= b.hp / b.d.maxHp ? charA : charB // timeout: HP% wins
}

function winRate(charA, charB, fights) {
  let wins = 0
  for (let i = 0; i < fights; i++) if (duel(charA, charB) === charA) wins++
  return wins / fights
}

// ------------------------------- reporting --------------------------------

function pearson(xs, ys) {
  const n = xs.length
  const mx = xs.reduce((s, v) => s + v, 0) / n
  const my = ys.reduce((s, v) => s + v, 0) / n
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    dx += (xs[i] - mx) ** 2
    dy += (ys[i] - my) ** 2
  }
  return num / Math.sqrt(dx * dy)
}

const args = process.argv.slice(2)
const fights = args.includes('--fights') ? Number(args[args.indexOf('--fights') + 1]) : 60

if (args.includes('--pair')) {
  const i = args.indexOf('--pair')
  const a = CHARACTERS.find((c) => c.id === args[i + 1])
  const b = CHARACTERS.find((c) => c.id === args[i + 2])
  if (!a || !b) {
    console.error('Unknown id. Valid ids:', CHARACTERS.map((c) => c.id).join(', '))
    process.exit(1)
  }
  const n = Math.max(fights, 500)
  const rate = winRate(a, b, n)
  console.log(
    `${a.name} (OVR ${overall(a)}) vs ${b.name} (OVR ${overall(b)}) over ${n} fights:\n` +
      `  ${a.name} wins ${(rate * 100).toFixed(1)}%`,
  )
  process.exit(0)
}

console.log(`Round-robin: ${CHARACTERS.length} characters, ${fights} fights per pair...\n`)

const totals = new Map(CHARACTERS.map((c) => [c.id, 0]))
const diffs = []
const rates = []
const upsets = []

for (let i = 0; i < CHARACTERS.length; i++) {
  for (let j = i + 1; j < CHARACTERS.length; j++) {
    const a = CHARACTERS[i]
    const b = CHARACTERS[j]
    const rate = winRate(a, b, fights)
    totals.set(a.id, totals.get(a.id) + rate)
    totals.set(b.id, totals.get(b.id) + (1 - rate))
    diffs.push(overall(a) - overall(b))
    rates.push(rate)
    const [hi, lo, hiRate] = overall(a) >= overall(b) ? [a, b, rate] : [b, a, 1 - rate]
    if (overall(hi) - overall(lo) >= 8 && hiRate < 0.5) {
      upsets.push(`${lo.name} (${overall(lo)}) beats ${hi.name} (${overall(hi)}) ${(100 - hiRate * 100).toFixed(0)}% of the time`)
    }
  }
}

const opponents = CHARACTERS.length - 1
const table = CHARACTERS.map((c) => ({
  name: c.name,
  ovr: overall(c),
  arch: c.archetype,
  win: (totals.get(c.id) / opponents) * 100,
})).sort((x, y) => y.ovr - x.ovr)

console.log('  OVR  WIN%   CHARACTER')
for (const row of table) {
  console.log(
    `  ${String(row.ovr).padStart(3)}  ${row.win.toFixed(1).padStart(5)}   ${row.name} (${row.arch})`,
  )
}

console.log(`\nOVR-difference vs win-rate correlation: ${pearson(diffs, rates).toFixed(3)}`)
console.log('  (want strongly positive — favorites usually win, never always)')

const vader = CHARACTERS.find((c) => c.id === 'vader')
const padme = CHARACTERS.find((c) => c.id === 'padme')
console.log(`\nVader vs Padmé: Vader wins ${(winRate(vader, padme, 400) * 100).toFixed(1)}% of 400`)

if (upsets.length) {
  console.log(`\nFlagged: lower-rated character favored despite an 8+ OVR gap:`)
  for (const u of upsets) console.log(`  - ${u}`)
} else {
  console.log('\nNo inverted matchups (8+ OVR gap with the underdog favored).')
}
