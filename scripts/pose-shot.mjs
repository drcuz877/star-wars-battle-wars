// Art-iteration helper (Phase 4): loads the game, starts Luke vs Vader,
// and screenshots the puppet in each pose so puppet/animator changes can
// be eyeballed quickly. Not part of verify — just a dev tool.
// Run against a dev server: node scripts/pose-shot.mjs [url]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const URL = process.argv[2] ?? 'http://localhost:5173/star-wars-battle-wars/'
const OUT = 'verify-artifacts/poses'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 960, height: 540 } })
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message))
page.on('console', (m) => {
  if (m.type() === 'error') console.error('CONSOLE ERROR:', m.text())
})
await page.goto(URL)
await page.waitForSelector('canvas', { timeout: 10000 })
await page.waitForTimeout(900)

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` })

// The opening crawl runs on every page load; click dead space to skip.
const skipCrawl = async () => {
  await page.waitForTimeout(500)
  await page.mouse.click(10, 250)
  await page.waitForTimeout(800)
}

const click = async (scene, id) => {
  const pos = await page.evaluate(
    ([s, cid]) => window.game.scene.keys[s].cards.find((c) => c.id === cid),
    [scene, id],
  )
  await page.mouse.click(pos.x, pos.y)
  await page.waitForTimeout(250)
}
await page.waitForTimeout(4200) // into the gold-crawl phase
await shot('000-crawl')
await skipCrawl()
await shot('00-select')
await click('Select', 'luke')
await click('Select', 'vader')
await page.waitForTimeout(300)
await shot('00b-difficulty')
await click('Difficulty', 'initiate')
await page.waitForTimeout(700)

// Park the AI far away and stunned so poses aren't interrupted.
const isolate = () =>
  page.evaluate(() => {
    const s = window.game.scene.keys.Battle
    s.player.body.reset(300, 430)
    s.player.hitstun = 0
    s.enemy.body.reset(660, 430)
    s.enemy.hitstun = 60000
  })

await isolate()
await page.waitForTimeout(600)
await shot('01-idle')

// Walk
await page.keyboard.down('ArrowRight')
await page.waitForTimeout(260)
await shot('02-walk')
await page.keyboard.up('ArrowRight')

// Jump apex
await isolate()
await page.keyboard.press('Space', { delay: 60 })
await page.waitForTimeout(300)
await shot('03-jump')
await page.waitForTimeout(700)

// Swing: windup then active sweep
await isolate()
await page.waitForTimeout(400)
await page.keyboard.down('a')
await page.waitForTimeout(70)
await shot('04-windup')
await page.waitForTimeout(90)
await shot('05-swing')
await page.keyboard.up('a')
await page.waitForTimeout(500)

// Block
await isolate()
await page.keyboard.down('d')
await page.waitForTimeout(300)
await shot('06-block')
await page.keyboard.up('d')

// Pause menu
await page.keyboard.press('Escape', { delay: 60 })
await page.waitForTimeout(300)
await shot('06b-pause')
await page.keyboard.press('Escape', { delay: 60 })
await page.waitForTimeout(300)

// Special (Luke's Force Push -> grip pose), in range so it visibly fires
await page.evaluate(() => {
  const s = window.game.scene.keys.Battle
  s.player.body.reset(500, 430)
  s.enemy.body.reset(640, 430)
  s.enemy.hitstun = 60000
  s.player.special = 100
})
await page.waitForTimeout(400)
await page.keyboard.press('w', { delay: 60 })
await page.waitForTimeout(180)
await shot('07-special')

// Hit reaction + KO: let Vader die to real hits
await page.evaluate(() => {
  window.game.scene.keys.Battle.enemy.hp = 1
})
for (let i = 0; i < 20; i++) {
  const done = await page.evaluate(() => window.game.scene.keys.Battle.enemy.ko)
  if (done) break
  const st = await page.evaluate(() => {
    const s = window.game.scene.keys.Battle
    return { px: s.player.rect.x, ex: s.enemy.rect.x }
  })
  await page.keyboard.down(st.ex > st.px ? 'ArrowRight' : 'ArrowLeft')
  await page.waitForTimeout(200)
  await page.keyboard.up(st.ex > st.px ? 'ArrowRight' : 'ArrowLeft')
  await page.keyboard.press('a', { delay: 60 })
  await page.waitForTimeout(150)
}
await page.waitForTimeout(600)
await shot('08-ko')
await page.waitForTimeout(1400)
await shot('08b-end-menu')

// --- Second scenario: blaster VFX (bolt glow/trail + impact burst) ---
await page.goto(URL)
await page.waitForSelector('canvas', { timeout: 10000 })
await page.waitForTimeout(900)
await skipCrawl()
await click('Select', 'han')
await click('Select', 'chewbacca')
await click('Difficulty', 'initiate')
await page.waitForTimeout(700)
await page.evaluate(() => {
  const s = window.game.scene.keys.Battle
  s.player.body.reset(340, 430)
  s.enemy.body.reset(700, 430)
  s.enemy.hitstun = 60000
})
await page.waitForTimeout(300)
await page.keyboard.press('a', { delay: 60 })
await page.waitForTimeout(160)
await shot('09-bolt-flight')
await page.waitForTimeout(400)
await shot('10-bolt-impact')

// Blaster dodge slide
await page.waitForTimeout(600)
await page.keyboard.press('d', { delay: 60 })
await page.waitForTimeout(130)
await shot('10b-dodge')

// --- Roster sweep: every arted matchup, exercising all part painters ---
await page.goto(URL)
await page.waitForSelector('canvas', { timeout: 10000 })
await page.waitForTimeout(900)
await skipCrawl()
await click('Select', 'boba')
await click('Select', 'luke')
await click('Difficulty', 'initiate')
await page.waitForTimeout(900)
await shot('12-boba')
const matchups = [
  ['padme', 'leia'],
  ['yoda', 'grogu'],
]
for (const [p1, p2] of matchups) {
  await page.evaluate(
    ([a, b]) => window.game.scene.keys.Battle.scene.restart({ p1: a, p2: b, difficulty: 'initiate' }),
    [p1, p2],
  )
  await page.waitForTimeout(800)
  await shot(`13-${p1}-vs-${p2}`)
}

// Mid-swing captures: Maul's staff twirl, Grievous's two-saber slash.
for (const [who, at] of [['maul', 150], ['grievous', 150]]) {
  await page.evaluate(
    (id) => window.game.scene.keys.Battle.scene.restart({ p1: id, p2: 'padme', difficulty: 'initiate' }),
    who,
  )
  await page.waitForTimeout(800)
  await page.evaluate(() => {
    const s = window.game.scene.keys.Battle
    s.player.body.reset(400, 430)
    s.enemy.body.reset(760, 430)
    s.enemy.hitstun = 60000
  })
  await page.waitForTimeout(300)
  await page.keyboard.down('a')
  await page.waitForTimeout(at)
  await shot(`14-${who}-swing`)
  await page.keyboard.up('a')
  await page.waitForTimeout(400)
}

// --- Third scenario: capture each arena backdrop (restart until both seen) ---
const seen = new Set()
for (let i = 0; i < 40 && seen.size < 5; i++) {
  const id = await page.evaluate(() => window.game.scene.keys.Battle.arena.def.id)
  if (!seen.has(id)) {
    seen.add(id)
    await page.waitForTimeout(400)
    await shot(`11-arena-${id}`)
  }
  await page.evaluate(() => window.game.scene.keys.Battle.scene.restart())
  await page.waitForTimeout(700)
}

await browser.close()
console.log(`poses written to ${OUT}/`)
