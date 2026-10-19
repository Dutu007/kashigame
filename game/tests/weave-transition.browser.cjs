// Optional browser check: GAME_URL points to the standalone game directory.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.GAME_URL || 'http://localhost:8123/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) errors.push(response.url());
    });
    // Simulate a browser retaining the previous script at its old cache URL.
    await page.route('**/js/core/world.js?v=merged2', route => route.fulfill({
      contentType: 'application/javascript', body: 'throw new Error("stale world script requested")',
    }));
    await page.goto(base + 'levels/weave-lane/');
    await page.evaluate(() => {
      const originalLoadScene = loadScene;
      window.transitionCovers = [];
      loadScene = function (...args) {
        if (WeaveMapTransition.active) {
          const overlay = document.getElementById('weaveMapTransition');
          transitionCovers.push({ phase: overlay?.dataset.phase, opacity: overlay && getComputedStyle(overlay).opacity });
        }
        return originalLoadScene(...args);
      };
    });
    await page.locator('#startJourney').click();
    await page.evaluate(() => closeDialogue());
    const count = await page.evaluate(() => scenes.length);
    for (let target = 1; target < count; target++) {
      const start = Date.now();
      await page.evaluate(n => {
        closeDialogue();
        const source = scenes.findIndex(s => [...s.points, ...s.portals].some(p => p.to === n));
        loadScene(source);
        state.portalLock = null;
        const scene = scenes[source];
        const point = scene.points.find(p => p.to === n);
        const portal = scene.portals.find(p => p.to === n);
        const entrance = point || portal;
        state.x = entrance.x; state.y = entrance.y;
        if (point) interact(); else checkPortals();
        transitionToScene(0); // Repeated input must not start a second transition.
      }, target);
      await page.locator('#weaveMapTransition').waitFor();
      await page.waitForFunction(() => document.getElementById('weaveMapTransition')?.dataset.phase === 'covered');
      const visual = page.frameLocator('#weaveMapTransition iframe');
      await visual.locator('#knot').waitFor();
      await visual.locator('#bg').evaluate(image => image.decode());
      assert.equal(await page.locator('#wipe').count(), 0, 'Old text curtain is removed');
      assert.equal(await visual.locator('#knot').evaluate(el => getComputedStyle(el).animationName !== 'none'), true);
      assert.equal(await page.locator('#weaveMapTransition').count(), 1);
      await page.keyboard.press('e');
      assert.equal(await page.evaluate(() => keys.size), 0);
      if (target === 1 || target === 5) {
        const output = path.resolve(__dirname, '../../output');
        fs.mkdirSync(output, { recursive: true });
        await page.screenshot({ path: path.join(output, target === 5 ? 'weave-dye-transition.png' : 'weave-map-transition.png') });
      }
      await page.locator('#weaveMapTransition').waitFor({ state: 'detached', timeout: 15000 });
      assert.ok(Date.now() - start >= 3400, 'The complete knot cycle must be visible');
      assert.equal(await page.evaluate(() => state.scene), target);
      assert.equal(await page.evaluate(() => state.busy === state.dialogueOpen), true);
      assert.equal(await page.evaluate(() => keys.size), 0);
    }
    await page.evaluate(() => { closeDialogue(); LevelOneProgress.save(); });
    assert.deepEqual(await page.evaluate(() => transitionCovers), Array.from({ length: count - 1 }, () => ({ phase: 'covered', opacity: '1' })), 'Every map swap happens only under a fully opaque, decoded transition');
    const savedScene = await page.evaluate(() => state.scene);
    await page.reload();
    await page.waitForFunction(n => typeof state !== 'undefined' && state.scene === n, savedScene);
    assert.deepEqual(errors, []);
    console.log(`PASS: ${count - 1} internal Weave Lane map transitions, complete animation, input blocking, dialogue state, and checkpoint restore`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
