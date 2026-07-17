import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { applyCrispCamera } from '../util/display.js'
import { initAudio, preloadAudio, playMusic } from '../audio/audio.js'

// The opening crawl (Drew's request, deferred since Phase 2): the blue
// "long time ago" line, then gold text scrolling up and away into the
// starfield, landing on character select. Waits for one starting
// tap/key (also the browser-required gesture to unlock audio — see
// begin() below), then any further tap/key skips it.
//
// The recede is faked flat: the crawl container rises while scaling
// down, with extra Y-squash to suggest the classic tilt — no real 3D.

const INTRO_MS = 3000 // opening line
const CRAWL_MS = 28000 // gold crawl (unhurried — young readers get through it)

const STORY = [
  'It is a period of endless rivalry.',
  'Heroes and villains from every',
  'corner of the galaxy have gathered',
  'to test their strength in single',
  'combat.',
  '',
  'From Jedi Masters to bounty',
  'hunters, twenty-eight legendary',
  'warriors await your command.',
  '',
  'Choose your fighter, trust the',
  'Force, and may the best duelist',
  'win....',
].join('\n')

export class CrawlScene extends Phaser.Scene {
  constructor() {
    super('Crawl')
  }

  preload() {
    preloadAudio(this)
    // Textures are game-global once loaded (same cache every scene reads
    // from) — loading here means it's ready by the time ModeScene wants it.
    this.load.image('poster-ensemble', 'images/poster-ensemble.jpg')
  }

  create() {
    applyCrispCamera(this)
    initAudio(this)
    const W = T.arena.width
    const H = T.arena.height
    this.leaving = false
    this.started = false
    this.t = null

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000)
    for (let i = 0; i < 80; i++) {
      this.add.circle(
        Math.random() * W,
        Math.random() * H,
        Math.random() * 1.4 + 0.4,
        0xffffff,
        0.2 + Math.random() * 0.6,
      )
    }

    const intro = this.add
      .text(W / 2, H / 2, 'A long time ago in a galaxy far,\nfar away....', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        color: '#ffe81f',
      })
      .setOrigin(0.5)
      .setAlpha(0)

    const title = this.add
      .text(0, 0, 'STAR WARS\nBATTLE WARS', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '72px',
        fontStyle: 'bold',
        color: '#ffe81f',
        align: 'center',
      })
      .setOrigin(0.5, 0)
    const body = this.add
      .text(0, title.height + 48, STORY, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#ffe81f',
        align: 'center',
      })
      .setOrigin(0.5, 0)
    this.crawl = this.add.container(W / 2, H + 60, [title, body]).setAlpha(0)

    this.add
      .text(W - 14, H - 12, 'tap or press any key to skip', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#8a8ab0',
      })
      .setOrigin(1, 1)
      .setAlpha(0.7)

    // Browsers refuse to play any sound until the page has had a real
    // click/tap/keypress — the crawl otherwise used to auto-play in total
    // silence for anyone who just watched it (Drew's 2026-07-17 playtest).
    // Gate the whole sequence behind one starting gesture, which doubles
    // as that unlock, then run the intro/crawl exactly as before.
    const beginPrompt = this.add
      .text(W / 2, H - 60, 'TAP OR PRESS ANY KEY TO BEGIN', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffe81f',
      })
      .setOrigin(0.5)
    this.tweens.add({ targets: beginPrompt, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 })

    const begin = () => {
      if (this.started) return
      this.started = true
      beginPrompt.destroy()
      playMusic('crawl')
      this.tweens.add({ targets: intro, alpha: 1, duration: 700 })
      this.tweens.add({ targets: intro, alpha: 0, delay: INTRO_MS - 700, duration: 600 })
      this.t = -INTRO_MS
      this.input.on('pointerdown', () => this.done())
      this.input.keyboard.on('keydown', () => this.done())
    }
    this.input.once('pointerdown', begin)
    this.input.keyboard.once('keydown', begin)
  }

  update(_time, delta) {
    if (!this.started) return
    this.t += delta
    if (this.t < 0) return
    const p = this.t / CRAWL_MS
    if (p >= 1) return this.done()

    const H = T.arena.height
    // Exponential ease-out: screen speed decays in step with the shrink,
    // so the crawl READS at a constant pace. (Linear motion + shrinking
    // text looked like it sped up — each line is shorter, so crossing
    // its own height takes less time.)
    const q = (1 - Math.exp(-1.75 * p)) / (1 - Math.exp(-1.75))
    const scale = 1.15 - 0.95 * q // recede...
    this.crawl.setScale(scale, scale * 0.82) // ...with the tilt squash
    this.crawl.y = H + 60 - (H + 10) * q // climb to the top
    this.crawl.setAlpha(p < 0.03 ? p / 0.03 : p > 0.9 ? (1 - p) / 0.1 : 1)
  }

  done() {
    if (this.leaving) return
    this.leaving = true
    this.cameras.main.fadeOut(350, 0, 0, 0)
    this.time.delayedCall(360, () => this.scene.start('Mode'))
  }
}
