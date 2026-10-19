// Optional browser integration check: requires Playwright and installed Chrome.
// Run against an isolated browser profile; existing player saves are never touched.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const karezStateAt = require('./karez-fixture.cjs');
const base = process.env.GAME_URL || 'http://localhost:8123/';
const output = path.resolve(__dirname, '../output');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let lastPage;
  try {
    for (const hero of ['aide', 'aysu']) {
      const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      await context.addInitScript(() => {
        localStorage.setItem('twc_tools', '1');
        localStorage.setItem('twc_groundcal', JSON.stringify({ UA_pre: [[0, -3000], [3072, -3000]] }));
      });
      const page = await context.newPage();
      lastPage = page;
      const errors = [], missing = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) missing.push(`${response.status()} ${response.url()}`); });
      // Old developer URLs must neither unlock levels nor display a false clear.
      await page.goto(base + '?chapter=karez&ground=1&reset=1&tools=1');
      assert.equal(await page.locator('iframe').count(), 0);
      assert.equal(await page.locator('#enterKarez').isDisabled(), true);
      await page.goto(base + '?completed=weave');
      assert.equal(await page.locator('#completion').isVisible(), false);
      await page.goto(base);
      assert.equal(await page.locator('#enterKarez').isDisabled(), true);
      if (hero === 'aide') await page.screenshot({ path: path.join(output, 'merged-menu.png'), fullPage: true });
      await page.locator('#enterWeave').click();
      let first = await chapterFrame(page, 'levels/weave-lane/');
      await first.locator('#choice-' + hero).click();
      await first.locator('#startJourney').click();
      await first.locator('#skipButton').click();
      await first.waitForFunction(id => state.character === id && !state.busy, hero);
      await first.evaluate(() => {
        state.quest = true;
        state.patternPlan = defaultPlan(blueprintById('p01'));
        threadState.round = 1;
        threadState.path = threadVariants[1][0].slice(0, 3);
        LevelOneProgress.save();
      });
      await page.locator('#backToMenu').click();
      await page.locator('#enterWeave').click();
      first = await chapterFrame(page, 'levels/weave-lane/');
      await first.waitForFunction(() => typeof state !== 'undefined' && !state.busy);
      const restored = await first.evaluate(() => ({ character: state.character, quest: state.quest, round: threadState.round, path: threadState.path, selecting: !$('characterSetup').hidden }));
      assert.equal(restored.character, hero); assert.equal(restored.quest, true);
      assert.equal(restored.round, 1); assert.equal(restored.path.length, 3); assert.equal(restored.selecting, false);
      await first.waitForFunction(() => framesFor('idle')[0].complete && framesFor('idle')[0].naturalWidth > 0);
      await page.locator('#loading').waitFor({ state: 'hidden' });
      await page.screenshot({ path: path.join(output, `weave-${hero}.png`) });
      await page.goto(base + '?chapter=weave');
      first = await chapterFrame(page, 'levels/weave-lane/');
      await first.waitForFunction(() => typeof state !== 'undefined' && !state.busy);
      assert.equal(await first.evaluate(() => state.character), hero);
      // Open the dye workshop from a prepared warp, then use its real completion UI.
      await first.evaluate(() => { state.boundWarp = true; loadScene(5); openWorkshop('dye'); });
      await first.waitForFunction(() => cs?.rec);
      if (hero === 'aide') {
        // Cropped tint rendering must preserve the original material/mask pixels.
        const maxDifference = await first.evaluate(() => {
          const rec = cs.rec;
          let max = 0;
          for (const rid of [rec.t.drawOrder[0], rec.t.drawOrder[40], rec.t.drawOrder.at(-1)]) {
            const tint = getRegionTint(rec, rid, '#3f967e');
            const full = paintRegionFull(rec, rid, '#3f967e');
            const expected = full.getContext('2d').getImageData(tint.bx, tint.by, tint.canvas.width, tint.canvas.height).data;
            const actual = tint.canvas.getContext('2d').getImageData(0, 0, tint.canvas.width, tint.canvas.height).data;
            for (let i = 0; i < actual.length; i++) max = Math.max(max, Math.abs(expected[i] - actual[i]));
          }
          return max;
        });
        assert.ok(maxDifference <= 1, `Tint pixels changed by ${maxDifference}`);
      }
      await first.locator('.dye-dish').first().click();
      await first.evaluate(() => applyColor(cs.rec.t.regions.find(r => r.id !== 0).id, 100, 100));
      await first.locator('#btnPreview').click();
      await first.locator('#hangingConfirm').click();
      await first.locator('#confirmYes').click();
      await first.locator('#performSkip').click();
      await first.locator('#compareOverlay').waitFor({ state: 'visible' });
      if (hero === 'aide') await page.screenshot({ path: path.join(output, 'weave-collection.png') });
      await first.locator('#coloringStage').dispatchEvent('pointerleave');
      const receiptPosition = await first.evaluate(() => [state.x, state.y]);
      await page.keyboard.down('d'); await page.waitForTimeout(150); await page.keyboard.up('d');
      assert.deepEqual(await first.evaluate(() => [state.x, state.y]), receiptPosition);
      await page.locator('#backToMenu').click(); await page.locator('#enterWeave').click();
      first = await chapterFrame(page, 'levels/weave-lane/');
      await first.locator('#compareOverlay').waitFor({ state: 'visible' });
      assert.equal(await first.evaluate(() => state.busy), true);
      await page.reload();
      first = await chapterFrame(page, 'levels/weave-lane/');
      await first.locator('#compareOverlay').waitFor({ state: 'visible' });
      await first.locator('#silkCollect').click();
      await first.evaluate(() => collectSilk()); // A repeated click cannot duplicate the receipt.
      assert.equal(await first.evaluate(() => state.collection.length), 1);
      assert.equal(await first.evaluate(() => state.silkCollected), true);
      await page.reload();
      first = await chapterFrame(page, 'levels/weave-lane/');
      await first.waitForFunction(() => typeof state !== 'undefined' && !state.busy);
      assert.equal(await first.locator('#compareOverlay').isVisible(), false);
      assert.equal(await first.evaluate(() => state.collection.length), 1);
      await first.evaluate(() => startMemory());
      await first.locator('#memoryCurtain').click();
      await first.waitForFunction(() => state.chapterComplete && state.dialogueOpen);
      await first.locator('#skipButton').click();
      await page.locator('#completion').waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => Campaign.snapshot().completed.weave), true);
      console.log(`PASS ${hero}: dye rendering, pending/collected receipt reloads, duplicate prevention, first-chapter completion`);
      await page.locator('#completionNext').click();
      assert.equal(new URL(page.url()).searchParams.has('chapter'), false);
      assert.equal(new URL(page.url()).hash, '#karez');
      let second = await chapterFrame(page, 'karez.html');
      await readyKarez(second, 'Surface');
      let actor = await second.evaluate(() => {
        const s = game.scene.getScene('Surface');
        return { hero: s.player.heroId, texture: s.player.texture.key, npc: s.npc.texture.key, height: s.player.displayHeight };
      });
      assert.equal(actor.hero, hero); assert.ok(actor.texture.startsWith(`hero:${hero}:`)); assert.equal(actor.npc, 'npc');
      assert.ok(actor.height > 180 && actor.height < 220);
      await page.waitForTimeout(2700);
      await page.screenshot({ path: path.join(output, `karez-surface-${hero}.png`) });
      await page.locator('iframe').click({ position: { x: 900, y: 400 } });
      await page.keyboard.down('d'); await page.waitForTimeout(220);
      actor = await second.evaluate(() => { const p = game.scene.getScene('Surface').player; return { texture: p.texture.key, moving: p.anims.isPlaying }; });
      assert.ok(actor.texture.includes('walkRight')); assert.equal(actor.moving, true);
      await page.keyboard.up('d'); await page.waitForTimeout(120);
      assert.equal(await second.evaluate(() => game.scene.getScene('Surface').player.anims.isPlaying), false);
      await page.keyboard.down('a'); await page.waitForTimeout(220);
      assert.ok((await second.evaluate(() => game.scene.getScene('Surface').player.texture.key)).includes('walkLeft'));
      await page.keyboard.up('a');
      await page.keyboard.press('Space', { delay: 80 }); await page.waitForTimeout(150);
      assert.equal(await second.evaluate(() => game.scene.getScene('Surface').onGround), false);
      await page.waitForTimeout(850);
      // Exiting through the host must flush unsaved live workshop progress.
      await second.evaluate(st => {
        G.state = st;
        G.state.ladderWorkshopDone = true;
        G.ui.openWorkshop('lamp');
        const lamp = game.scene.getScene('UI').workshop.lampGame;
        lamp.craft.presses = 3;
        lamp.forming.model.progress = 0.37;
        lamp.firing.model.elapsed = 9.25;
        lamp.firing.model.started = true;
      }, karezStateAt(3));
      await page.locator('#backToMenu').click();
      const craft = await page.evaluate(() => Campaign.read('twc_l2_save').s.lampCraft);
      assert.equal(craft.presses, 3);
      assert.equal(craft.forming.progress, 0.37);
      assert.equal(craft.firing.elapsed, 9.25);
      await page.goto(base + '?chapter=karez&reset=1&ground=1&seg=UC&tools=1');
      second = await chapterFrame(page, 'karez.html'); await readyKarez(second, 'Surface');
      assert.equal(await second.evaluate(() => G.state.lampCraft.firing.elapsed), 9.25);
      assert.equal(new URL(second.url()).search, '');
      await second.evaluate(() => G.ui.openWorkshop('lamp'));
      assert.equal(await second.evaluate(() => game.scene.getScene('UI').workshop.lampGame.forming.model.progress), 0.37);
      await second.evaluate(() => game.scene.getScene('UI').workshop.cancel());
      await page.locator('iframe').click({ position: { x: 900, y: 400 } });
      await page.keyboard.press('F2');
      assert.equal(await second.evaluate(() => typeof DebugPanel), 'undefined');
      // Inject test-only milestone fixtures to exercise descent, light and ascent.
      await second.evaluate(st => { G.state = st; game.scene.getScene('Surface').player.x = SURF.wells[0]; }, karezStateAt(4));
      await page.keyboard.press('e', { delay: 80 });
      await readyKarez(second, 'Tunnel');
      assert.ok(await second.evaluate(() => groundUAt('UA', 700) > 600), 'Stale calibration must not change the ground');
      await page.waitForTimeout(500);
      await page.keyboard.press('f', { delay: 80 }); await page.waitForTimeout(120);
      assert.equal(await second.evaluate(() => G.state.lampOn), true);
      await page.keyboard.down('a'); await page.waitForTimeout(200); await page.keyboard.up('a'); await page.waitForTimeout(100);
      const lamp = await second.evaluate(() => { const s = game.scene.getScene('Tunnel'); return { hero: s.player.heroId, facing: s.player.facing, lamp: s.lampImg.texture.key, x: s.lampImg.x, playerX: s.player.x }; });
      assert.equal(lamp.hero, hero); assert.equal(lamp.facing, -1); assert.equal(lamp.lamp, 'LAMP_L'); assert.ok(lamp.x < lamp.playerX);
      await page.screenshot({ path: path.join(output, `karez-tunnel-${hero}.png`) });
      await page.locator('#backToMenu').click(); await page.locator('#continueJourney').click();
      second = await chapterFrame(page, 'karez.html'); await readyKarez(second, 'Tunnel');
      assert.equal(await second.evaluate(() => G.state.lastSeg), 'UA');
      assert.equal(await second.evaluate(() => game.scene.getScene('Tunnel').player.heroId), hero);
      await page.locator('iframe').click({ position: { x: 900, y: 400 } });
      await page.waitForTimeout(500); await page.keyboard.press('e', { delay: 80 });
      await readyKarez(second, 'Surface');
      await second.evaluate(st => { G.state = st; game.scene.getScene('Surface').player.x = SURF.npcX + 80; }, karezStateAt(8));
      await page.waitForTimeout(450); await page.keyboard.press('e', { delay: 80 });
      await second.waitForFunction(() => G.ui.dialogue.isOpen);
      await page.waitForTimeout(300); // The dialogue deliberately ignores its opening key for 200 ms.
      for (let i = 0; i < 10 && await second.evaluate(() => G.ui.dialogue.isOpen); i++) {
        await page.keyboard.press('e', { delay: 80 }); await page.waitForTimeout(240);
      }
      await page.locator('#completion').waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => Campaign.snapshot().completed.karez), true);
      await page.locator('#completionNext').click();
      assert.equal(await page.locator('#enterKarez').isDisabled(), false);
      assert.match(await page.locator('#karezStatus').innerText(), /已完成/);
      assert.deepEqual(errors, [], `JavaScript errors for ${hero}`);
      assert.deepEqual(missing, [], `Missing assets for ${hero}`);
      console.log(`PASS ${hero}: locked routes, selection, dye/receipt exit and reload, no duplicate receipt, workshop checkpoint, chapter transitions, movement, NPC placeholder, lamp facing, tunnel resume, both completions`);
      await context.close();
    }
  } catch (error) {
    if (lastPage && !lastPage.isClosed()) await lastPage.screenshot({ path: path.join(output, 'campaign-failure.png') }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

async function chapterFrame(page, match) {
  await page.waitForFunction(part => { const f = document.querySelector('iframe'); const url = f?.contentWindow?.location.href; return url?.includes(part) && !url.includes('/intro/'); }, match);
  const frame = page.frames().find(frame => frame.url().includes(match));
  await frame.waitForLoadState('load');
  return frame;
}
async function readyKarez(frame, scene) {
  await frame.waitForFunction(key => typeof game !== 'undefined' && game.scene?.isActive(key) && game.scene.getScene(key).player && typeof G !== 'undefined' && G.ui, scene, { timeout: 30000 });
}
