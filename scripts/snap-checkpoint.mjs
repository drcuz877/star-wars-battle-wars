// One-off visual snapshot at a large desktop viewport: select screen
// crispness + epic-duel banner/HP. Assumes `npm run preview -- --port 4173`
// semantics; starts its own server like verify.mjs.
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'

const server = spawn('npm', ['run', 'preview', '--', '--port', '4173', '--strictPort'], {
  shell: true,
  stdio: 'ignore',
})
await new Promise((r) => setTimeout(r, 3000))

let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  await page.goto('http://localhost:4173/star-wars-battle-wars/')
  await page.waitForSelector('canvas')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'verify-artifacts/big-01-select.png' })

  const click = async (id) => {
    const pos = await page.evaluate(
      (cid) => window.game.scene.keys.Select.cards.find((c) => c.id === cid),
      id,
    )
    // Map 960x540 game coords to the FIT-scaled 1600x900 viewport.
    await page.mouse.click((pos.x * 1600) / 960, (pos.y * 900) / 540)
    await page.waitForTimeout(250)
  }
  await click('yoda')
  await page.screenshot({ path: 'verify-artifacts/big-02-opponent-pick.png' })
  await click('palpatine')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'verify-artifacts/big-03-epic-duel.png' })

  const hp = await page.evaluate(() => {
    const s = window.game.scene.keys.Battle
    return { yoda: s.player.d.maxHp, palp: s.enemy.d.maxHp }
  })
  console.log('Epic duel HP:', JSON.stringify(hp))
} finally {
  if (browser) await browser.close()
  spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
}
