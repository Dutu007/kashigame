const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const stateAt = require('./karez-fixture.cjs');
const base = process.env.GAME_URL || 'http://127.0.0.1:5173/game/';
const output = path.resolve(__dirname, '../output/patch-repair');
fs.mkdirSync(output, {recursive:true});

function startState() {
  const st = stateAt(6);
  st.wells[2] = { weeds:0, cleared:true, ladder:true };
  st.laddersLeft = 0; st.sceneId = 'Tunnel'; st.lastSeg = 'UC'; st.lastWell = 2;
  st.patchIntroSeen = true;
  return st;
}
async function ready(page) {
  await page.waitForFunction(() => typeof G !== 'undefined' && G.ui && game.scene.isActive('Tunnel') && game.scene.getScene('Tunnel').patchRepair);
  await page.waitForTimeout(450);
}
async function enter(page) {
  await page.evaluate(() => { const s = game.scene.getScene('Tunnel'); s.player.x = s.seg.patchX+140; });
  await page.keyboard.press('e', {delay:80});
  await page.waitForFunction(() => game.scene.getScene('Tunnel').local?.kind === 'patch');
  await page.waitForTimeout(450);
}
async function target(page, index) {
  await page.evaluate(index => {
    const s = game.scene.getScene('Tunnel');
    const targets = s.patchRepair.model.targets(s.seg.patchX);
    s.player.x = (index == null ? targets[0] : targets.find(t => t.index === index)).x;
  }, index);
  await page.waitForTimeout(40);
}
async function use(page, index) { await target(page,index); await page.keyboard.press('e', {delay:80}); }
async function model(page) {
  return page.evaluate(() => {
    const m = game.scene.getScene('Tunnel').patchRepair.model;
    return { ...m.toJSON(), phase:m.phase, carried:m.carried };
  });
}
async function screenshot(page, name) {
  await page.evaluate(() => game.loop.sleep());
  try { await page.screenshot({path:path.join(output,name)}); }
  finally { await page.evaluate(() => game.loop.wake()); }
}

(async () => {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  let lastPage;
  try {
    for (const hero of ['aide','aysu']) {
      const context = await browser.newContext({viewport:{width:1600,height:1000}});
      await context.addInitScript(({st,hero}) => {
        if (!localStorage.getItem('twc_l2_save')) {
          localStorage.setItem('twc_l2_save',JSON.stringify({v:4,s:st}));
          localStorage.setItem('twc_campaign_v1',JSON.stringify({version:1,character:hero,characterChosen:true,started:{karez:true},completed:{weave:true}}));
        }
      }, {st:startState(),hero});
      const page = lastPage = await context.newPage();
      const errors = [];
      page.on('pageerror',e => errors.push(e.message));
      await page.goto(base+'karez.html'); await ready(page); await enter(page);
      assert.equal(await page.evaluate(() => G.ui.modalOpen || game.scene.getScene('UI').workshop.opened), false);
      await screenshot(page,`observe-${hero}.png`);
      // Being outside interaction range, or having no light, cannot complete an observation.
      await page.evaluate(() => { const s=game.scene.getScene('Tunnel'); s.player.x=s.seg.patchX+470; });
      await page.keyboard.press('e',{delay:80});
      assert.deepEqual((await model(page)).observed,[false,false,false]);
      await target(page,0); await page.keyboard.press('f',{delay:80});
      await page.keyboard.press('e',{delay:80});
      assert.deepEqual((await model(page)).observed,[false,false,false]);
      await page.keyboard.press('f',{delay:80});
      for (const i of [0,1,2]) await use(page,i);
      assert.equal((await model(page)).phase,'stones');
      await use(page); assert.equal((await model(page)).carried,0);
      await screenshot(page,`carry-${hero}.png`);
      // Trying to place a stone while still on the bank keeps it in hand.
      await page.keyboard.press('e',{delay:80});
      assert.deepEqual((await model(page)).slots,[null,null,null]);
      await use(page); assert.deepEqual((await model(page)).slots,[0,null,null]);
      await page.keyboard.press('Escape',{delay:80});
      assert.equal(await page.evaluate(() => game.scene.getScene('Tunnel').local),null);
      assert.equal(await page.evaluate(() => game.scene.getScene('Tunnel').patchRepair.hud.visible),false);
      await page.reload(); await ready(page); await enter(page);
      assert.deepEqual((await model(page)).slots,[0,null,null]);
      for (let i=1;i<3;i++) { await use(page); await use(page); }
      assert.equal((await model(page)).phase,'joints');
      await screenshot(page,`stones-${hero}.png`);
      for (let i=0;i<5;i++) await use(page);
      assert.equal((await model(page)).phase,'flow');
      await target(page);
      await page.keyboard.down('e'); await page.waitForTimeout(550); await page.keyboard.up('e');
      const partial = (await model(page)).trial;
      assert.ok(partial>0 && partial<1);
      await page.waitForTimeout(250);
      assert.equal((await model(page)).trial,partial);
      await page.evaluate(() => ChapterBridge.pause()); await page.waitForTimeout(300);
      assert.equal((await model(page)).trial,partial);
      await page.evaluate(() => ChapterBridge.resume());
      await page.keyboard.press('Escape',{delay:80});
      await page.reload(); await ready(page); await enter(page);
      assert.ok(Math.abs((await model(page)).trial-partial)<0.001);
      await target(page);
      await page.keyboard.down('e');
      await page.waitForFunction(() => game.scene.getScene('Tunnel').patchRepair.model.phase==='complete');
      await page.keyboard.up('e');
      assert.equal(await page.evaluate(() => G.state.uc.done || G.state.verified),false);
      await screenshot(page,`flow-${hero}.png`);
      await use(page);
      await page.waitForFunction(() => G.state.uc.done && !game.scene.getScene('Tunnel').patchRepair);
      assert.equal(await page.evaluate(() => G.state.verified),false);
      assert.equal(await page.evaluate(() => G.state.uc.patch),null);
      assert.equal(await page.evaluate(() => game.scene.getScene('Tunnel').bg.texture.key),'MAP_UC_FIXED');
      await page.waitForTimeout(600); await screenshot(page,`complete-${hero}.png`);
      await page.reload();
      await page.waitForFunction(() => typeof G!=='undefined' && G.ui && game.scene.isActive('Tunnel') && game.scene.getScene('Tunnel').player);
      assert.equal(await page.evaluate(() => G.state.uc.done && !G.state.verified),true);
      assert.equal(await page.evaluate(() => game.scene.getScene('Tunnel').patchRepair),null);
      assert.deepEqual(errors,[]);
      console.log(`PASS ${hero}: in-scene E repair, proximity/light gates, carry/place, staged ground, five joints, held trial, pause, save/reload, finish and separate verification`);
      await context.close();
    }
    const context = await browser.newContext();
    const st = startState();
    st.uc.patch = { phase:2, observed:[true,true,true], slots:[0,1,2], jointIndex:3, flow:2 };
    await context.addInitScript(st => localStorage.setItem('twc_l2_save',JSON.stringify({v:4,s:st})),st);
    const page = lastPage = await context.newPage();
    await page.goto(base+'karez.html'); await ready(page); await enter(page);
    const migrated = await model(page);
    assert.equal(migrated.phase,'joints'); assert.equal(migrated.jointIndex,3);
    assert.deepEqual(migrated.slots,[0,1,2]);
    console.log('PASS legacy workbench checkpoint: placed stones and joint progress preserved');
    await context.close();
  } catch (e) {
    if (lastPage && !lastPage.isClosed()) await lastPage.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
    throw e;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
