// End-to-end gameplay verification: serves the production build, drives the
// fight in headless Edge via real keyboard/touch input, and checks combat
// state through the window.game handle. Run with: node scripts/verify.mjs
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const URL = 'http://localhost:4173/star-wars-battle-wars/'
const SHOTS = 'verify-artifacts'
mkdirSync(SHOTS, { recursive: true })

const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? '  PASS' : '! FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}

const server = spawn('npm', ['run', 'preview', '--', '--port', '4173', '--strictPort'], {
  shell: true,
  stdio: 'ignore',
})
await new Promise((r) => setTimeout(r, 3000))

let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })

  // ---------- Desktop / keyboard ----------
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })

  await page.goto(URL)
  await page.waitForSelector('canvas', { timeout: 10000 })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${SHOTS}/01-battle-start.png` })

  const state = () =>
    page.evaluate(() => {
      const s = window.game.scene.keys.Battle
      return {
        px: s.player.rect.x,
        py: s.player.rect.y,
        ex: s.enemy.rect.x,
        php: s.player.hp,
        ehp: s.enemy.hp,
        pstam: s.player.stamina,
        pspec: s.player.special,
        swinging: s.player.swinging,
        blocking: s.player.blocking,
        pko: s.player.ko,
        eko: s.enemy.ko,
        over: s.roundOver,
        time: s.timeLeft,
      }
    })

  // Real fingers hold a key ~100ms; zero-duration synthetic taps can land
  // and lift between game frames.
  const tap = (key) => page.keyboard.press(key, { delay: 80 })

  // Park both fighters apart and briefly stun the AI so single-action probes
  // can't be interrupted by an incoming hit (drive shortcut, not gameplay).
  const isolate = () =>
    page.evaluate(() => {
      const s = window.game.scene.keys.Battle
      s.player.body.reset(150, 430)
      s.player.hitstun = 0
      s.enemy.body.reset(870, 430)
      s.enemy.hitstun = 1500
    })

  const s0 = await state()
  check('scene boots, both fighters at full HP', s0.php === 100 && s0.ehp === 100)

  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(400)
  await page.keyboard.up('ArrowRight')
  const s1 = await state()
  check('ArrowRight moves player', s1.px > s0.px + 30, `x ${s0.px.toFixed(0)} -> ${s1.px.toFixed(0)}`)

  await isolate()
  await page.waitForTimeout(150)
  const yBefore = (await state()).py
  await tap('Space')
  await page.waitForTimeout(250)
  const s2 = await state()
  check('Space jumps', s2.py < yBefore - 20, `y ${yBefore.toFixed(0)} -> ${s2.py.toFixed(0)}`)
  await page.waitForTimeout(800)

  await isolate()
  await page.waitForTimeout(150)
  const stamBefore = (await state()).pstam
  await tap('a')
  await page.waitForTimeout(150)
  const s3 = await state()
  check(
    'A swings and drains stamina',
    s3.pstam < stamBefore - 10,
    `stamina ${stamBefore.toFixed(0)} -> ${s3.pstam.toFixed(0)}`,
  )

  await isolate()
  await page.waitForTimeout(900)
  await page.keyboard.down('d')
  await page.waitForTimeout(200)
  check('holding D blocks', (await state()).blocking)
  await page.keyboard.up('d')

  // Brawl for real: walk at the AI and mash attack; expect damage + meter gain.
  let brawl = null
  for (let i = 0; i < 60; i++) {
    const st = await state()
    if (st.over || st.ehp < 65 || st.php < 65) {
      brawl = st
      break
    }
    const key = st.ex > st.px ? 'ArrowRight' : 'ArrowLeft'
    await page.keyboard.down(key)
    await page.waitForTimeout(220)
    await page.keyboard.up(key)
    await tap('a')
    await page.waitForTimeout(160)
  }
  brawl = brawl ?? (await state())
  await page.screenshot({ path: `${SHOTS}/02-mid-fight.png` })
  check(
    'real-time brawl deals damage both ways possible',
    brawl.ehp < 100 || brawl.php < 100,
    `player ${brawl.php.toFixed(0)} HP, enemy ${brawl.ehp.toFixed(0)} HP`,
  )
  check('landing hits charges the special meter', brawl.pspec > 0, `meter ${brawl.pspec}`)

  // S+A chord: force the meter full (drive shortcut), isolate, fire.
  await isolate()
  await page.evaluate(() => {
    window.game.scene.keys.Battle.player.special = 100
  })
  await page.waitForTimeout(1000)
  await page.keyboard.down('s')
  await page.waitForTimeout(60)
  await tap('a')
  await page.keyboard.up('s')
  await page.waitForTimeout(150)
  const s4 = await state()
  check('S+A chord fires the special (meter consumed)', s4.pspec === 0, `meter 100 -> ${s4.pspec}`)

  // KO path: drop enemy to 1 HP, finish it with real hits.
  await page.evaluate(() => {
    const s = window.game.scene.keys.Battle
    s.enemy.hp = 1
  })
  let koState = null
  for (let i = 0; i < 40; i++) {
    const st = await state()
    if (st.eko || st.over) {
      koState = st
      break
    }
    const key = st.ex > st.px ? 'ArrowRight' : 'ArrowLeft'
    await page.keyboard.down(key)
    await page.waitForTimeout(220)
    await page.keyboard.up(key)
    await tap('a')
    await page.waitForTimeout(160)
  }
  koState = koState ?? (await state())
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SHOTS}/03-ko-banner.png` })
  check('KO ends the round', koState.eko && koState.over)

  await page.waitForTimeout(1200)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)
  const s5 = await state()
  check('ENTER rematch resets the fight', s5.php === 100 && s5.ehp === 100 && !s5.over)

  check('no console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  await page.close()

  // ---------- Touch device ----------
  const ctx = await browser.newContext({
    viewport: { width: 960, height: 540 },
    hasTouch: true,
  })
  const tp = await ctx.newPage()
  const terrors = []
  tp.on('pageerror', (e) => terrors.push(String(e)))
  await tp.goto(URL)
  await tp.waitForSelector('canvas', { timeout: 10000 })
  await tp.waitForTimeout(900)
  await tp.screenshot({ path: `${SHOTS}/04-touch-ui.png` })

  check(
    'touch controls appear on a touch device',
    await tp.evaluate(() => !!window.game.scene.keys.Battle.touch),
  )

  // Park the AI so hitstun can't interrupt the touch probes.
  await tp.evaluate(() => {
    const s = window.game.scene.keys.Battle
    s.enemy.body.reset(870, 430)
    s.enemy.hitstun = 3000
  })

  // A real held touch on the ▶ button (tap has no hold duration). Runs
  // before any tap probes — stacked synthetic touch sequences from separate
  // injections can interfere with each other.
  const cdp = await ctx.newCDPSession(tp)
  const tX = await tp.evaluate(() => window.game.scene.keys.Battle.player.rect.x)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 158, y: 476 }] })
  await tp.waitForTimeout(350)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  const tX2 = await tp.evaluate(() => window.game.scene.keys.Battle.player.rect.x)
  check('holding ▶ moves player', tX2 > tX + 30, `x ${tX.toFixed(0)} -> ${tX2.toFixed(0)}`)

  await tp.waitForTimeout(400)
  const tStam = await tp.evaluate(() => window.game.scene.keys.Battle.player.stamina)
  await tp.touchscreen.tap(896, 476) // ATK button
  await tp.waitForTimeout(150)
  const tStam2 = await tp.evaluate(() => window.game.scene.keys.Battle.player.stamina)
  check('tapping ATK swings', tStam2 < tStam, `stamina ${tStam} -> ${tStam2.toFixed(0)}`)
  check('no touch-context errors', terrors.length === 0, terrors.slice(0, 3).join(' | '))
} finally {
  if (browser) await browser.close()
  spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
}

const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
