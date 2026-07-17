import { loadJSON, saveJSON } from '../util/storage.js'

// Once discovered on a device, the Holocron stays reachable (a small
// permanent icon on the main menu) instead of making the son re-enter the
// secret combo every visit — the "secret" is finding it the first time.
export function isHolocronUnlocked() {
  return loadJSON('holocronUnlocked', false)
}

export function unlockHolocron() {
  saveJSON('holocronUnlocked', true)
}
