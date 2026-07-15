import { TUNING as T } from '../../combat/tuning.js'
import { skyBands, ridge } from './draw.js'

// Hoth — fighting in the mouth of the Echo Base hangar: an ice-cave
// arch frames a blinding white snowfield outside. Ambient: snowfall.
// The dark arch across the top also keeps the HUD readable against
// what would otherwise be a white sky.
export const hoth = {
  id: 'hoth',
  name: 'Hoth — Echo Base',

  create(scene) {
    const W = T.arena.width
    const GY = T.arena.groundY
    const g = scene.add.graphics().setDepth(0)

    // The bright outside: pale sky over rolling snowfields.
    skyBands(g, 0, 0, W, GY, 0xb2c2d6, 0xeceff4)
    ridge(g, 0xd8e0ea, 1, 375, 14, 0.5, GY, 2.2)
    ridge(g, 0xc6d0dc, 1, 425, 10, 0.6, GY, 5.1)

    // Ice-cave frame we're standing inside: jagged arch + side walls.
    g.fillStyle(0x27303f, 1)
    g.fillRect(0, 0, W, 92) // cave ceiling band
    for (let x = 30; x < W; x += 74) {
      // icicles hanging off the ceiling, varied lengths
      g.fillTriangle(x - 13, 90, x + 13, 90, x, x % 148 === 30 ? 138 : 116)
    }
    g.fillStyle(0x27303f, 1) // side walls
    g.fillPoints([{ x: 0, y: 0 }, { x: 88, y: 0 }, { x: 56, y: GY }, { x: 0, y: GY }], true)
    g.fillPoints([{ x: W, y: 0 }, { x: W - 88, y: 0 }, { x: W - 56, y: GY }, { x: W, y: GY }], true)

    // Packed-snow hangar floor.
    g.fillStyle(0xc4cedc, 1)
    g.fillRect(0, GY, W, T.arena.height - GY)
    g.fillStyle(0xe8eef6, 0.9)
    g.fillRect(0, GY, W, 2.5)
    g.fillStyle(0x8e9cb0, 0.4)
    g.fillRect(0, GY + 28, W, 5)
    g.fillRect(0, GY + 50, W, 4)

    // Snowfall drifting through the hangar mouth.
    const flakes = []
    for (let i = 0; i < 26; i++) {
      flakes.push({
        c: scene.add
          .circle(Math.random() * W, Math.random() * GY, 0.8 + Math.random() * 1.4, 0xffffff, 0.5 + Math.random() * 0.4)
          .setDepth(4),
        v: 26 + Math.random() * 30,
        sway: Math.random() * Math.PI * 2,
      })
    }

    return {
      update(dtMs) {
        const dt = dtMs / 1000
        for (const f of flakes) {
          f.sway += dt * 1.5
          f.c.y += f.v * dt
          f.c.x += Math.sin(f.sway) * 12 * dt
          if (f.c.y > GY + 8) {
            f.c.y = 60
            f.c.x = Math.random() * W
          }
        }
      },
    }
  },
}
