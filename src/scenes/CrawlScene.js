import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { applyCrispCamera } from '../util/display.js'

// The opening crawl (Drew's request, deferred since Phase 2): the blue
// "long time ago" line, then gold text scrolling up and away into the
// starfield, landing on character select. Any tap or key skips it.
//
// The recede is faked flat: the crawl container rises while scaling
// down, with extra Y-squash to suggest the classic tilt — no real 3D.

const INTRO_MS = 3000 // blue line
const CRAWL_MS = 16000 // gold crawl

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

  create() {
    applyCrispCamera(this)
    const W = T.arena.width
    const H = T.arena.height
    this.leaving = false

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

    const blue = this.add
      .text(W / 2, H / 2, 'A long time ago in a galaxy far,\nfar away....', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        color: '#4bd5e7',
      })
      .setOrigin(0.5)
      .setAlpha(0)
    this.tweens.add({ targets: blue, alpha: 1, duration: 700 })
    this.tweens.add({ targets: blue, alpha: 0, delay: INTRO_MS - 700, duration: 600 })

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

    this.t = -INTRO_MS
    this.input.on('pointerdown', () => this.done())
    this.input.keyboard.on('keydown', () => this.done())
  }

  update(_time, delta) {
    this.t += delta
    if (this.t < 0) return
    const p = this.t / CRAWL_MS
    if (p >= 1) return this.done()

    const H = T.arena.height
    const scale = 1.15 - 0.95 * p // recede...
    this.crawl.setScale(scale, scale * 0.82) // ...with the tilt squash
    this.crawl.y = H + 60 - (H + 10) * p // climb to the top
    this.crawl.setAlpha(p < 0.04 ? p / 0.04 : p > 0.85 ? (1 - p) / 0.15 : 1)
  }

  done() {
    if (this.leaving) return
    this.leaving = true
    this.cameras.main.fadeOut(350, 0, 0, 0)
    this.time.delayedCall(360, () => this.scene.start('Select'))
  }
}
