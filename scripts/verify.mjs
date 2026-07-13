// End-to-end gameplay verification: serves the production build, drives the
// select screen + fight in headless Edge via real keyboard/touch input, and
// checks combat state through the window.game handle.
// Run with: npm run build && node scripts/verify.mjs
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
  await page.screenshot({ path: `${SHOTS}/01-select-screen.png` })

  // --- Character select: pick Luke, then Vader, via real clicks on cards.
  const cardCount = await page.evaluate(() => window.game.scene.keys.Select.cards.length)
  check('select screen shows all 28 characters', cardCount === 28, `${cardCount} cards`)

  const clickCard = async (id) => {
    const pos = await page.evaluate(
      (cid) => window.game.scene.keys.Select.cards.find((c) => c.id === cid),
      id,
    )
    await page.mouse.click(pos.x, pos.y)
    await page.waitForTimeout(200)
  }

  await clickCard('luke')
  const picking = await page.evaluate(() => window.game.scene.keys.Select.picking)
  check('clicking a fighter advances to opponent pick', picking === 'p2')

  await clickCard('vader')
  await page.waitForTimeout(700)
  const names = await page.evaluate(() => {
    const s = window.game.scene.keys.Battle
    return { p: s.player.name, e: s.enemy.name, php: s.player.hp, pmax: s.player.d.maxHp }
  })
  check(
    'battle starts with the chosen matchup',
    names.p === 'Luke Skywalker' && names.e === 'Darth Vader',
    `${names.p} vs ${names.e}`,
  )
  await page.screenshot({ path: `${SHOTS}/02-battle-start.png` })

  const state = () =>
    page.evaluate(() => {
      const s = window.game.scene.keys.Battle
      return {
        px: s.player.rect.x,
        py: s.player.rect.y,
        ex: s.enemy.rect.x,
        php: s.player.hp,
        ehp: s.enemy.hp,
        pmax: s.player.d.maxHp,
        emax: s.enemy.d.maxHp,
        pstam: s.player.stamina,
        pspec: s.player.special,
        swinging: s.player.swinging,
        blocking: s.player.blocking,
        pko: s.player.ko,
        eko: s.enemy.ko,
        over: s.roundOver,
        time: s.timeLeft,
        bolts: s.projectiles.bolts.length,
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
  check(
    'both fighters start at their derived max HP',
    s0.php === s0.pmax && s0.ehp === s0.emax,
    `Luke ${s0.php}/${s0.pmax}, Vader ${s0.ehp}/${s0.emax}`,
  )

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
  check('holding D blocks (saber archetype)', (await state()).blocking)
  await page.keyboard.up('d')

  // Brawl for real: walk at the AI and mash attack; expect damage + meter gain.
  let brawl = null
  for (let i = 0; i < 60; i++) {
    const st = await state()
    if (st.over || st.ehp < st.emax - 30 || st.php < st.pmax - 30) {
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
  await page.screenshot({ path: `${SHOTS}/03-mid-fight.png` })
  check(
    'real-time brawl deals damage',
    brawl.ehp < brawl.emax || brawl.php < brawl.pmax,
    `player ${brawl.php.toFixed(0)} HP, enemy ${brawl.ehp.toFixed(0)} HP`,
  )
  check('landing hits charges the special meter', brawl.pspec > 0, `meter ${brawl.pspec.toFixed(0)}`)

  // S+A chord: force the meter full (drive shortcut), isolate, fire.
  // Luke's Force Push whiffs at isolation distance but must consume the meter.
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

  // W as the direct single-key special — this time in range, so Force Push
  // (grip template) must actually damage Vader.
  await page.evaluate(() => {
    const s = window.game.scene.keys.Battle
    s.player.body.reset(500, 430)
    s.player.hitstun = 0
    s.enemy.body.reset(620, 430)
    s.enemy.hitstun = 1500
    s.player.special = 100
  })
  await page.waitForTimeout(1000)
  const preSpecial = (await state()).ehp
  await tap('w')
  await page.waitForTimeout(300)
  const s4b = await state()
  check(
    'W fires Force Push in range: meter spent, Vader damaged',
    s4b.pspec === 0 && s4b.ehp < preSpecial,
    `meter -> ${s4b.pspec}, enemy HP ${preSpecial} -> ${s4b.ehp}`,
  )

  // KO path: drop enemy to 1 HP, finish it with real hits.
  await page.evaluate(() => {
    window.game.scene.keys.Battle.enemy.hp = 1
  })
  const koGrind = async () => {
    for (let i = 0; i < 40; i++) {
      const st = await state()
      if (st.eko || st.over) return st
      const key = st.ex > st.px ? 'ArrowRight' : 'ArrowLeft'
      await page.keyboard.down(key)
      await page.waitForTimeout(220)
      await page.keyboard.up(key)
      await tap('a')
      await page.waitForTimeout(160)
    }
    return state()
  }
  const koState = await koGrind()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SHOTS}/04-ko-menu.png` })
  check('KO ends the round', koState.eko && koState.over)

  await page.waitForTimeout(1200)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)
  const s5 = await state()
  const rematchNames = await page.evaluate(() => {
    const s = window.game.scene.keys.Battle
    return `${s.player.name} vs ${s.enemy.name}`
  })
  check(
    'ENTER rematch resets the fight with the same matchup',
    s5.php === s5.pmax && s5.ehp === s5.emax && !s5.over && rematchNames === 'Luke Skywalker vs Darth Vader',
    rematchNames,
  )

  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  check('ESC pauses the battle', await page.evaluate(() => window.game.scene.isPaused('Battle')))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  check(
    'ESC on the pause menu resumes',
    await page.evaluate(() => !window.game.scene.isPaused('Battle')),
  )

  // End-of-match "Change Character" returns to the select screen.
  await page.evaluate(() => {
    window.game.scene.keys.Battle.enemy.hp = 1
  })
  await koGrind()
  await page.waitForTimeout(1300)
  await page.keyboard.press('c')
  await page.waitForTimeout(500)
  check(
    'C after the match returns to character select',
    await page.evaluate(() => window.game.scene.isActive('Select')),
  )

  check('no console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  await page.close()

  // ---------- Touch device: blaster character (Han) fires real bolts ----------
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

  const tapCard = async (id) => {
    const pos = await tp.evaluate(
      (cid) => window.game.scene.keys.Select.cards.find((c) => c.id === cid),
      id,
    )
    await tp.touchscreen.tap(pos.x, pos.y)
    await tp.waitForTimeout(200)
  }
  await tapCard('han')
  await tapCard('chewbacca')
  await tp.waitForTimeout(700)
  await tp.screenshot({ path: `${SHOTS}/05-touch-ui.png` })

  check(
    'touch select works and touch controls appear',
    await tp.evaluate(() => {
      const s = window.game.scene.keys.Battle
      return !!s.touch && s.player.name === 'Han Solo'
    }),
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
  const before = await tp.evaluate(() => {
    const s = window.game.scene.keys.Battle
    return { stam: s.player.stamina, ehp: s.enemy.hp }
  })
  await tp.touchscreen.tap(896, 476) // ATK button
  await tp.waitForTimeout(120)
  const boltCount = await tp.evaluate(() => window.game.scene.keys.Battle.projectiles.bolts.length)
  check('tapping ATK as a blaster fires a bolt', boltCount > 0, `${boltCount} bolt(s) in flight`)

  await tp.waitForTimeout(1600)
  const after = await tp.evaluate(() => {
    const s = window.game.scene.keys.Battle
    return { stam: s.player.stamina, ehp: s.enemy.hp }
  })
  check(
    'bolt crosses the arena and damages the parked enemy',
    after.ehp < before.ehp,
    `enemy HP ${before.ehp} -> ${after.ehp}`,
  )
  check('no touch-context errors', terrors.length === 0, terrors.slice(0, 3).join(' | '))
} finally {
  if (browser) await browser.close()
  spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
}

const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
