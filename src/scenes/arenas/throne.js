import { TUNING as T } from '../../combat/tuning.js'
import { skyBands } from './draw.js'

// Emperor's Throne Room (Death Star II) — the dark interior: a giant
// viewport onto deep space, the throne on its dais at the right, glossy
// black floor catching the starlight. Ambient: a few stars twinkle.
export const throne = {
  id: 'throne',
  name: "Emperor's Throne Room",

  create(scene) {
    const W = T.arena.width
    const GY = T.arena.groundY
    const g = scene.add.graphics().setDepth(0)

    // Metallic wall panels.
    skyBands(g, 0, 0, W, GY, 0x121218, 0x1e1e2a)
    for (let x = 0; x < W; x += 120) g.fillStyle(0x0c0c12, 0.5), g.fillRect(x, 0, 2, GY)

    // The great viewport: an octagon of deep space.
    const wx = 190, wy = 60, ww = 580, wh = 270, cut = 70
    g.fillStyle(0x2e2e42, 1) // frame
    g.fillPoints(
      [
        { x: wx + cut - 6, y: wy - 6 }, { x: wx + ww - cut + 6, y: wy - 6 },
        { x: wx + ww + 6, y: wy + cut - 6 }, { x: wx + ww + 6, y: wy + wh - cut + 6 },
        { x: wx + ww - cut + 6, y: wy + wh + 6 }, { x: wx + cut - 6, y: wy + wh + 6 },
        { x: wx - 6, y: wy + wh - cut + 6 }, { x: wx - 6, y: wy + cut - 6 },
      ],
      true,
    )
    g.fillStyle(0x030308, 1) // space
    g.fillPoints(
      [
        { x: wx + cut, y: wy }, { x: wx + ww - cut, y: wy },
        { x: wx + ww, y: wy + cut }, { x: wx + ww, y: wy + wh - cut },
        { x: wx + ww - cut, y: wy + wh }, { x: wx + cut, y: wy + wh },
        { x: wx, y: wy + wh - cut }, { x: wx, y: wy + cut },
      ],
      true,
    )
    // Stars in the viewport; a handful twinkle.
    for (let i = 0; i < 42; i++) {
      const sx = wx + 20 + Math.random() * (ww - 40)
      const sy = wy + 16 + Math.random() * (wh - 32)
      const star = scene.add.circle(sx, sy, Math.random() * 1.3 + 0.4, 0xffffff, 0.3 + Math.random() * 0.55)
      if (i % 7 === 0) {
        scene.tweens.add({ targets: star, alpha: 0.1, duration: 800 + Math.random() * 1500, yoyo: true, repeat: -1 })
      }
    }
    // Window spokes (the iconic Y-struts).
    g.fillStyle(0x2e2e42, 1)
    g.fillRect(wx + ww / 2 - 3, wy, 6, wh / 2)
    g.fillRect(wx, wy + wh / 2 - 3, ww, 6)

    // Throne on its stepped dais, stage right.
    g.fillStyle(0x101018, 1)
    g.fillRect(720, GY - 26, 240, 26)
    g.fillRect(748, GY - 46, 212, 20)
    g.fillStyle(0x0a0a10, 1)
    g.fillRect(796, GY - 148, 118, 102) // high back
    g.fillEllipse(855, GY - 148, 118, 44) // rounded top
    g.fillRect(786, GY - 78, 138, 32) // arms

    // Glossy floor.
    g.fillStyle(0x0b0b10, 1)
    g.fillRect(0, GY, W, T.arena.height - GY)
    g.fillStyle(0x3a3a55, 0.5)
    g.fillRect(0, GY, W, 2)
    g.fillStyle(0x8a9ac8, 0.05) // starlight pooling under the window
    g.fillRect(wx + 40, GY + 4, ww - 80, 40)

    return {}
  },
}
