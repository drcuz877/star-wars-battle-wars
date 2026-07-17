import { loadJSON, saveJSON } from '../util/storage.js'

// Drew's default scheme (Phase 1). The S+A chord for Special stays a fixed
// secondary trigger — not exposed here — so remapping only ever touches
// the six primary actions.
export const DEFAULT_KEYMAP = {
  left: 'LEFT',
  right: 'RIGHT',
  jump: 'SPACE',
  attack: 'A',
  defend: 'D',
  special: 'W',
}

export const ACTION_LABELS = {
  left: 'MOVE LEFT',
  right: 'MOVE RIGHT',
  jump: 'JUMP',
  attack: 'ATTACK',
  defend: 'DEFEND',
  special: 'SPECIAL',
}

// Keys that stay reserved for menu navigation and can't be bound to a
// combat action.
export const RESERVED_KEYS = ['ESC', 'P']

export function getKeymap() {
  const saved = loadJSON('keymap', null)
  return saved ? { ...DEFAULT_KEYMAP, ...saved } : { ...DEFAULT_KEYMAP }
}

// Rebinding a key that's already in use swaps the two actions' keys, so no
// key is ever silently bound to two actions at once.
export function setBinding(action, keyName) {
  const map = getKeymap()
  const clash = Object.keys(map).find((a) => a !== action && map[a] === keyName)
  if (clash) map[clash] = map[action]
  map[action] = keyName
  saveJSON('keymap', map)
  return map
}

export function resetKeymap() {
  saveJSON('keymap', { ...DEFAULT_KEYMAP })
  return getKeymap()
}
