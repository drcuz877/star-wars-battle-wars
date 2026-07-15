import Phaser from 'phaser'
import { TUNING as T } from '../../combat/tuning.js'
import { skyBands } from './draw.js'

// Cloud City — the carbon-freezing chamber: rust-dark industrial gloom,
// pipes and a lamp-ringed platform behind the fight, a carbonite slab
// standing at the edge. Ambient: orange steam rising off the vents,
// vent slots pulsing underfoot.
export const cloudcity = {
  id: 'cloudcity',
  name: 'Cloud City — Freezing Chamber',

  create(scene) {
    const W = T.arena.width
    const GY = T.arena.groundY
    const g = scene.add.graphics().setDepth(0)

    // Chamber gloom, warm at the base from the freezing pit.
    skyBands(g, 0, 0, W, GY - 50, 0x150c10, 0x33141a)
    skyBands(g, 0, GY - 50, W, 50, 0x33141a, 0x4a1e1c)

    // Back platform ring with its row of chamber lamps.
    g.fillStyle(0x220f15, 1)
    g.fillEllipse(W / 2, GY - 52, 640, 90)
    g.fillStyle(0x180a0e, 1)
    g.fillEllipse(W / 2, GY - 60, 560, 64)
    for (let i = 0; i < 11; i++) {
      const lx = W / 2 - 250 + i * 50
      scene.add
        .circle(lx, GY - 46, 3, 0xbcd8e8, 0.85)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(0)
    }

    // Industrial pipework flanking the chamber.
    const pipe = (x, w) => {
      g.fillStyle(0x2a1418, 1)
      g.fillRect(x, 36, w, GY - 66)
      g.fillStyle(0x3e2026, 0.9)
      g.fillRect(x + 2, 36, 3, GY - 66) // highlight edge
      g.fillStyle(0x1c0c10, 1)
      g.fillRect(x - 3, 96, w + 6, 12) // couplings
      g.fillRect(x - 3, 250, w + 6, 12)
    }
    pipe(96, 26)
    pipe(196, 16)
    pipe(748, 16)
    pipe(838, 26)

    // A carbonite slab standing by the pit.
    g.fillStyle(0x3a3a44, 1)
    g.fillRect(676, GY - 96, 52, 96)
    g.fillStyle(0x2a2a32, 1)
    g.fillRect(682, GY - 88, 40, 74)
    g.fillStyle(0x4a4a56, 0.8)
    for (let i = 0; i < 3; i++) g.fillRect(684 + i * 14, GY - 84, 8, 5) // relief bumps

    // Grated floor with glowing vent slots (they pulse in update).
    g.fillStyle(0x1c1014, 1)
    g.fillRect(0, GY, W, T.arena.height - GY)
    g.fillStyle(0x52242a, 0.8)
    g.fillRect(0, GY, W, 2)
    const slots = scene.add.graphics().setDepth(1)
    slots.fillStyle(0xff8a3a, 0.85)
    for (let x = 40; x < W - 40; x += 88) slots.fillRect(x, GY + 22, 30, 4)
    for (let x = 84; x < W - 40; x += 88) slots.fillRect(x, GY + 46, 22, 3)

    // Steam rising off the vents.
    const puffs = []
    for (let i = 0; i < 12; i++) {
      puffs.push({
        c: scene.add
          .circle(200 + Math.random() * 560, GY - Math.random() * 200, 6 + Math.random() * 8, 0xd8884a, 0.08)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(4),
        v: 18 + Math.random() * 16,
      })
    }

    return {
      update(dtMs) {
        const dt = dtMs / 1000
        const now = scene.time.now
        for (const s of puffs) {
          s.c.y -= s.v * dt
          s.c.scale += dt * 0.16
          s.c.alpha = Math.max(0, s.c.alpha - dt * 0.035)
          if (s.c.alpha <= 0.01 || s.c.y < 120) {
            s.c.y = GY - 6
            s.c.x = 200 + Math.random() * 560
            s.c.setScale(1)
            s.c.alpha = 0.07 + Math.random() * 0.03
          }
        }
        slots.setAlpha(0.7 + Math.sin(now / 560) * 0.25)
      },
    }
  },
}
