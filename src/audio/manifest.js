// Hosted audio assets: curated SFX clips + Flow Music soundtrack tracks.
// Empty by design until Drew supplies files — audio.js falls back to
// procedural placeholders for any id with no entry here, so the game is
// always fully audible even with nothing listed below.
//
// To add one: drop the file under public/audio/... and add one line here.
// No other code changes needed — playSfx()/playMusic() pick it up
// automatically and prefer it over the procedural version.

export const SFX_CLIPS = {
  // saberSwing: no good match found in the Kenney CC0 packs searched
  // (foley/sci-fi, not motion/whoosh sounds) — stays on its procedural
  // placeholder for now. Revisit if a better source turns up.
  saberClash: 'audio/sfx/saber-clash.ogg', // Kenney Sci-fi Sounds: impactMetal
  hitImpact: 'audio/sfx/hit-impact.ogg', // Kenney Impact Sounds: impactPunch_medium
  ko: 'audio/sfx/ko.ogg', // Kenney Impact Sounds: impactPunch_heavy
  victory: 'audio/sfx/victory.ogg', // Kenney Music Jingles: 8-Bit jingles NES01 — 17 variants
  // in that folder if Drew wants a different one, same drop-in swap.
}

export const MUSIC_TRACKS = {
  // crawl: 'audio/music/crawl-theme.mp3',
  // menu: 'audio/music/menu-theme.mp3',
  // battle: 'audio/music/battle-theme.mp3',
}
