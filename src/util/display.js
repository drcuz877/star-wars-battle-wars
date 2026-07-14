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
