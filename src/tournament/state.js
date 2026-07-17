// Tournament state persistence via localStorage.
// Wraps the guarded storage.js helper so loss of storage doesn't crash.

import { loadJSON, saveJSON } from '../util/storage.js'

const STORAGE_KEY = 'tournament'

// Load the current tournament from localStorage. Returns null if none exists
// or the saved version is stale/invalid.
export function loadTournament() {
  const state = loadJSON(STORAGE_KEY, null)
  if (!state) return null

  // Version check: discard on mismatch.
  if (state.version !== 1) return null

  // Basic shape check.
  if (
    typeof state.playerId !== 'string' ||
    !Array.isArray(state.seeds) ||
    state.seeds.length !== 16 ||
    !Array.isArray(state.rounds) ||
    state.rounds.length !== 4
  ) {
    return null
  }

  return state
}

// Save a tournament to localStorage.
export function saveTournament(state) {
  saveJSON(STORAGE_KEY, state)
}

// Clear the saved tournament (called on quit, champion, or when starting fresh).
export function clearTournament() {
  saveJSON(STORAGE_KEY, null)
}
