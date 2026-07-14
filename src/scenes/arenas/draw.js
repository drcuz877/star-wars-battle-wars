import Phaser from 'phaser'
import { TUNING as T } from '../../combat/tuning.js'

// Shared backdrop-drawing helpers for the arena modules.

// Stylized vertical gradient: n solid horizontal bands lerping top→bottom
// color. Matches the flat art look and needs no WebGL gradient support.
export function skyBands(g, x, y, w, h, top, bottom, n = 28) {
  const a = Phaser.Display.Color.ValueToColor(top)
  const b = Phaser.Display.Color.ValueToColor(bottom)
  const bandH = h / n
  for (let i = 0; i < n; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, n - 1, i)
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1)
    g.fillRect(x, y + i * bandH, w, bandH + 1)
  }
}

// Rolling silhouette (dunes, ridges): a filled shape whose top edge is a
// couple of overlapped sine waves, from baseY down to the bottom of the
// given range.
export function ridge(g, color, alpha, baseY, amp, wobble, bottomY, seed = 0) {
  g.fillStyle(color, alpha)
  const pts = [{ x: 0, y: bottomY }]
  for (let x = 0; x <= T.arena.width; x += 16) {
    const y =
      baseY +
      Math.sin(x * 0.006 + seed) * amp +
      Math.sin(x * 0.017 + seed * 2.7) * amp * wobble
    pts.push({ x, y })
  }
  pts.push({ x: T.arena.width, y: bottomY })
  g.fillPoints(pts, true)
}
