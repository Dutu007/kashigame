// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright ESM entry.
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
const out = fileURLToPath(new URL('../output/map-v3/', import.meta.url))
await mkdir(out, { recursive: true })
try {
  await page.goto(process.env.MAP_URL || 'http://127.0.0.1:5175/')
  await page.getByRole('button', { name: '开始探索', exact: true }).click()
  await page.getByRole('button', { name: '开始旅程', exact: true }).click()
  await page.locator('.city-artwork').waitFor({ timeout: 20000 })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: out + 'overview.png' })
  // Exercise actual polygon hit-testing, not just the label buttons.
  const points = [[18,60],[24,25],[50,49],[82,29],[89,72]]
  for (let i = 0; i < points.length; i++) {
    const box = await page.locator('.city-artwork').boundingBox()
    const [x,y] = points[i]
    await page.mouse.move(box.x + box.width*x/100, box.y + box.height*y/100)
    await page.waitForTimeout(1050)
    assert.equal(await page.locator('.district.awake').count(), 1)
    assert.equal(await page.locator('.district.awake').getAttribute('data-region'), String(i+1))
    await page.screenshot({ path: out + `chapter-${i+1}.png` })
    if (i >= 2) {
      await page.mouse.click(box.x + box.width*x/100, box.y + box.height*y/100)
      await page.getByRole('dialog').waitFor()
      await page.keyboard.press('Escape')
      await page.getByRole('dialog').waitFor({ state: 'hidden' })
    }
  }
  for (let n = 0; n < 20; n++) {
    const box = await page.locator('.city-artwork').boundingBox()
    const [x,y] = points[n%5]
    await page.mouse.move(box.x + box.width*x/100, box.y + box.height*y/100)
  }
  await page.mouse.move(700,15)
  await page.waitForTimeout(500)
  assert.equal(await page.locator('.district.awake').count(), 0)
  await page.waitForFunction(() => document.querySelectorAll('.memory-plaque').length === 0, null, { timeout: 2000 })
  assert.equal(await page.locator('.memory-plaque').count(), 0)
  assert.deepEqual(await page.locator('.district-light').evaluateAll(nodes => nodes.map(n => getComputedStyle(n).opacity)), ['0','0','0','0','0'])
  for (const [id, chapter] of [[1,'weave'],[2,'karez']]) {
    await page.locator('#level-'+id).click()
    await page.locator('.game-overlay iframe').waitFor()
    assert.match(await page.locator('.game-overlay iframe').getAttribute('src'), new RegExp('chapter='+chapter))
    await page.locator('.chapter-loading').waitFor({ state: 'hidden', timeout: 30000 })
    const inner = page.frameLocator('.game-overlay iframe').locator('#chapterMount iframe')
    assert.match(await inner.getAttribute('src'), id===1 ? /weave-lane/ : /karez.html/)
    await page.getByRole('button', { name: '返回小镇地图' }).click()
  }
  for (const size of [{width:1024,height:768},{width:390,height:844}]) {
    await page.setViewportSize(size)
    const box = await page.locator('.city-artwork').boundingBox()
    assert.ok(Math.abs(box.width/box.height - 1671/941)<.002)
    for (let id=1; id<=5; id++) {
      await page.locator('#level-'+id).focus()
      await page.locator('#level-'+id).scrollIntoViewIfNeeded()
      assert.equal(await page.locator('.district.awake').getAttribute('data-region'), String(id))
      if(id>=3) {
        await page.keyboard.press('Enter')
        await page.getByRole('dialog').waitFor()
        await page.keyboard.press('Escape')
      }
    }
    await page.waitForTimeout(600)
    await page.screenshot({ path: out + `viewport-${size.width}.png` })
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('#level-1').focus()
  assert.equal(await page.locator('.awake .ambient-breathe').evaluate(n=>getComputedStyle(n).animationName), 'none')
  assert.equal(await page.locator('.awake .district-light').evaluate(n=>getComputedStyle(n).transitionDuration), '0s')
  assert.deepEqual(errors, [])
  await writeFile(out+'verification.json', JSON.stringify({ passed: true, checked: ['real home-to-map flow','5 polygon hover targets','3 preview dialogs','2 actual chapter routes','rapid hover cleanup','1024 and 390 responsive keyboard navigation','reduced motion','no browser errors'] }, null, 2))
  console.log('Map V3 browser checks passed. Screenshots: '+out)
} finally { await browser.close() }
