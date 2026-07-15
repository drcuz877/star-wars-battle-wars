import { TUNING as T } from '../combat/tuning.js'

// How many times bigger the real display is than our 960-wide logical
// game, capped at 3 (each step costs texture memory). Used to size each
// Text object's internal render resolution so text stays crisp when the
// canvas is CSS-stretched to a big/high-DPI screen (main.js).
//
// NOTE (2026-07-14): tried extending this to the whole canvas — bump
// Game config width/height by this factor and zoom every scene's camera
// to compensate, so shapes/gradients/starfield render crisp too, not just
// text. Reverted: in this Phaser version, a camera's `width`/`height`
// double as the reference size its default framing centers on, so once
// the canvas config width was bumped, camera.setZoom() re-centered the
// view around the NEW (much larger) canvas midpoint instead of the
// original 960×540 world — it broke click/tap targeting on every card
// and button. Caught in testing before it shipped. Revisit this properly
// scoped (likely alongside Phase 4's art pass, where resolution decisions
// get made holistically) rather than patching further under time pressure.
export const RENDER_SCALE = Math.min(
  Math.max(1, Math.ceil((window.innerWidth * (window.devicePixelRatio || 1)) / T.arena.width)),
  3,
)

// Phase 4 crispness pass: the canvas backing store is RENDER_SCALE× the
// logical 960×540 (main.js), so vector Graphics, shapes, and gradients
// rasterize at (roughly) real device resolution instead of being CSS-
// stretched. Every scene keeps building its world in logical coordinates
// and calls this once in create(): zoom the camera up to match, then
// re-center it on the logical midpoint — the missing step that sank the
// Phase 3 attempt (setZoom alone re-frames around the enlarged canvas
// center, which broke click/tap targeting on every card and button).
export function applyCrispCamera(scene) {
  scene.cameras.main.setZoom(RENDER_SCALE)
  scene.cameras.main.centerOn(T.arena.width / 2, T.arena.height / 2)
}

// Camera shake whose felt strength is the same at every RENDER_SCALE.
// Phaser's shake offset is intensity × camera width, then rides through
// the zoomed matrix — both of which we scaled up — so the raw call gets
// ~RENDER_SCALE² stronger. All gameplay shakes go through here instead.
export function shakeCamera(scene, durationMs, intensity) {
  scene.cameras.main.shake(durationMs, intensity / (RENDER_SCALE * RENDER_SCALE))
}
