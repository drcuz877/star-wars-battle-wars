import { loadJSON, saveJSON } from '../util/storage.js'
import { SFX_CLIPS, MUSIC_TRACKS } from './manifest.js'

// One shared audio system for the whole game (module state, not a Phaser
// object — survives scene switches since ES modules are singletons).
//
// Two sound sources feed the same mute/volume control:
//  - Procedural SFX: hand-written Web Audio synths (below), built fresh on
//    every play() call. Zero asset files, zero load time — this is the
//    permanent home for blaster shots, UI blips, jump/dodge whooshes.
//  - Curated clips + music: real files loaded through Phaser's own loader
//    (see manifest.js). Until Drew supplies a file for a given id, playSfx
//    silently falls back to a placeholder synth so nothing is ever silent.
//    playMusic falls back to a generative sequenced track where one exists
//    (AMBIENT, below — crawl/menu/battle all have one) or, failing that,
//    stays silent. These are still placeholders, not a substitute for
//    Flow Music's real composition — swapped out automatically the moment
//    a track is added to manifest.js.
//
// initAudio()/preloadAudio() run once, from CrawlScene (the game's first
// scene) — every other scene just calls playSfx()/playMusic() directly.

let ctx = null
let phaserSound = null
let sfxGain = null
let musicSound = null
let ambientHandle = null
let currentMusicId = null
const loadedKeys = new Set()

let muted = loadJSON('audioMuted', false)
let volume = loadJSON('audioVolume', 0.7)

const clipKey = (id) => `sfx-${id}`
const trackKey = (id) => `music-${id}`

export function preloadAudio(scene) {
  for (const [id, path] of Object.entries(SFX_CLIPS)) scene.load.audio(clipKey(id), path)
  for (const [id, path] of Object.entries(MUSIC_TRACKS)) scene.load.audio(trackKey(id), path)
  scene.load.on('filecomplete', (key, type) => {
    if (type === 'audio') loadedKeys.add(key)
  })
  scene.load.on('loaderror', (file) => {
    console.info(`[audio] no file at ${file.src} — using the procedural placeholder for now`)
  })
}

export function initAudio(scene) {
  if (ctx) return // already set up by an earlier scene
  phaserSound = scene.sound
  ctx = phaserSound.context ?? null
  if (!ctx) return // HTML5Audio fallback backend — no Web Audio, no procedural synths
  sfxGain = ctx.createGain()
  sfxGain.connect(ctx.destination)
  applyVolumeState()
}

function applyVolumeState() {
  if (phaserSound) {
    phaserSound.mute = muted
    phaserSound.volume = volume
  }
  if (sfxGain) sfxGain.gain.value = muted ? 0 : volume
}

export function isMuted() {
  return muted
}
export function getVolume() {
  return volume
}
export function setMuted(v) {
  muted = v
  saveJSON('audioMuted', muted)
  applyVolumeState()
}
export function toggleMuted() {
  setMuted(!muted)
  return muted
}
export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v))
  saveJSON('audioVolume', volume)
  applyVolumeState()
}

// ---- Sound effects ---------------------------------------------------

export function playSfx(id) {
  if (muted) return
  const key = clipKey(id)
  if (loadedKeys.has(key) && phaserSound) {
    phaserSound.play(key)
    return
  }
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()
  SYNTH[id]?.()
}

// ---- Music -------------------------------------------------------------

export function playMusic(id) {
  const key = trackKey(id)
  if (currentMusicId === id && (musicSound?.isPlaying || ambientHandle)) return
  stopMusic()
  if (loadedKeys.has(key) && phaserSound) {
    musicSound = phaserSound.add(key, { loop: true })
    musicSound.play()
    currentMusicId = id
    return
  }
  if (!muted && ctx && AMBIENT[id]) {
    ambientHandle = AMBIENT[id]()
    currentMusicId = id
  }
}

export function stopMusic() {
  if (musicSound) {
    musicSound.stop()
    musicSound.destroy()
  }
  musicSound = null
  if (ambientHandle) {
    ambientHandle.stop()
    ambientHandle = null
  }
  currentMusicId = null
}

// ---- Procedural synths ---------------------------------------------------
// Small Web Audio building blocks (a tone sweep, a filtered noise burst)
// combined into short one-shot sounds. Each SYNTH entry is built fresh per
// play() call — cheap, and lets overlapping plays (e.g. rapid blaster fire)
// stack without stepping on each other.

function now() {
  return ctx.currentTime
}

function playTone({ freqStart, freqEnd = freqStart, duration, type = 'sine', gainPeak = 0.2, attack = 0.005 }) {
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(Math.max(freqStart, 1), now())
  if (freqEnd !== freqStart) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), now() + duration)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, now())
  g.gain.linearRampToValueAtTime(gainPeak, now() + attack)
  g.gain.exponentialRampToValueAtTime(0.001, now() + duration)
  osc.connect(g)
  g.connect(sfxGain)
  osc.start()
  osc.stop(now() + duration + 0.02)
}

function playNoise({ duration, gainPeak = 0.2, filterFreqStart, filterFreqEnd = filterFreqStart, filterType = 'bandpass', attack = 0.005 }) {
  const size = Math.max(1, Math.ceil(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = filterType
  filter.frequency.setValueAtTime(filterFreqStart, now())
  if (filterFreqEnd !== filterFreqStart) filter.frequency.exponentialRampToValueAtTime(Math.max(filterFreqEnd, 1), now() + duration)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, now())
  g.gain.linearRampToValueAtTime(gainPeak, now() + attack)
  g.gain.exponentialRampToValueAtTime(0.001, now() + duration)
  src.connect(filter)
  filter.connect(g)
  g.connect(sfxGain)
  src.start()
  src.stop(now() + duration + 0.02)
}

const SYNTH = {
  // Permanent procedural set (per Drew's hybrid audio plan, 2026-07-17).
  blasterShot: () => playTone({ freqStart: 1700, freqEnd: 260, duration: 0.11, type: 'sawtooth', gainPeak: 0.22 }),
  jump: () => playTone({ freqStart: 320, freqEnd: 680, duration: 0.1, gainPeak: 0.16 }),
  dodge: () => playNoise({ duration: 0.16, filterFreqStart: 2200, filterFreqEnd: 500, gainPeak: 0.16 }),
  brawlerSwing: () => {
    playNoise({ duration: 0.1, filterFreqStart: 900, filterFreqEnd: 200, gainPeak: 0.18 })
    playTone({ freqStart: 150, freqEnd: 60, duration: 0.12, type: 'square', gainPeak: 0.14 })
  },
  specialCast: () => playTone({ freqStart: 200, freqEnd: 900, duration: 0.5, gainPeak: 0.2, attack: 0.05 }),
  uiClick: () => playTone({ freqStart: 880, duration: 0.05, gainPeak: 0.12 }),
  uiBack: () => playTone({ freqStart: 520, freqEnd: 380, duration: 0.07, gainPeak: 0.12 }),

  // Placeholders for the curated-clip categories — swapped for real files
  // automatically the moment they're added to manifest.js.
  saberSwing: () => playNoise({ duration: 0.14, filterFreqStart: 3000, filterFreqEnd: 900, gainPeak: 0.15 }),
  saberClash: () => {
    playNoise({ duration: 0.12, filterFreqStart: 4000, filterFreqEnd: 1200, filterType: 'highpass', gainPeak: 0.2 })
    playTone({ freqStart: 1200, freqEnd: 300, duration: 0.15, type: 'triangle', gainPeak: 0.16 })
  },
  hitImpact: () => {
    playNoise({ duration: 0.08, filterFreqStart: 700, filterFreqEnd: 150, gainPeak: 0.22 })
    playTone({ freqStart: 110, freqEnd: 45, duration: 0.12, type: 'square', gainPeak: 0.16 })
  },
  blockedHit: () => playNoise({ duration: 0.06, filterFreqStart: 500, filterFreqEnd: 200, gainPeak: 0.14 }),
  ko: () => {
    playTone({ freqStart: 300, freqEnd: 55, duration: 0.4, type: 'sawtooth', gainPeak: 0.22 })
    playNoise({ duration: 0.3, filterFreqStart: 800, filterFreqEnd: 120, gainPeak: 0.14 })
  },
  victory: () => {
    ;[660, 880, 1100].forEach((f, i) => {
      setTimeout(() => ctx && playTone({ freqStart: f, duration: 0.28, type: 'triangle', gainPeak: 0.18 }), i * 140)
    })
  },
}

// ---- Generative music beds ------------------------------------------------
// Placeholders for the Flow Music tracks (audio-brief.md). Two attempts at
// a static pad + slow arpeggio both missed — "horror movie," then "still
// don't like it" (2026-07-17 x2). A held chord with no rhythm can't read as
// "upbeat" no matter how it's voiced; upbeat/tense are rhythmic qualities.
// This version is an actual tiny sequencer: a beat clock drives a bassline,
// a chord progression, and light procedural percussion (noise-burst kick/
// hihat, not samples) together, the same way a real arranger would build
// energy — not a bigger pad. Still a synthesized placeholder, not a
// substitute for Flow Music's real composition — flagged to Drew as such.

function makeClock(bpm, onTick) {
  const stepMs = 60000 / bpm / 2 // one tick per eighth note
  let step = 0
  let timer = null
  const tick = () => {
    if (!ctx) return
    onTick(step)
    step++
    timer = setTimeout(tick, stepMs)
  }
  timer = setTimeout(tick, 0)
  return { stop: () => clearTimeout(timer) }
}

function kick() {
  playTone({ freqStart: 130, freqEnd: 45, duration: 0.14, type: 'sine', gainPeak: 0.1, attack: 0.002 })
}
function hihat(gainPeak = 0.02) {
  playNoise({ duration: 0.045, filterFreqStart: 7000, filterFreqEnd: 6000, filterType: 'highpass', gainPeak, attack: 0.001 })
}

// Crawl + menu: upbeat, adventurous — bright C-major I-V-vi-IV progression
// (the classic "hopeful journey" turnaround), a walking bass pulse on beats
// 1 and 3, and an ascending arpeggio bouncing on the off-beats.
function adventureTheme() {
  const CHORDS = [
    { bass: 130.81, arp: [261.63, 329.63, 392.0, 523.25] }, // C
    { bass: 98.0, arp: [196.0, 246.94, 293.66, 392.0] }, // G
    { bass: 110.0, arp: [220.0, 261.63, 329.63, 440.0] }, // Am
    { bass: 87.31, arp: [174.61, 220.0, 261.63, 349.23] }, // F
  ]
  const BEATS_PER_BAR = 8
  return makeClock(112, (step) => {
    const bar = Math.floor(step / BEATS_PER_BAR) % CHORDS.length
    const pos = step % BEATS_PER_BAR
    const chord = CHORDS[bar]
    if (pos === 0 || pos === 4) {
      playTone({ freqStart: chord.bass, duration: 0.5, type: 'triangle', gainPeak: 0.065, attack: 0.01 })
      kick()
    }
    hihat()
    if (pos % 2 === 1) {
      const note = chord.arp[Math.floor(pos / 2) % chord.arp.length]
      playTone({ freqStart: note, duration: 0.32, type: 'triangle', gainPeak: 0.045, attack: 0.01 })
    }
  })
}

// Battle: upbeat but tense — A-minor alternating with E (its dominant,
// carrying the G# leading tone for real harmonic pull), a driving 8th-note
// bass ostinato instead of a walking pulse, and a syncopated riff on top.
// Faster tempo (144 vs 112) and continuous bass is what reads as "tense
// and driving" rather than "dark" — still major-key-adjacent energy, no
// low sustained rumble (that's the horror-movie mistake, not repeated).
function battleTheme() {
  const CHORDS = [
    { bass: 110.0, arp: [220.0, 261.63, 329.63, 440.0] }, // Am
    { bass: 82.41, arp: [164.81, 207.65, 246.94, 329.63] }, // E (G# tension)
  ]
  const RIFF_ORDER = [3, 1, 3, 0]
  const BEATS_PER_BAR = 8
  return makeClock(144, (step) => {
    const bar = Math.floor(step / BEATS_PER_BAR) % CHORDS.length
    const pos = step % BEATS_PER_BAR
    const chord = CHORDS[bar]
    playTone({ freqStart: chord.bass, duration: 0.22, type: 'sawtooth', gainPeak: 0.05, attack: 0.005 })
    if (pos % 2 === 0) kick()
    hihat(0.016)
    if (pos % 2 === 1) {
      const note = chord.arp[RIFF_ORDER[Math.floor(pos / 2) % RIFF_ORDER.length]]
      playTone({ freqStart: note, duration: 0.18, type: 'square', gainPeak: 0.04, attack: 0.005 })
    }
  })
}

const AMBIENT = {
  crawl: adventureTheme,
  menu: adventureTheme,
  battle: battleTheme,
}
