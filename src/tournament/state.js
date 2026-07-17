// Tournament state persistence via localStorage.
// Wraps the guarded storage.js helper so loss of storage doesn't crash.

import { loadJSON, saveJSON } from '../util/storage.js'

const STORAGE_KEY = 'tournament'

// Validate a raw saved object and migrate old versions forward. Returns a
// v2 state or null if the save is unusable. Pure — exported so the verify
// suite can unit-test migration without a browser's localStorage.
export function normalizeTournament(state) {
  if (!state) return null

  // v1 saves (Phase 5) are always single-player knockout tournaments; they
  // predate the format/stage fields. Upgrade in place so an in-progress
  // bracket survives the Phase 7 update.
  if (state.version === 1) {
    state = { ...state, version: 2, format: 'knockout', stage: 'knockout', rr: null, rrEliminated: false }
  }
  if (state.version !== 2) return null

  if (typeof state.playerId !== 'string') return null

  if (state.stage === 'roundrobin') {
    // Round-robin stage: needs valid pools; knockout fields are still null.
    const rr = state.rr
    if (
      !rr ||
      !Array.isArray(rr.pools) ||
      rr.pools.length === 0 ||
      !Number.isInteger(rr.matchday) ||
      !Number.isInteger(rr.playerPool) ||
      rr.playerPool < 0 ||
      rr.playerPool >= rr.pools.length ||
      !rr.pools.every((p) => Array.isArray(p.members) && Array.isArray(p.fixtures))
    ) {
      return null
    }
    return state
  }

  // Knockout stage (any format once the bracket exists).
  if (
    state.stage !== 'knockout' ||
    !Array.isArray(state.seeds) ||
    state.seeds.length !== 16 ||
    !Array.isArray(state.rounds) ||
    state.rounds.length !== 4
  ) {
    return null
  }
  return state
}

// Load the current tournament from localStorage. Returns null if none exists
// or the saved version is stale/invalid.
export function loadTournament() {
  return normalizeTournament(loadJSON(STORAGE_KEY, null))
}

// Save a tournament to localStorage.
export function saveTournament(state) {
  saveJSON(STORAGE_KEY, state)
}

// Clear the saved tournament (called on quit, champion, or when starting fresh).
export function clearTournament() {
  saveJSON(STORAGE_KEY, null)
}
