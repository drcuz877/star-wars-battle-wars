import { CHARACTERS } from '../data/characters.js'
import { loadJSON, saveJSON } from '../util/storage.js'

// The Holocron (son's path, per the spec): a secret in-game stat editor.
// Edits mutate the shared CHARACTERS array in place — every scene already
// imports that same array/object references, so an override is picked up
// everywhere (Select, Battle, tournament sim, HUD) with no other code
// needing to change. Persisted as localStorage overrides on this device
// only; the deployed game and Drew's own edits to characters.js (the
// canon file) are untouched.

// Snapshot taken once, before any override can be applied, so "Restore
// Canon" always has the real original numbers to go back to.
const CANON = new Map(CHARACTERS.map((c) => [c.id, { ...c.stats }]))
const STAT_KEYS = ['str', 'spd', 'frc', 'def']

function clamp(v) {
  return Math.min(25, Math.max(0, Math.round(Number(v) || 0)))
}

export function getOverrides() {
  return loadJSON('holocronOverrides', {})
}

function saveOverrides(map) {
  saveJSON('holocronOverrides', map)
}

// Runs once at boot (main.js, after validateCharacters) so every scene
// sees overridden stats from the start, not just ones opened after a
// Holocron visit.
export function applyHolocronOverrides() {
  const overrides = getOverrides()
  for (const c of CHARACTERS) {
    const o = overrides[c.id]
    if (!o) continue
    for (const key of STAT_KEYS) {
      if (typeof o[key] === 'number') c.stats[key] = clamp(o[key])
    }
  }
}

export function isOverridden(characterId) {
  return !!getOverrides()[characterId]
}

export function setStat(characterId, key, value) {
  const character = CHARACTERS.find((c) => c.id === characterId)
  if (!character) return
  const clamped = clamp(value)
  character.stats[key] = clamped
  const overrides = getOverrides()
  overrides[characterId] = { ...overrides[characterId], [key]: clamped }
  saveOverrides(overrides)
}

export function restoreCanon() {
  saveOverrides({})
  for (const c of CHARACTERS) {
    const canon = CANON.get(c.id)
    if (canon) c.stats = { ...canon }
  }
}
