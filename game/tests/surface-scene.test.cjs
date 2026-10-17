const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../js/SurfaceScene.js'), 'utf8');

function fixture() {
  const state = {
    craftDone: true, ladderProblemFound: true, uaInspected: true, ub: { done: true },
    laddersLeft: 0, lastWell: 2,
    wells: Array.from({ length: 3 }, () => ({ weeds: 0, cleared: true, ladder: true })),
  };
  const saves = [], transitions = [], timers = [];
  const context = {
    Phaser: { Scene: class {} }, G: { state, restored: false },
    SURF: { wells: [645, 1594, 2667] }, surfaceGroundY: () => 640,
    SaveService: { save: () => saves.push(JSON.parse(JSON.stringify(state))) },
  };
  vm.createContext(context);
  vm.runInContext(source + '\nthis.SurfaceScene = SurfaceScene;', context);
  const scene = new context.SurfaceScene();
  scene.cameras = { main: { fadeOut() {} } };
  scene.time = { delayedCall: (_delay, callback) => timers.push(callback) };
  scene.scene = { start: (key, data) => transitions.push({ key, seg: data.seg }) };
  return { scene, state, saves, transitions, timers, context };
}

test('reusing a ladder updates the saved well before transition without consuming another ladder', () => {
  const f = fixture();
  for (const i of [0, 1, 2, 0]) {
    f.scene.wellOn(i);
    assert.equal(f.state.lastWell, i);
    assert.equal(f.saves.at(-1).lastWell, i);
    assert.equal(f.saves.at(-1).laddersLeft, 0);
    assert.equal(f.scene.fading, true);
    f.timers.shift()();
    assert.deepEqual(f.transitions.at(-1), { key: 'Tunnel', seg: ['UA', 'UB', 'UC'][i] });
    f.context.G.restored = true;
    const restored = new f.context.SurfaceScene();
    restored.init({});
    assert.equal(restored.spawnWell, i);
  }
  assert.equal(f.saves.length, 4);
});

test('placing a new ladder saves its well and inventory together before entering the tunnel', () => {
  const f = fixture();
  f.state.wells[0].ladder = false;
  f.state.laddersLeft = 3;
  f.scene.wellOn(0);
  assert.equal(f.saves.length, 1);
  assert.equal(f.saves[0].wells[0].ladder, true);
  assert.equal(f.saves[0].laddersLeft, 2);
  assert.equal(f.saves[0].lastWell, 0);
  f.timers.shift()();
  assert.deepEqual(f.transitions, [{ key: 'Tunnel', seg: 'UA' }]);
});
