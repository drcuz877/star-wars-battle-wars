import Phaser from 'phaser'
import { TUNING as T } from '../../combat/tuning.js'
import { skyBands, ridge } from './draw.js'

// Mustafar — the lava world. Layers, back to front: smoke-black sky
// burning red at the horizon, volcano silhouettes with lit peaks, a
// glowing lava river behind the fight line, then scorched basalt ground
// veined with lava cracks. Ambient: embers rising, cracks pulsing.
export const mustafar = {
  id: 'mustafar',
  name: 'Mustafar — Lava Fields',

  create(scene) {
    const W = T.arena.width
    const GY = T.arena.groundY
    const g = scene.add.graphics().setDepth(0)

    // Sky: ash black into furnace red.
    skyBands(g, 0, 0, W, GY - 60, 0x0c0810, 0x5a160e)
    skyBands(g, 0, GY - 60, W, 60, 0x5a160e, 0x8a2a12)

    // Volcanoes: flat-topped craters with molten light spilling from the
    // mouth. The glows draw first so the rock rim cuts across them.
    const volcano = (x, w, h, lean = 0) => {
      const topY = GY - 40 - h
      const mouth = w * 0.22
      scene.add
        .ellipse(x + lean, topY - 2, mouth * 2.6, 26, 0xff6a22, 0.22)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(0)
      scene.add
        .ellipse(x + lean, topY - 1, mouth * 1.2, 7, 0xffa050, 0.75)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(0)
      g.fillStyle(0x140a0e, 1)
      g.fillPoints(
        [
          { x: x - w / 2, y: GY - 40 },
          { x: x + lean - mouth / 2, y: topY },
          { x: x + lean + mouth / 2, y: topY },
          { x: x + w / 2, y: GY - 40 },
        ],
        true,
      )
    }
    volcano(150, 210, 130, -18)
    volcano(430, 150, 90, 12)
    volcano(820, 260, 150, 30)

    // The lava river behind the fight line, with bright drifting seams.
    g.fillStyle(0xd8481e, 1)
    g.fillRect(0, GY - 26, W, 26)
    g.fillStyle(0xff9a40, 0.9)
    for (let x = 0; x < W; x += 90) {
      g.fillRect(x + (x % 180 === 0 ? 12 : 46), GY - 20, 34 + (x % 270) / 12, 3)
      g.fillRect(x + 24, GY - 9, 26, 2.5)
    }
    // Heat bloom hanging over the river.
    const bloom = scene.add
      .rectangle(W / 2, GY - 34, W, 46, 0xff6a22, 0.14)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(0)

    // Scorched basalt underfoot.
    g.fillStyle(0x16100f, 1)
    g.fillRect(0, GY, W, T.arena.height - GY)
    g.fillStyle(0xff7a30, 0.8)
    g.fillRect(0, GY, W, 2.5) // river light catching the ledge

    // Lava cracks in the ground — drawn separately so they can pulse.
    const cracks = scene.add.graphics().setDepth(1)
    cracks.lineStyle(2, 0xff7a30, 1)
    const crackAt = (x0, spread) => {
      cracks.beginPath()
      cracks.moveTo(x0, GY + 8)
      let x = x0
      for (let y = GY + 8; y < T.arena.height - 6; y += 12) {
        x += Phaser.Math.Between(-spread, spread)
        cracks.lineTo(x, y)
      }
      cracks.strokePath()
    }
    crackAt(140, 9)
    crackAt(485, 7)
    crackAt(810, 10)

    // Embers rising off the lava, swaying as they climb.
    const embers = []
    for (let i = 0; i < 22; i++) {
      embers.push({
        c: scene.add
          .circle(Math.random() * W, GY - Math.random() * 300, 1 + Math.random() * 1.5, 0xffa050, 0.7)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(4),
        v: 22 + Math.random() * 30,
        sway: Math.random() * Math.PI * 2,
      })
    }

    return {
      update(dtMs) {
        const dt = dtMs / 1000
        const now = scene.time.now
        for (const e of embers) {
          e.sway += dt * 2
          e.c.y -= e.v * dt
          e.c.x += Math.sin(e.sway) * 14 * dt
          if (e.c.y < 60) {
            e.c.y = GY - 4
            e.c.x = Math.random() * W
          }
        }
        // The lava breathes: cracks and heat bloom pulse slowly, offset.
        cracks.setAlpha(0.65 + Math.sin(now / 480) * 0.3)
        bloom.setAlpha(0.75 + Math.sin(now / 700 + 2) * 0.25)
      },
    }
  },
}
