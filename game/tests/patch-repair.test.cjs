const { test } = require('node:test');
const assert = require('node:assert/strict');
const { KarezPatchProgress } = require('../js/KarezPatchRepair.js');

function readyForFlow() {
  return new KarezPatchProgress({ v: 2, observed: [true,true,true], slots: [0,1,2], jointIndex: 5, trial: 0 });
}

test('repair requires inspecting, carrying and placing each stone, then sealing the joints in order', () => {
  const m = new KarezPatchProgress();
  assert.equal(m.act({ type:'take', index:0 }), false);
  for (const i of [2,0,1]) assert.equal(m.act({ type:'observe', index:i }), true);
  assert.equal(m.phase, 'stones');
  assert.equal(m.act({ type:'take', index:1 }), false);
  for (const i of [0,1,2]) {
    assert.equal(m.act({ type:'place', index:i }), false);
    assert.equal(m.act({ type:'take', index:i }), true);
    assert.equal(m.act({ type:'take', index:i }), false);
    assert.equal(m.act({ type:'place', index:i }), true);
    assert.equal(m.act({ type:'place', index:i }), false);
  }
  assert.equal(m.phase, 'joints');
  assert.equal(m.act({ type:'joint', index:2 }), false);
  for (let i=0;i<5;i++) assert.equal(m.act({ type:'joint', index:i }), true);
  assert.equal(m.phase, 'flow');
  assert.equal(m.act({ type:'finish' }), false);
  assert.equal(m.trial, 0);
});

test('trial only progresses while started and held in the work area; pauses and large clock jumps do not complete it', () => {
  const m = readyForFlow();
  assert.equal(m.updateTrial(50,true), false);
  m.act({ type:'flow' });
  assert.equal(m.updateTrial(50,false), false);
  m.updateTrial(60000,true);
  assert.ok(Math.abs(m.trial-50/2400)<1e-9);
  const paused = m.trial;
  for (let i=0;i<100;i++) m.updateTrial(50,false);
  assert.equal(m.trial, paused);
  for (let i=0;i<48;i++) m.updateTrial(50,true);
  assert.equal(m.trial, 1);
  assert.equal(m.phase, 'complete');
  assert.equal(m.updateTrial(50,true), false);
});

test('snapshot preserves committed steps and partial trial without an active held key or duplicated stones', () => {
  const m = readyForFlow(); m.act({ type:'flow' });
  for (let i=0;i<15;i++) m.updateTrial(50,true);
  const saved = m.toJSON(), restored = new KarezPatchProgress(saved);
  assert.equal(restored.trial, m.trial);
  assert.equal(restored.testing, false);
  assert.equal(restored.updateTrial(50,true), false);
  saved.observed[0] = false; saved.slots[0] = null;
  assert.equal(restored.observed[0], true);
  assert.equal(m.slots[0], 0);
  const carrying = new KarezPatchProgress({ v:2, observed:[true,true,true], slots:[0,null,null] });
  carrying.act({ type:'take', index:1 });
  const afterExit = new KarezPatchProgress(carrying.toJSON());
  assert.equal(afterExit.slots[0], 0);
  assert.equal(afterExit.carried, null);
  assert.equal(afterExit.nextStone, 1);
});

test('old workbench saves keep observations, placed stones, pressed joints and an already passed trial', () => {
  const base = { observed:[true,true,true], slots:[0,1,2], jointIndex:5, flow:3 };
  const stones = new KarezPatchProgress({...base, phase:1, slots:[0,null,2]});
  assert.deepEqual(stones.slots, [0,null,2]);
  assert.equal(stones.nextStone, 1);
  const seams = new KarezPatchProgress({...base, phase:2, jointIndex:3});
  assert.equal(seams.phase, 'joints'); assert.equal(seams.jointIndex, 3);
  assert.equal(new KarezPatchProgress({...base, phase:3}).phase, 'flow');
  assert.equal(new KarezPatchProgress({...base, phase:4}).phase, 'complete');
});

test('invalid or incomplete prerequisites cannot create a successful repair from an inconsistent save', () => {
  const m = new KarezPatchProgress({ v:2, observed:[false,true,true], slots:[2,0,1], jointIndex:99, trial:1 });
  assert.equal(m.phase, 'observe');
  assert.deepEqual(m.slots, [null,null,null]);
  assert.equal(m.jointIndex, 0); assert.equal(m.trial, 0);
  assert.equal(m.act({type:'observe', index:99}), false);
});
