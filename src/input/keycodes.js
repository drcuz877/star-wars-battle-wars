import Phaser from 'phaser'

// Reverse lookup built once from Phaser's own KeyCodes table, so a raw
// keydown event resolves to exactly the string name addKeys()/matching
// code elsewhere expects (e.g. 'LEFT', 'A', 'SPACE'). Shared by
// SettingsScene (remap capture) and ModeScene (Holocron combo detection).
const KEYCODE_NAMES = (() => {
  const map = {}
  for (const [name, code] of Object.entries(Phaser.Input.Keyboard.KeyCodes)) {
    if (!(code in map)) map[code] = name
  }
  return map
})()

export const nameForKeyEvent = (event) => KEYCODE_NAMES[event.keyCode] ?? null
