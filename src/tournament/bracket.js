// Pure tournament bracket logic. No Phaser, no side effects.
// All functions are deterministic given an RNG, seeded or not.
// State shape is defined in architecture.md §4.

import { CHARACTERS, overall } from '../data/characters.js'

// ============================================================================
// PROBABILITY & SIMULATION
// ============================================================================

// Win chance for charA vs charB. Favorites usually win, but upsets happen.
// ~10% chance the underdog pulls it off, even against a huge gap.
export function winProbability(charA, charB) {
  const SPREAD = 12 // OVR gap for ~1:3 odds
  const UPSET_FLOOR = 0.1 // even the biggest favorite loses ~10%

  const gap = overall(charA) - overall(charB)
  const p = 1 / (1 + Math.pow(10, -gap / SPREAD))
  return Math.min(1 - UPSET_FLOOR, Math.max(UPSET_FLOOR, p))
}

// One simulated match. Returns the winner (charA or charB).
export function simulateMatch(charA, charB, rng = Math.random) {
  return rng() < winProbability(charA, charB) ? charA : charB
}

// ============================================================================
// BRACKET CREATION
// ============================================================================

// Fisher-Yates shuffle in-place.
function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Build an empty bracket structure: rounds[r] = array of (4/2/1) matches.
// Each match is { aSeed, bSeed, winnerSeed: null, played: false }.
function createRounds() {
  return [
    Array(8)
      .fill(null)
      .map((_, m) => ({ aSeed: 2 * m, bSeed: 2 * m + 1, winnerSeed: null, played: false })),
    Array(4)
      .fill(null)
      .map(() => ({ aSeed: null, bSeed: null, winnerSeed: null, played: false })),
    Array(2)
      .fill(null)
      .map(() => ({ aSeed: null, bSeed: null, winnerSeed: null, played: false })),
    [{ aSeed: null, bSeed: null, winnerSeed: null, played: false }],
  ]
}

// Create a fresh tournament. Draws 15 distinct others, shuffles all 16 into slots.
export function createTournament(playerId, difficultyId, rng = Math.random) {
  const player = CHARACTERS.find((c) => c.id === playerId)
  if (!player) throw new Error(`Unknown player character: ${playerId}`)

  const others = shuffle(
    CHARACTERS.filter((c) => c.id !== playerId).map((c) => c.id),
    rng,
  ).slice(0, 15)
  const allIds = shuffle([playerId, ...others], rng)

  const playerSlot = allIds.indexOf(playerId)

  return {
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),

    playerId,
    difficulty: difficultyId,
    status: 'active',
    championSeed: null,
    eliminatedRound: null,

    seeds: allIds,
    playerSlot,
    currentRound: 0,
    rounds: createRounds(),
  }
}

// ============================================================================
// QUERIES
// ============================================================================

// The match containing the player's slot in the current round.
// null if the player has no pending match (already eliminated or advanced
// past this round).
export function playerMatch(state) {
  if (state.status !== 'active') return null
  const { playerSlot } = state
  const round = state.rounds[state.currentRound]
  return round.find((m) => m.aSeed === playerSlot || m.bSeed === playerSlot) || null
}

// The character id the player is facing in their current match.
export function playerOpponentId(state) {
  const match = playerMatch(state)
  if (!match) return null
  const opp = match.aSeed === state.playerSlot ? match.bSeed : match.aSeed
  return opp !== null ? state.seeds[opp] : null
}

// True if the tournament is over (win or lose).
export function isOver(state) {
  return state.status !== 'active'
}

// True if the player won it all.
export function isChampion(state) {
  return state.status === 'champion'
}

// The character id of the final champion (player or AI).
export function championId(state) {
  return state.championSeed !== null ? state.seeds[state.championSeed] : null
}

// Human-readable round names.
export function roundName(roundIndex) {
  return ['Round of 16', 'Quarterfinal', 'Semifinal', 'Final'][roundIndex] || '?'
}

// The character id at a given seed slot.
export function competitorId(state, seedIndex) {
  return state.seeds[seedIndex] || null
}

// ============================================================================
// SIMULATION
// ============================================================================

// Simulate all unplayed matches in a given round. Feed winners into the
// next round's competitor slots (aSeed/bSeed).
function simulateRound(state, roundIndex, rng = Math.random) {
  if (roundIndex >= 4) return state // no round 4

  const round = state.rounds[roundIndex]
  const nextRound = roundIndex < 3 ? state.rounds[roundIndex + 1] : null

  for (let m = 0; m < round.length; m++) {
    const match = round[m]
    if (match.played || match.winnerSeed !== null) continue // already done

    const charA = CHARACTERS.find((c) => c.id === state.seeds[match.aSeed])
    const charB = CHARACTERS.find((c) => c.id === state.seeds[match.bSeed])
    if (!charA || !charB) continue // shouldn't happen

    const winner = simulateMatch(charA, charB, rng)
    match.winnerSeed = winner === charA ? match.aSeed : match.bSeed
    match.played = true

    // Feed into next round's competitor slot.
    if (nextRound) {
      const slotInNextRound = Math.floor(m / 2)
      const isFirstOfPair = m % 2 === 0
      if (isFirstOfPair) {
        nextRound[slotInNextRound].aSeed = match.winnerSeed
      } else {
        nextRound[slotInNextRound].bSeed = match.winnerSeed
      }
    }
  }

  return state
}

// Simulate all remaining rounds until a champion is crowned.
function simulateRemainder(state, rng = Math.random) {
  // Finish the current round if there are unplayed matches.
  simulateRound(state, state.currentRound, rng)

  // Simulate rounds forward from currentRound+1 to the Final.
  for (let r = state.currentRound + 1; r < 4; r++) {
    simulateRound(state, r, rng)
  }

  // Champion is the winner of the Final (rounds[3][0]).
  const final = state.rounds[3][0]
  state.championSeed = final.winnerSeed
  state.updatedAt = Date.now()

  return state
}

// ============================================================================
// MUTATION: RECORD PLAYER RESULT
// ============================================================================

// Record the player's match result. Handles win and loss paths.
export function recordPlayerResult(state, playerWon, rng = Math.random) {
  if (state.status !== 'active') return state // tournament over

  const match = playerMatch(state)
  if (!match) return state // no pending match

  const round = state.rounds[state.currentRound]
  const nextRound = state.currentRound < 3 ? state.rounds[state.currentRound + 1] : null

  // Mark the player's match with the result.
  match.winnerSeed = playerWon ? state.playerSlot : (match.aSeed === state.playerSlot ? match.bSeed : match.aSeed)
  match.played = true

  // Feed the player's result into the next round.
  if (nextRound) {
    const playerMatchIdx = round.indexOf(match)
    const nextSlot = Math.floor(playerMatchIdx / 2)
    const isFirst = playerMatchIdx % 2 === 0
    if (isFirst) nextRound[nextSlot].aSeed = match.winnerSeed
    else nextRound[nextSlot].bSeed = match.winnerSeed
  }

  if (!playerWon) {
    // Loss: mark eliminated and simulate the entire remaining bracket.
    state.status = 'eliminated'
    state.eliminatedRound = state.currentRound
    simulateRemainder(state, rng)
  } else {
    // Win: simulate the rest of this round.
    simulateRound(state, state.currentRound, rng)

    if (state.currentRound === 3) {
      // Won the Final.
      state.status = 'champion'
      state.championSeed = state.playerSlot
    } else {
      // Advance to the next round.
      state.currentRound++
    }
  }

  state.updatedAt = Date.now()
  return state
}
