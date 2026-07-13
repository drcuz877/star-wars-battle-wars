---
name: verify
description: Verify gameplay changes end-to-end by driving the game in headless Edge via Playwright — run after any change to combat, input, scenes, or UI.
---

# Verifying Star Wars Battle Wars

The surface is a Phaser canvas game (GUI). Verification = drive it with real
keyboard/touch input in a browser and assert on game state + screenshots.

## The one command

```bash
npm run build && node scripts/verify.mjs
```

Serves the production build via `vite preview` on port 4173, drives it in
headless **system Edge** (`playwright` with `channel: 'msedge'` — no browser
download needed; PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 was used at install),
runs ~15 checks (movement, jump, attack, block, S+A chord, special meter,
KO, rematch, touch buttons), and writes screenshots to `verify-artifacts/`
(gitignored). Exit 0 = all pass. Read the PNGs to eyeball rendering.

## The state handle

`window.game` is exposed in `src/main.js`. Scene state:
`window.game.scene.keys.Battle` → `.player` / `.enemy` (Fighter objects:
`hp`, `stamina`, `special`, `swinging`, `blocking`, `ko`, `rect.x/y`),
`.roundOver`, `.timeLeft`, `.touch` (null on non-touch contexts).

## Gotchas learned the hard way

- **Zero-duration synthetic keypresses drop.** Always
  `page.keyboard.press(key, { delay: 80 })` — instant down+up can land
  between game frames.
- **The sparring AI interferes with probes.** It will walk over and punch
  the player mid-assertion; hitstun blocks movement/attacks and reads as a
  failure. Park it first: `enemy.body.reset(870, 430); enemy.hitstun = 3000`.
- **Touch:** context needs `hasTouch: true`; held movement requires CDP
  `Input.dispatchTouchEvent` touchStart → wait → touchEnd (Playwright's
  `tap()` has no hold duration). Run held-touch probes before tap probes —
  stacked synthetic touch sequences interfere.
- **Headless movement speed reads ~half of tuning.js values** (rAF
  throttling); assert on direction/relative change, not absolute distance.
- Kill the preview server with `taskkill /pid <pid> /T /F` — a plain
  `.kill()` orphans vite under the npm shell wrapper.
