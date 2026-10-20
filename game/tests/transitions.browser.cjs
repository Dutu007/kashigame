// Isolated browser checks for story timing, image composition and input hand-off.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const stateAt = require('./karez-fixture.cjs');
const base = process.env.GAME_URL || 'http://localhost:8243/';
const output = path.resolve(__dirname, '../output/transitions');
fs.mkdirSync(output, { recursive: true });

async function ready(page, scene) {
  await page.waitForFunction(key => typeof game !== 'undefined' && game.scene?.isActive(key) &&
    game.scene.getScene(key).player && G.ui && !KarezTransitions.active, scene);
}
async function card(page, id, screenshot) {
  await page.waitForFunction(key => {
    const root = document.getElementById('karez-transition');
    return !root.hidden && root.dataset.card === key && root.dataset.phase === 'playing';
  }, id);
  await page.evaluate(() => KarezTransitions.pause('qa'));
  await page.waitForTimeout(280);
  if (screenshot) await page.screenshot({ path: path.join(output, screenshot) });
}
async function skip(page, key = 'Escape') {
  await page.evaluate(() => KarezTransitions.resume('qa'));
  await page.keyboard.press(key);
  await page.waitForFunction(() => !KarezTransitions.active);
}
async function dialogue(page) {
  await page.waitForFunction(() => G.ui.dialogue.isOpen);
  await page.evaluate(() => {
    for (let i = 0; i < 50 && G.ui.dialogue.isOpen; i++) G.ui.dialogue.advance();
  });
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let lastPage;
  try {
    for (const hero of ['aide', 'aysu']) {
      const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      context.setDefaultNavigationTimeout(60000);
      await context.addInitScript(id => {
        if (!localStorage.getItem('twc_campaign_v1')) localStorage.setItem('twc_campaign_v1', JSON.stringify({
          version: 1, character: id, characterChosen: true, completed: { weave: true }, started: {},
        }));
      }, hero);
      const page = lastPage = await context.newPage();
      const errors = [], missing = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) missing.push(response.url()); });
      await page.goto(base + 'karez.html');
      await card(page, 'arrival', `arrival-${hero}.png`);
      assert.equal(await page.locator('.arrival-hero').getAttribute('data-character'), hero);
      const x = await page.evaluate(() => game.scene.getScene('Surface').player.x);
      await page.keyboard.down('d'); await page.waitForTimeout(180); await page.keyboard.up('d');
      assert.equal(await page.evaluate(() => game.scene.getScene('Surface').player.x), x);
      assert.equal(await page.evaluate(() => G.state.introDone), false);
      await skip(page, 'Space');
      assert.equal(await page.evaluate(() => G.ui.dialogue.isOpen), false);
      assert.equal(await page.evaluate(() => G.state.cutscenes.arrival), true);

      // Place a real first ladder and check that the card neither lights the lamp nor consumes a second ladder.
      await page.evaluate(st => {
        st.cutscenes = G.state.cutscenes; G.state = st;
        game.scene.getScene('Surface').player.x = SURF.wells[0];
      }, stateAt(4));
      await page.keyboard.press('e', { delay: 80 });
      await card(page, 'descend', hero === 'aide' ? 'descend.png' : null);
      assert.equal(await page.evaluate(() => G.state.lampOn), false);
      assert.equal(await page.evaluate(() => G.state.laddersLeft), 2);
      await page.keyboard.press('f');
      assert.equal(await page.evaluate(() => G.state.lampOn), false);
      await skip(page); await ready(page, 'Tunnel');
      assert.equal(await page.evaluate(() => G.state.lampOn), false);
      assert.equal(await page.evaluate(() => {
        const s = game.scene.getScene('Tunnel');
        return s.player.y - s.seg.groundY(s.player.x);
      }), 0);
      await page.waitForTimeout(450);
      await page.keyboard.press('e', { delay: 80 });
      await card(page, 'ascend', hero === 'aide' ? 'ascend.png' : null);
      await skip(page); await ready(page, 'Surface');
      await page.waitForTimeout(450);
      await page.keyboard.press('e', { delay: 80 });
      await page.waitForFunction(() => KarezTransitions.current?.id === 'descend');
      assert.equal(await page.evaluate(() => KarezTransitions.current.repeat), true);
      await ready(page, 'Tunnel');
      assert.equal(await page.evaluate(() => G.state.laddersLeft), 2);
      await page.waitForTimeout(500); await page.reload(); await ready(page, 'Tunnel');
      assert.equal(await page.evaluate(() => G.state.cutscenes.descend), true);
      assert.equal(await page.evaluate(() => G.state.lampOn), false);

      // A middle-segment repair only presents the middle segment's result.
      await page.evaluate(st => {
        st.cutscenes = G.state.cutscenes; st.ub.done = false; G.state = st;
        game.scene.getScene('Tunnel').scene.restart({ seg: 'UB' });
      }, stateAt(6));
      await page.waitForFunction(() => game.scene.getScene('Tunnel').segKey === 'UB' && game.scene.getScene('Tunnel').bg);
      await page.evaluate(() => game.scene.getScene('Tunnel').finishSilt());
      assert.equal(await page.evaluate(() => KarezTransitions.active), false);
      await dialogue(page);
      await card(page, 'silt-cleared', hero === 'aide' ? 'silt-cleared.png' : null);
      assert.equal(await page.evaluate(() => G.state.ub.done), true);
      assert.equal(await page.evaluate(() => G.state.uc.done), false);
      assert.equal(await page.evaluate(() => G.state.verified), false);
      await skip(page);

      // Completing repair alone does not play the verification illustration.
      await page.evaluate(st => {
        st.cutscenes = G.state.cutscenes; G.state = st;
        game.scene.getScene('Tunnel').scene.restart({ seg: 'UC' });
      }, stateAt(7));
      await page.waitForFunction(() => game.scene.getScene('Tunnel').segKey === 'UC');
      assert.equal(await page.evaluate(() => KarezTransitions.active), false);
      await page.evaluate(() => game.scene.getScene('Tunnel').tryVerify());
      await dialogue(page);
      await card(page, 'water-restored', hero === 'aide' ? 'water-restored.png' : null);
      assert.equal(await page.evaluate(() => G.state.verified), true);
      await skip(page);
      await page.evaluate(() => game.scene.getScene('Tunnel').scene.start('Surface', { spawnWell: 2 }));
      await ready(page, 'Surface');
      // Inspect the last composition before allowing the actual campaign screen to take over.
      await page.evaluate(() => {
        window.notified = [];
        ChapterBridge.complete = id => { window.notified.push(id); ChapterBridge.save(); };
        game.scene.getScene('Surface').talkKeeper();
      });
      await dialogue(page);
      await card(page, 'maintenance-record', `maintenance-record-${hero}.png`);
      assert.equal(await page.locator('.karez-transition__actor').count(), 3);
      assert.equal(await page.evaluate(() => G.state.recordSaved && Campaign.snapshot().completed.karez), true);
      assert.deepEqual(await page.evaluate(() => window.notified), []);
      await skip(page, 'Enter');
      assert.deepEqual(await page.evaluate(() => window.notified), ['karez']);
      await page.reload(); await ready(page, 'Surface');
      assert.equal(await page.evaluate(() => G.state.chapterComplete && G.state.cutscenes['maintenance-record']), true);
      assert.deepEqual(errors, [], `JavaScript errors (${hero})`);
      assert.deepEqual(missing, [], `Missing artwork (${hero})`);
      console.log(`PASS ${hero}: six story cards, original sprites, manual lighting, skip/input isolation, short repeat, inventory, reload and completion`);
      await context.close();
    }

    // Artwork delivery failure is recoverable; the gameplay state is already saved.
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    const page = lastPage = await context.newPage();
    await page.route('**/assets/transitions/karez/descend.png*', route => route.abort());
    await page.goto(base + 'karez.html'); await ready(page, 'Surface');
    await page.evaluate(st => {
      G.state = st; game.scene.getScene('Surface').wellOn(0);
    }, stateAt(4));
    await ready(page, 'Tunnel');
    assert.equal(await page.evaluate(() => G.state.laddersLeft), 2);
    assert.equal(await page.evaluate(() => KarezTransitions.hasSeen('descend')), false);
    console.log('PASS unavailable artwork: returns control without discarding progress');
    await context.close();
  } catch (error) {
    if (lastPage && !lastPage.isClosed()) await lastPage.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
