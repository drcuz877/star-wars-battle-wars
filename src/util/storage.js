// Small guarded localStorage helper — every call is wrapped so a private
// browsing tab, storage-disabled device, or quota error degrades to
// "nothing persists" instead of throwing. Use this (not raw localStorage
// calls) for anything that should survive a reload: last difficulty picked,
// and later, win/loss records, tournament wins, Holocron overrides.
const PREFIX = 'sw-battle-wars:'

export function loadJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // storage unavailable — silently no-op, game stays fully playable
  }
}
