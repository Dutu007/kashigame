// Optional production browser check; requires Playwright and installed Chrome.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.GAME_URL || 'http://localhost:4173/';
const output = path.resolve(__dirname, '../output');
fs.mkdirSync(output, { recursive: true });

async function enterChapter(page, region, chapter) {
  await page.locator('.region-hit').nth(region).click();
  await page.locator('.chapter-loading').waitFor({ state: 'hidden', timeout: 30000 });
  const hostFrame = await page.locator('.game-overlay iframe').elementHandle().then(element => element.contentFrame());
  await hostFrame.waitForLoadState('load');
  const child = page.frames().find(frame => frame.url().includes(chapter));
  assert.ok(child, `Missing chapter frame: ${chapter}`);
  await child.waitForLoadState('load');
  return { host: hostFrame, child };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let lastPage;
  try {
    for (const [selection, hero] of [['male', 'aide'], ['female', 'aysu']]) {
      const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      const page = await context.newPage();
      lastPage = page;
      const errors = [], missing = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) missing.push(`${response.status()} ${response.url()}`);
      });
      await page.goto(base);
      await page.locator('.start-button').click();
      await page.getByRole('button', { name: selection === 'male' ? /选择男性角色/ : /选择女性角色/ }).click();
      await page.getByRole('button', { name: '开始旅程', exact: true }).click();
      await page.locator('.map-page').waitFor({ state: 'visible', timeout: 30000 });
      assert.equal(await page.locator('.map-page').getAttribute('data-player-character'), selection);
      if (hero === 'aide') await page.screenshot({ path: path.join(output, 'merge-map.png') });

      await page.locator('.region-hit').first().click();
      await page.locator('.level-preview').waitFor({ state: 'visible' });
      await page.waitForFunction(() => document.querySelector('.preview-art img')?.naturalWidth > 0);
      await page.locator('.preview-close').click();

      let { host, child } = await enterChapter(page, 2, 'levels/weave-lane/');
      assert.equal(await host.evaluate(() => Campaign.snapshot().character), hero);
      assert.equal(await child.locator('#characterSetup').isVisible(), false, 'Map selection must skip chapter character setup');
      assert.equal(await child.evaluate(() => state.character), hero);
      await child.evaluate(() => { state.quest = true; LevelOneProgress.save(); });
      await page.getByRole('button', { name: '‹ 返回小镇地图', exact: true }).click();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('twc_l1_save')).state.quest), true);
      ({ child } = await enterChapter(page, 2, 'levels/weave-lane/'));
      assert.equal(await child.evaluate(() => state.quest), true);
      assert.equal(await child.locator('#characterSetup').isVisible(), false, 'Reopening must skip chapter character setup');
      assert.equal(await child.evaluate(() => state.character), hero);
      await page.getByRole('button', { name: '‹ 返回小镇地图', exact: true }).click();

      ({ host, child } = await enterChapter(page, 6, 'karez.html'));
      await child.waitForFunction(() => typeof game !== 'undefined' && game.scene.isActive('Surface') && game.scene.getScene('Surface').player);
      assert.equal(await host.evaluate(() => Campaign.snapshot().character), hero);
      assert.equal(await child.evaluate(() => game.scene.getScene('Surface').player.heroId), hero);
      await page.getByRole('button', { name: '‹ 返回小镇地图', exact: true }).click();
      assert.ok(await page.evaluate(() => localStorage.getItem('twc_l2_save')));
      assert.deepEqual(errors, [], `JavaScript errors for ${selection}`);
      assert.deepEqual(missing, [], `Missing production assets for ${selection}`);
      console.log(`PASS ${selection}: production home, selection, preview, both map chapters, shared hero, save and reopen`);
      await context.close();
    }
  } catch (error) {
    if (lastPage && !lastPage.isClosed()) await lastPage.screenshot({ path: path.join(output, 'map-failure.png') }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
