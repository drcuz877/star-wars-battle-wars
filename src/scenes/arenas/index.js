import Phaser from 'phaser'
import { TUNING as T } from '../../combat/tuning.js'
import { tatooine } from './tatooine.js'
import { mustafar } from './mustafar.js'
import { throne } from './throne.js'
import { hoth } from './hoth.js'
import { cloudcity } from './cloudcity.js'

// Arena registry (Phase 4). An arena is cosmetic only — layered backdrop
// plus a light ambient update (embers, dust); the fight always happens on
// the same flat ground line, so balance is untouched. One is picked at
// random each match; a tournament seed can pick deterministically later.
//
// Each module exports { id, name, create(scene) }; create() draws the
// backdrop and returns a handle: { def, update(dtMs)? }.

export const ARENAS = [tatooine, mustafar, throne, hoth, cloudcity]

export function createArena(scene, id) {
  const def = ARENAS.find((a) => a.id === id) ?? Phaser.Utils.Array.GetRandom(ARENAS)
  const handle = def.create(scene) ?? {}
  handle.def = def

  // Quiet location tag, tucked into the ground band opposite the build stamp.
  scene.add
    .text(T.arena.width - 10, T.arena.height - 8, def.name.toUpperCase(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#ffffff',
    })
    .setOrigin(1, 1)
    .setAlpha(0.35)
    .setDepth(5)

  return handle
}
