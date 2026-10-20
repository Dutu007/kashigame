// Optional browser integration check against the standalone game server.
const assert = require('node:assert/strict');
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
    await page.goto(base + '?entry=map&chapter=weave&hero=aide');
    const intro = page.frameLocator('#chapterMount iframe');
    await intro.locator('.background').waitFor();
    assert.equal(await intro.locator('#stage').evaluate(el => el.classList.contains('play')), false);
    await page.evaluate(() => GameApp.resume());
    await intro.locator('#stage.play').waitFor();
    await intro.locator('.row-5 .story-text').evaluate(el => new Promise(resolve => {
      if (getComputedStyle(el).opacity === '1') return resolve();
      el.addEventListener('animationend', resolve, { once: true });
    }));
    if (process.env.INTRO_SCREENSHOT) await page.screenshot({ path: process.env.INTRO_SCREENSHOT });
    await intro.locator('#board').waitFor({ timeout: 20000 });
    const child = page.frames().find(frame => /weave-lane\/index.html/.test(frame.url()));
    await child.waitForFunction(() => typeof state !== 'undefined' && typeof LevelOneProgress !== 'undefined');
    assert.equal(await child.evaluate(() => state.character), 'aide');
    await child.evaluate(() => { state.quest = true; LevelOneProgress.save(); });
    // The map entry hides the game bar, so the chapter leaves through the same handler.
    await page.evaluate(() => document.getElementById('backToMenu').click());
    await page.goto(base);
    await page.locator('#enterWeave').click();
    await intro.locator('#board').waitFor({ timeout: 20000 });
    const restored = page.frames().find(frame => /weave-lane\/index.html/.test(frame.url()));
    await restored.waitForFunction(() => typeof state !== 'undefined' && typeof LevelOneProgress !== 'undefined');
    assert.equal(await restored.evaluate(() => state.quest), true);
    assert.equal(page.frames().some(frame => frame.url().includes('/intro/')), false, 'Continuing does not replay the opening');
    await page.reload();
    await intro.locator('#board').waitFor();
    assert.equal(page.frames().some(frame => frame.url().includes('/intro/')), false, 'Refreshing resumes directly');
    const earlyExit = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await earlyExit.goto(base);
    await earlyExit.locator('#enterWeave').click();
    await earlyExit.frameLocator('#chapterMount iframe').locator('#stage.play').waitFor();
    await earlyExit.evaluate(() => document.getElementById('backToMenu').click());
    assert.equal(await earlyExit.locator('#chapterMount iframe').count(), 0);
    await earlyExit.close();
    assert.deepEqual(errors, []);
    console.log('PASS: first-entry intro waits for map, completes automatically, preserves hero/save, continuing skips replay, and early exit works');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
