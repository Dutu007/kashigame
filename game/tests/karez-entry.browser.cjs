const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const stateAt = require('./karez-fixture.cjs');
const base = process.env.GAME_URL || 'http://127.0.0.1:5173/game/';

async function frameOf(page) {
  await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.location.href.includes('karez.html'));
  const frame = page.frames().find(f => f.url().includes('karez.html'));
  await frame.waitForFunction(() => typeof G !== 'undefined' && G.ui && game.scene.isActive('Surface'));
  return frame;
}
async function fresh(frame, hero) {
  assert.deepEqual(await frame.evaluate(() => ({ intro:G.state.introDone, craft:G.state.craftDone, lamp:G.state.lampOwned,
    ub:G.state.ub.done, uc:G.state.uc.done, verified:G.state.verified, complete:G.state.chapterComplete,
    weeds:G.state.wells[0].weeds, hero:Campaign.snapshot().character, first:Campaign.snapshot().completed.weave,
    second:Campaign.snapshot().completed.karez })),
    {intro:false,craft:false,lamp:false,ub:false,uc:false,verified:false,complete:false,weeds:3,hero,first:true,second:false});
  assert.equal(await frame.locator('#karez-restart-open').count(),0);
  assert.equal(await frame.locator('#karez-restart-dialog').count(),0);
  await frame.waitForFunction(() => !KarezTransitions.active);
}

(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    for (const entry of ['menu','map']) {
      const hero = entry==='menu' ? 'aide' : 'aysu';
      const context = await browser.newContext({viewport:{width:1440,height:900}});
      const old = stateAt(9); old.cutscenes={arrival:true,descend:true,ascend:true};
      await context.addInitScript(({old,hero}) => {
        if (localStorage.getItem('twc_l2_save')!==null) return;
        localStorage.setItem('twc_l2_save',JSON.stringify({v:4,s:old}));
        localStorage.setItem('twc_campaign_v1',JSON.stringify({version:1,character:hero,characterChosen:true,currentChapter:'karez',started:{weave:true,karez:true},completed:{weave:true,karez:true}}));
        localStorage.setItem('twc_l1_save',JSON.stringify({v:1,state:{character:hero,chapterComplete:true,quest:true,collection:['saved-work']}}));
      },{old,hero});
      const page = await context.newPage(), errors=[];
      page.on('pageerror', e=>errors.push(e.message));
      const entryUrl = base+'index.html'+(entry==='map'?'?entry=map&chapter=karez&hero='+hero:'?chapter=karez');
      await page.goto(entryUrl);
      let frame=await frameOf(page);
      const firstSave=await page.evaluate(()=>localStorage.getItem('twc_l1_save'));
      if (entry==='menu') {
        // Loading/refreshing the existing run leaves it at free exploration.
        assert.equal(await frame.evaluate(()=>G.state.chapterComplete),true);
        await page.locator('#backToMenu').click();
        await page.locator('#enterKarez').click();
        frame=await frameOf(page);
      }
      await fresh(frame,hero);
      // Refresh inside the current session keeps its new progress.
      await frame.evaluate(()=>{G.state.introDone=true;SaveService.save();});
      await page.reload(); frame=await frameOf(page);
      assert.equal(await frame.evaluate(()=>G.state.introDone),true);
      assert.equal(await frame.evaluate(()=>G.state.chapterComplete),false);
      if (entry==='menu') {
        await page.locator('#backToMenu').click();
        assert.match(await page.locator('#continueJourney').innerText(),/进入坎儿井/);
        await page.locator('#continueJourney').click();
      } else await page.goto(entryUrl);
      frame=await frameOf(page); await fresh(frame,hero);
      assert.equal(await page.evaluate(()=>localStorage.getItem('twc_l1_save')),firstSave);
      assert.deepEqual(errors,[]);
      console.log(`PASS ${entry}: re-entry starts fresh, refresh continues, no in-game restart controls, first chapter and ${hero} preserved`);
      await context.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
