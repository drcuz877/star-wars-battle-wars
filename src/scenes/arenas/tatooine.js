import Phaser from 'phaser'
import { TUNING as T } from '../../combat/tuning.js'
import { skyBands, ridge } from './draw.js'

// Tatooine — desert at twin sunset. Layers, back to front: dusk-gradient
// sky with both suns low over the horizon, a far hazy dune line with a
// moisture-farm silhouette, a nearer darker dune line, then the sand the
// fight stands on. Ambient: thin dust drifting through on the wind.
export const tatooine = {
  id: 'tatooine',
  name: 'Tatooine — Twin Sunset',

  create(scene) {
    const W = T.arena.width
    const GY = T.arena.groundY
    const g = scene.add.graphics().setDepth(0)

    // Sky: deep dusk violet down to ember orange at the horizon.
    skyBands(g, 0, 0, W, GY, 0x2a1c40, 0xc0602e)

    // The twin suns, low and to the right, each with a soft additive halo.
    const sun = (x, y, r, color) => {
      scene.add
        .circle(x, y, r * 2.6, color, 0.16)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(0)
      scene.add.circle(x, y, r, color, 1).setDepth(0)
    }
    sun(640, 300, 30, 0xffd9a0)
    sun(724, 336, 18, 0xff9a55)

    // Far dunes: sun-hazed, holding the horizon.
    ridge(g, 0x6b3a2c, 0.85, 388, 16, 0.5, GY, 1.3)

    // Moisture farm on the far ridge: dome, entry block, two vaporators.
    g.fillStyle(0x3c2118, 1)
    g.fillEllipse(180, 388, 56, 30)
    g.fillRect(216, 380, 14, 10)
    g.fillRect(262, 352, 3, 38) // vaporator masts (fins low, cap on top)
    g.fillRect(260, 350, 7, 3)
    g.fillRect(259, 362, 9, 2.5)
    g.fillRect(310, 362, 2.5, 28)
    g.fillRect(308.5, 360, 5.5, 2.5)
    g.fillRect(308, 370, 7, 2)

    // Near dunes: darker, framing the fight line.
    ridge(g, 0x4a2820, 1, 430, 18, 0.7, GY, 4.1)

    // The sand underfoot.
    g.fillStyle(0x9a6644, 1)
    g.fillRect(0, GY, W, T.arena.height - GY)
    g.fillStyle(0xc08556, 0.8)
    g.fillRect(0, GY, W, 3) // lit crest where the suns catch the sand
    g.fillStyle(0x7a4c34, 0.5)
    g.fillRect(0, GY + 26, W, 6)
    g.fillRect(0, GY + 48, W, 4)

    // Wind-borne dust: sparse, slow, always moving one way.
    const dust = []
    for (let i = 0; i < 12; i++) {
      dust.push({
        c: scene.add
          .circle(Math.random() * W, 240 + Math.random() * 260, 1 + Math.random() * 1.6, 0xf0c090, 0.18)
          .setDepth(4),
        v: 14 + Math.random() * 22,
        sway: Math.random() * Math.PI * 2,
      })
    }

    return {
      update(dtMs) {
        const dt = dtMs / 1000
        for (const d of dust) {
          d.sway += dt
          d.c.x += d.v * dt
          d.c.y += Math.sin(d.sway) * 6 * dt
          if (d.c.x > W + 8) {
            d.c.x = -8
            d.c.y = 240 + Math.random() * 260
          }
        }
      },
    }
  },
}
