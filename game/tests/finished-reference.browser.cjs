// Optional live UI check for the four reference skins.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.GAME_URL || 'http://localhost:8123/';
const output = path.resolve(__dirname, '../../output/finished-reference');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) errors.push(response.url());
    });
    await page.goto(base + 'levels/weave-lane/');
    await page.locator('#startJourney').click();
    await page.evaluate(() => {
      closeDialogue();
      state.patternPlan = defaultPlan(blueprintById('p01'));
      openWorkshop('threading');
      showPuzzleView();
      setPuzzleOrder([1,0,2,3,4,5,6,7]);
    });
    await page.waitForFunction(() => grayReady());
    await page.locator('#puzzleRef').evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300); // Allow the strip-position animation to settle.
    await page.screenshot({ path: path.join(output, 'puzzle-desktop.png') });
    // Solve the last swapped pair with real pointer input in the resized board.
    const strip = page.locator('.puzzle-strip[data-strip="1"]');
    const box = await strip.boundingBox();
    const step = await page.evaluate(() => puzzleState.step);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + step, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.locator('#freezeOverlay.show').waitFor();
    await page.waitForTimeout(400); // Capture the fully opaque completion frame.
    await page.screenshot({ path: path.join(output, 'blank-complete-desktop.png') });
    await page.waitForFunction(() => !document.querySelector('#freezeOverlay').classList.contains('show'));
    assert.equal(await page.evaluate(() => state.boundWarp), true);
    await page.evaluate(() => { closeDialogue(); openWorkshop('dye'); });
    await page.waitForFunction(() => cs?.rec);
    await page.evaluate(() => {
      for (const region of regionTemplate(cs.tplId).regions) {
        cs.committed[region.id] = region.id === 0 ? '#f3e6c8' : '#c14a36';
        cs.touched[region.id] = true;
      }
      updateUndoRedo();
    });
    await page.locator('#btnPreview').click();
    await page.locator('#hangingOverlay').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(output, 'hanging-desktop.png') });
    const first = await page.locator('#hangingCanvas').evaluate(canvas => canvas.toDataURL());
    await page.locator('#hangingBack').click();
    await page.evaluate(() => {
      for (const id in cs.committed) if (Number(id) !== 0) cs.committed[id] = '#247e83';
    });
    await page.locator('#btnPreview').click();
    assert.notEqual(await page.locator('#hangingCanvas').evaluate(canvas => canvas.toDataURL()), first);
    await page.locator('#hangingConfirm').click();
    await page.locator('#performSkip').click();
    await page.waitForFunction(() => state.dyedWarp);
    await page.evaluate(() => {
      closeDialogue(); closeWorkshop(); state.woven = true; state.silkCollected = false; openCompare();
    });
    await page.screenshot({ path: path.join(output, 'compare-desktop.png') });
    assert.equal(await page.locator('#silkOriginLabel').textContent(), '蓝本 · 杏花卷草');
    // Inspect the responsive fallback before collecting the actual player artwork.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'compare-mobile.png') });
    await page.locator('#silkCollect').click();
    assert.equal(await page.evaluate(() => state.silkCollected && state.collection.length === 1), true);
    await page.evaluate(() => { closeDialogue(); openWorkshop('threading'); showPuzzleView(); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(output, 'puzzle-mobile.png') });
    assert.ok(await page.locator('#puzzleBoard').evaluate(el => el.getBoundingClientRect().right <= innerWidth));
    assert.deepEqual(errors, []);
    console.log('PASS: live puzzle drag, completion frame, changing preview colors, confirmation, collection and mobile layouts');
  } catch (error) {
    console.error(error);
    throw error;
  } finally { await browser.close(); }
})().catch(() => { process.exitCode = 1; });
