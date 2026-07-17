// Round-robin stage logic for Group Play and League formats (Phase 7).
// Pure logic, no Phaser, no side effects — same contract as bracket.js.
//
// Both formats are a round-robin stage that feeds the existing 16-slot
// knockout bracket in bracket.js:
//   Group Play:  7 groups of 4 (all 28 characters), everyone plays 3 group
//                matches; top 2 per group + the 2 best third-places = 16.
//   League:      2 divisions of 14, single round-robin (13 matchdays);
//                top 8 per division = 16.
// Once the stage completes, the state gains the same seeds/rounds fields a
// knockout tournament has and bracket.js takes over unchanged.

import { CHARACTERS, overall } from '../data/characters.js'
import { createRounds, simulateMatch, simulateKnockoutRemainder } from './bracket.js'

const GROUP_NAMES = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G']

// ============================================================================
// SCHEDULING (circle method)
// ============================================================================

// Fisher-Yates shuffle in-place (same as bracket.js's private copy).
function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Single round-robin fixtures for an even-sized member list via the circle
// method: n-1 matchdays, n/2 matches each, every pair meets exactly once.
// Returns fixtures[matchday] = [{ a, b, winnerId: null, played: false }].
function makeFixtures(members) {
  const n = members.length
  const rounds = []
  for (let r = 0; r < n - 1; r++) {
    const matches = []
    // Team n-1 is fixed; the rest rotate around it.
    matches.push(pairUp(members[n - 1], members[r % (n - 1)]))
    for (let i = 1; i < n / 2; i++) {
      const first = (r + i) % (n - 1)
      const second = (r - i + (n - 1)) % (n - 1)
      matches.push(pairUp(members[first], members[second]))
    }
    rounds.push(matches)
  }
  return rounds
}

function pairUp(a, b) {
  return { a, b, winnerId: null, played: false }
}

// ============================================================================
// TOURNAMENT CREATION
// ============================================================================

function createRRTournament(format, poolSize, poolNames, playerId, difficultyId, rng) {
  const player = CHARACTERS.find((c) => c.id === playerId)
  if (!player) throw new Error(`Unknown player character: ${playerId}`)

  const allIds = shuffle(CHARACTERS.map((c) => c.id), rng)
  const pools = []
  for (let p = 0; p < allIds.length / poolSize; p++) {
    const members = allIds.slice(p * poolSize, (p + 1) * poolSize)
    pools.push({ name: poolNames[p], members, fixtures: makeFixtures(members) })
  }

  return {
    version: 2,
    format,
    createdAt: Date.now(),
    updatedAt: Date.now(),

    playerId,
    difficulty: difficultyId,
    status: 'active',
    stage: 'roundrobin',
    rrEliminated: false,

    rr: {
      pools,
      matchday: 0,
      playerPool: pools.findIndex((pool) => pool.members.includes(playerId)),
    },

    // Knockout fields, populated when the round-robin stage completes.
    seeds: null,
    playerSlot: null,
    currentRound: 0,
    rounds: null,
    championSeed: null,
    eliminatedRound: null,
  }
}

// Group Play: 7 groups of 4 covering all 28 characters.
export function createGroupTournament(playerId, difficultyId, rng = Math.random) {
  return createRRTournament('group', 4, GROUP_NAMES, playerId, difficultyId, rng)
}

// League: 2 divisions of 14 covering all 28 characters.
export function createLeagueTournament(playerId, difficultyId, rng = Math.random) {
  return createRRTournament('league', 14, ['Division 1', 'Division 2'], playerId, difficultyId, rng)
}

// ============================================================================
// QUERIES
// ============================================================================

// Total matchdays in the round-robin stage (3 for groups, 13 for league).
export function matchdayCount(state) {
  return state.rr ? state.rr.pools[0].fixtures.length : 0
}

// True while the tournament is in its round-robin stage.
export function inRoundRobin(state) {
  return state.stage === 'roundrobin'
}

// The pool (group/division) containing the player.
export function playerPool(state) {
  return state.rr ? state.rr.pools[state.rr.playerPool] : null
}

// The player's fixture on the current matchday, or null if the stage is over.
export function playerRRMatch(state) {
  if (!inRoundRobin(state) || state.status !== 'active') return null
  const pool = playerPool(state)
  const day = pool.fixtures[state.rr.matchday]
  if (!day) return null
  return day.find((fx) => fx.a === state.playerId || fx.b === state.playerId) || null
}

// The character id the player faces on the current matchday.
export function playerRROpponentId(state) {
  const fx = playerRRMatch(state)
  if (!fx) return null
  return fx.a === state.playerId ? fx.b : fx.a
}

// ============================================================================
// STANDINGS
// ============================================================================

function charById(id) {
  return CHARACTERS.find((c) => c.id === id)
}

// Head-to-head wins among a subset of members, from a flat fixture list.
function winsAmong(ids, fixtures) {
  const wins = Object.fromEntries(ids.map((id) => [id, 0]))
  for (const fx of fixtures) {
    if (fx.played && ids.includes(fx.a) && ids.includes(fx.b)) wins[fx.winnerId]++
  }
  return wins
}

// Standings rows for one pool, sorted best-first.
// Tiebreakers: wins → head-to-head wins among the tied → OVR. There are no
// draws, so points are simply 3 per win (soccer-style, for the table).
export function poolStandings(state, poolIndex) {
  const pool = state.rr.pools[poolIndex]
  const flat = pool.fixtures.flat()

  const rows = pool.members.map((id) => {
    const mine = flat.filter((fx) => fx.played && (fx.a === id || fx.b === id))
    const wins = mine.filter((fx) => fx.winnerId === id).length
    return { id, played: mine.length, wins, losses: mine.length - wins, pts: wins * 3 }
  })

  // Sort by wins, breaking ties head-to-head, then by OVR.
  rows.sort((r1, r2) => {
    if (r2.wins !== r1.wins) return r2.wins - r1.wins
    const tied = rows.filter((r) => r.wins === r1.wins).map((r) => r.id)
    const h2h = winsAmong(tied, flat)
    if (h2h[r2.id] !== h2h[r1.id]) return h2h[r2.id] - h2h[r1.id]
    return overall(charById(r2.id)) - overall(charById(r1.id))
  })
  return rows
}

// ============================================================================
// KNOCKOUT SEEDING
// ============================================================================

// Standard 16-seed bracket order (0-indexed ranks per slot): 1v16, 8v9,
// 5v12, 4v13 in the top half; 6v11, 3v14, 7v10, 2v15 in the bottom — so the
// top two ranked qualifiers can only meet in the Final.
const BRACKET_ORDER = [0, 15, 7, 8, 4, 11, 3, 12, 5, 10, 2, 13, 6, 9, 1, 14]

// Best-effort pass to keep same-pool qualifiers from an immediate R16
// rematch: for each first-round pair that shares a pool, swap its second
// slot with a neighboring match's second slot when that resolves the clash.
// Exported for direct unit-testing.
export function resolvePoolClashes(slots, poolOf) {
  const clash = (m) => poolOf[slots[2 * m]] === poolOf[slots[2 * m + 1]]
  for (let m = 0; m < 8; m++) {
    if (!clash(m)) continue
    for (let other = 0; other < 8; other++) {
      if (other === m) continue
      const mine = slots[2 * m + 1]
      const theirs = slots[2 * other + 1]
      // Only swap if it fixes this match without creating a new clash.
      if (poolOf[slots[2 * m]] !== poolOf[theirs] && poolOf[slots[2 * other]] !== poolOf[mine]) {
        slots[2 * m + 1] = theirs
        slots[2 * other + 1] = mine
        break
      }
    }
  }
  return slots
}

// Place 16 ranked ids (best first) into bracket slots by standard order.
function seedSlots(ranked16) {
  const slots = new Array(16)
  for (let s = 0; s < 16; s++) slots[s] = ranked16[BRACKET_ORDER[s]]
  return slots
}

// Rank qualifiers out of the finished round-robin stage, best first.
function rankQualifiers(state) {
  const byPool = state.rr.pools.map((_, i) => poolStandings(state, i))
  const ovr = (row) => overall(charById(row.id))
  const better = (r1, r2) => r2.wins - r1.wins || ovr(r2) - ovr(r1)

  if (state.format === 'league') {
    // Interleave the two division tables by rank: D1#1, D2#1, D1#2, ...
    const ranked = []
    for (let place = 0; place < 8; place++) {
      const pair = [byPool[0][place], byPool[1][place]].sort(better)
      ranked.push(pair[0].id, pair[1].id)
    }
    return ranked
  }

  // Groups: 7 winners, then 7 runners-up, then the 2 best third-places —
  // each band sorted by wins then OVR.
  const winners = byPool.map((t) => t[0]).sort(better)
  const runnersUp = byPool.map((t) => t[1]).sort(better)
  const thirds = byPool.map((t) => t[2]).sort(better).slice(0, 2)
  return [...winners, ...runnersUp, ...thirds].map((row) => row.id)
}

// Map each qualifier id to its pool index (for the rematch-avoidance pass).
function poolIndexById(state) {
  const map = {}
  state.rr.pools.forEach((pool, i) => pool.members.forEach((id) => (map[id] = i)))
  return map
}

// ============================================================================
// MUTATION
// ============================================================================

// Simulate every unplayed fixture on the current matchday across all pools
// (the player's own fixture is expected to be recorded already).
function simulateMatchday(state, rng) {
  for (const pool of state.rr.pools) {
    for (const fx of pool.fixtures[state.rr.matchday]) {
      if (fx.played) continue
      const winner = simulateMatch(charById(fx.a), charById(fx.b), rng)
      fx.winnerId = winner.id
      fx.played = true
    }
  }
}

// Close out the round-robin stage: rank the 16 qualifiers, seed the knockout
// bracket, and either hand control to bracket.js (player qualified) or mark
// the player eliminated and simulate the whole knockout to crown a champion.
function finishRoundRobin(state, rng) {
  const ranked = rankQualifiers(state)
  let slots = seedSlots(ranked)
  if (state.format === 'group') slots = resolvePoolClashes(slots, poolIndexById(state))

  state.stage = 'knockout'
  state.seeds = slots
  state.playerSlot = slots.indexOf(state.playerId)
  state.currentRound = 0
  state.rounds = createRounds()

  if (state.playerSlot === -1) {
    // Player didn't survive the pool stage. No knockout matches to play.
    state.playerSlot = null
    state.status = 'eliminated'
    state.rrEliminated = true
    simulateKnockoutRemainder(state, rng)
  }
}

// Record the player's round-robin result, then simulate the rest of the
// matchday everywhere and advance. Completing the last matchday triggers the
// knockout transition. Losses never eliminate mid-stage — the table decides.
export function recordRRResult(state, playerWon, rng = Math.random) {
  const fx = playerRRMatch(state)
  if (!fx) return state

  fx.winnerId = playerWon ? state.playerId : (fx.a === state.playerId ? fx.b : fx.a)
  fx.played = true

  simulateMatchday(state, rng)
  state.rr.matchday++

  if (state.rr.matchday >= matchdayCount(state)) finishRoundRobin(state, rng)

  state.updatedAt = Date.now()
  return state
}
