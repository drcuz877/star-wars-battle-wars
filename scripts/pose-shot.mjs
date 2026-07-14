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

const click = async (scene, id) => {
  const pos = await page.evaluate(
    ([s, cid]) => window.game.scene.keys[s].cards.find((c) => c.id === cid),
    [scene, id],
  )
  await page.mouse.click(pos.x, pos.y)
  await page.waitForTimeout(250)
}
await click('Select', 'luke')
await click('Select', 'vader')
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

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` })

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

await browser.close()
console.log(`poses written to ${OUT}/`)
