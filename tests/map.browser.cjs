// Optional production browser check; requires Playwright and installed Chrome.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const karezStateAt = require('../game/tests/karez-fixture.cjs');
const base = process.env.GAME_URL || 'http://localhost:4173/';
const output = path.resolve(__dirname, '../output');
fs.mkdirSync(output, { recursive: true });

async function enterChapter(page, levelId, chapter) {
  const firstWeaveEntry = chapter === 'levels/weave-lane/' && await page.evaluate(() =>
    !JSON.parse(localStorage.getItem('twc_campaign_v1'))?.started?.weave);
  await page.locator('#level-' + levelId).click();
  if (chapter === 'levels/weave-lane/') {
    await page.frameLocator('.chapter-loading iframe').locator('#knot').waitFor();
  } else {
    await page.locator('.chapter-loading [role="progressbar"]').waitFor();
  }
  await page.locator('.chapter-loading').waitFor({ state: 'hidden', timeout: 30000 });
  const hostFrame = await page.locator('.game-overlay iframe').elementHandle().then(element => element.contentFrame());
  await hostFrame.waitForLoadState('load');
  if (firstWeaveEntry) {
    const intro = page.frames().find(frame => frame.url().includes('/intro/'));
    assert.ok(intro, 'Weave chapter must begin with the supplied transition');
    await intro.locator('#stage.play').waitFor();
    await page.waitForFunction(() => {
      const host = document.querySelector('.game-overlay iframe')?.contentDocument;
      return host?.querySelector('#chapterMount iframe')?.contentDocument?.querySelector('#board');
    }, null, { timeout: 20000 });
  }
  const child = page.frames().find(frame => frame.url().includes(chapter) && !frame.url().includes('/intro/'));
  assert.ok(child, `Missing chapter frame: ${chapter}`);
  await child.waitForLoadState('load');
  return { host: hostFrame, child };
}

// Report to the keeper from the last checkpoint and let the chapter close itself.
async function finishKarez(child, page) {
  await child.evaluate(state => {
    G.state = state;
    game.scene.getScene('Surface').player.x = SURF.npcX + 80;
    game.scene.getScene('Surface').talkKeeper();
  }, karezStateAt(8));
  await child.waitForFunction(() => G.ui.dialogue.isOpen);
  for (let i = 0; i < 12 && await child.evaluate(() => G.ui.dialogue.isOpen); i++) {
    await child.evaluate(() => G.ui.dialogue.advance());
    await page.waitForTimeout(80);
  }
  await page.locator('.game-overlay').waitFor({ state: 'detached', timeout: 30000 });
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
      if (hero === 'aide') {
        await page.getByRole('button', { name: '查看游戏玩法公告', exact: true }).click();
        await page.getByRole('tab', { name: '地图探索', exact: true }).click();
        await page.locator('.map-notice-content').evaluate(image => image.decode());
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
      }
      await page.getByRole('button', { name: '开始探索', exact: true }).click();
      await page.getByRole('button', { name: selection === 'male' ? /选择男性角色/ : /选择女性角色/ }).click();
      await page.getByRole('button', { name: '开始旅程', exact: true }).click();
      await page.locator('.map-page').waitFor({ state: 'visible', timeout: 30000 });
      assert.equal(await page.locator('.map-page').getAttribute('data-player-character'), selection);
      if (hero === 'aide') await page.screenshot({ path: path.join(output, 'merge-map.png') });

      assert.equal(await page.locator('.region-hit').count(), 5);
      for (const levelId of [3, 4, 5]) {
        await page.locator('#level-' + levelId).click();
        await page.locator('.level-preview').waitFor({ state: 'visible' });
        await page.locator('.scenery-art').evaluate(image => image.decode());
        assert.match(await page.locator('.scenery-status').innerText(), /玩法尚未开放/);
        assert.equal(await page.locator('.game-overlay').count(), 0);
        await page.keyboard.press('Escape');
      }

      let { host, child } = await enterChapter(page, 1, 'levels/weave-lane/');
      assert.equal(await host.evaluate(() => Campaign.snapshot().character), hero);
      assert.equal(await child.locator('#characterSetup').isVisible(), false, 'Map selection must skip chapter character setup');
      assert.equal(await child.evaluate(() => state.character), hero);
      await child.evaluate(() => { state.quest = true; LevelOneProgress.save(); });
      await page.getByRole('button', { name: '‹ 返回小镇地图', exact: true }).click();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('twc_l1_save')).state.quest), true);
      ({ child } = await enterChapter(page, 1, 'levels/weave-lane/'));
      assert.equal(await child.evaluate(() => state.quest), true);
      assert.equal(await child.locator('#characterSetup').isVisible(), false, 'Reopening must skip chapter character setup');
      assert.equal(await child.evaluate(() => state.character), hero);
      await page.getByRole('button', { name: '‹ 返回小镇地图', exact: true }).click();

      ({ host, child } = await enterChapter(page, 2, 'karez.html'));
      await child.waitForFunction(() => typeof game !== 'undefined' && game.scene.isActive('Surface') && game.scene.getScene('Surface').player
        && typeof G !== 'undefined' && G.ui && !KarezTransitions.active, null, { timeout: 30000 });
      assert.equal(await host.evaluate(() => Campaign.snapshot().character), hero);
      assert.equal(await child.evaluate(() => game.scene.getScene('Surface').player.heroId), hero);

      // The keeper's final report closes the chapter and hands the map level list back.
      await finishKarez(child, page);
      assert.equal(await page.locator('.map-page').isVisible(), true);
      assert.equal(await page.locator('.game-overlay').count(), 0);
      await page.locator('.map-notice').waitFor({ state: 'visible', timeout: 5000 });
      assert.match(await page.locator('.map-notice').innerText(), /坎儿井 · 完成/);
      assert.ok(await page.evaluate(() => localStorage.getItem('twc_l2_save')));
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('twc_campaign_v1')).completed.karez), true);
      if (hero === 'aide') await page.screenshot({ path: path.join(output, 'map-karez-complete.png') });
      await page.locator('.map-notice').waitFor({ state: 'detached', timeout: 8000 });

      // Re-entering from the map still works and starts a fresh run.
      ({ child } = await enterChapter(page, 2, 'karez.html'));
      await child.waitForFunction(() => typeof game !== 'undefined' && game.scene.isActive('Surface') && game.scene.getScene('Surface').player);
      assert.equal(await child.evaluate(() => G.state.recordSaved), false);
      await page.getByRole('button', { name: '‹ 返回小镇地图', exact: true }).click();
      assert.deepEqual(errors, [], `JavaScript errors for ${selection}`);
      assert.deepEqual(missing, [], `Missing production assets for ${selection}`);
      console.log(`PASS ${selection}: production home, selection, preview, both map chapters, shared hero, keeper report returns to the map, save and reopen`);
      await context.close();
    }
  } catch (error) {
    if (lastPage && !lastPage.isClosed()) await lastPage.screenshot({ path: path.join(output, 'map-failure.png') }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
