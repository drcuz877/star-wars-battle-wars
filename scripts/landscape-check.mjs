// Sanity check for the iOS Safari landscape-cutoff fix: loads the game at
// an iPhone-landscape-sized viewport and confirms the canvas fully fits
// within the window bounds. Headless browsers don't reproduce Mobile
// Safari's dynamic address-bar chrome, so this can't recreate the exact
// bug Drew hit on-device — it's a layout sanity check, not proof.
import { chromium } from 'playwright'

const URL = process.argv[2] ?? 'http://localhost:5173/star-wars-battle-wars/'

for (const [name, launchOpts] of [['edge', { channel: 'msedge' }]]) {
  const browser = await chromium.launch(launchOpts)
  // iPhone 13 landscape logical viewport (844x390), with a touch context.
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true })
  await page.goto(URL)
  await page.waitForSelector('canvas', { timeout: 10000 })
  await page.waitForTimeout(700)
  const rect = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { top: r.top, left: r.left, bottom: r.bottom, right: r.right, w: innerWidth, h: innerHeight }
  })
  const fits = rect.top >= -1 && rect.left >= -1 && rect.bottom <= rect.h + 1 && rect.right <= rect.w + 1
  console.log(`[${name}] canvas rect`, rect, fits ? '-> fits' : '-> OVERFLOWS VIEWPORT')
  await page.screenshot({ path: `verify-artifacts/landscape-${name}.png` })
  await browser.close()
}
