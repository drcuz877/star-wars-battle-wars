// Hosted audio assets: curated SFX clips + Flow Music soundtrack tracks.
// Empty by design until Drew supplies files — audio.js falls back to
// procedural placeholders for any id with no entry here, so the game is
// always fully audible even with nothing listed below.
//
// To add one: drop the file under public/audio/... and add one line here.
// No other code changes needed — playSfx()/playMusic() pick it up
// automatically and prefer it over the procedural version.

export const SFX_CLIPS = {
  // saberSwing: 'audio/sfx/saber-swing.mp3',
  // saberClash: 'audio/sfx/saber-clash.mp3',
  // hitImpact: 'audio/sfx/hit-impact.mp3',
  // ko: 'audio/sfx/ko.mp3',
  // victory: 'audio/sfx/victory.mp3',
}

export const MUSIC_TRACKS = {
  // crawl: 'audio/music/crawl-theme.mp3',
  // menu: 'audio/music/menu-theme.mp3',
  // battle: 'audio/music/battle-theme.mp3',
}
