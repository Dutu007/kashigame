const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LadderCraft, LadderWorkshop } = require('../js/LadderWorkshop.js');

function assembled() {
  const c = new LadderCraft();
  LadderCraft.marks.forEach((y, i) => c.placeRung(i, y));
  c.alignEnd(0, 0); c.alignEnd(1, 0);
  assert.equal(c.finishAssembly(), true);
  return c;
}
function bind(c, pull) { c.routeStep = 4; c.pull = pull; assert.equal(c.secureKnot(), true); }
function ready() { const c = assembled(); bind(c, 90); bind(c, 90); return c; }

test('all four rungs and a threaded, pulled rope are required before testing', () => {
  const c = new LadderCraft();
  assert.equal(c.finishAssembly(), false);
  LadderCraft.marks.slice(0, 3).forEach((y, i) => c.placeRung(i, y));
  assert.equal(c.finishAssembly(), false);
  c.placeRung(3, 750); c.finishAssembly();
  c.pull = 90; assert.equal(c.secureKnot(), false);
  c.routeStep = 4; c.pull = 0; assert.equal(c.secureKnot(), false);
});
test('unequal rope lengths tilt the rung and can be corrected without rethreading knots', () => {
  const c = ready(); c.ends = [-18, 24];
  const knots = JSON.stringify(c.knots);
  assert.equal(c.loadAt(0, 1), false);
  assert.equal(c.issue.kind, 'tilt');
  c.repair(); c.alignEnd(0, 0); c.alignEnd(1, 0); c.finishAssembly();
  assert.equal(c.phase, 2); assert.equal(JSON.stringify(c.knots), knots);
  assert.equal(c.loadAt(0, 1), true);
});
test('a loose knot slips; retying only that knot preserves other completed load checks', () => {
  const c = ready();
  c.knots[0][0] = 0.25; // 兼容旧存档中已暂时固定、但未收紧的结。
  assert.equal(c.loadAt(1, 1), true);
  assert.equal(c.loadAt(0, 1), false);
  assert.deepEqual(c.issue, { kind: 'slip', row: 0, side: 0 });
  c.repair(); assert.equal(c.phase, 1); bind(c, 90);
  assert.deepEqual(c.loaded[1], [false, true, false]);
  assert.equal(c.loadAt(0, 1), true);
});
test('binding is blocked until both ropes are level; accepted alignment removes residual tilt', () => {
  const c = new LadderCraft();
  LadderCraft.marks.forEach((y, i) => c.placeRung(i, y));
  assert.equal(c.finishAssembly(), false); assert.equal(c.phase, 0); assert.equal(c.issue.kind, 'tilt');
  c.alignEnd(0, 20); c.alignEnd(1, 24);
  assert.equal(c.finishAssembly(), true); assert.deepEqual(c.ends, [0, 0]);
  c.routeStep = 4; c.pull = 20;
  assert.equal(c.secureKnot(), false); assert.equal(c.knots[0][0], 0);
  c.pull = 55; assert.equal(c.secureKnot(), true);
});
test('old mid-knot progress retains parts and bindings but returns to leveling if tilted', () => {
  const c = ready(); const saved = c.toJSON();
  saved.v = 1; saved.phase = 1; saved.ends = [-18, 24]; saved.routeStep = 4; saved.pull = 90;
  const restored = new LadderCraft(saved);
  assert.equal(restored.phase, 0); assert.equal(restored.routeStep, 0);
  assert.deepEqual(restored.rungs, c.rungs); assert.deepEqual(restored.knots, c.knots);
});
test('load targets coincide with the wood; near drops snap and the next highlighted target advances', () => {
  const c = ready(); const first = c.nextLoadTarget();
  assert.equal(c.loadTargets().length, 4);
  assert.deepEqual(first, { row: 0, side: 1, x: 730, y: 390 });
  assert.deepEqual(c.nearestLoadTarget(752, 419), first);
  assert.equal(c.nearestLoadTarget(1450, 700), null);
  c.loadAt(0, 1);
  assert.deepEqual(c.nextLoadTarget(), { row: 1, side: 1, x: 730, y: 510 });
});
test('bag motion and placement do not test a rung; only an explicit settled drop tests it', () => {
  global.Phaser = { Input: { Keyboard: { JustDown: () => false } } };
  const view = new LadderWorkshop({ scene: {} }, ready().toJSON());
  view.bag = { setPosition() {} };
  view.paintLadder = view.paintLoadProgress = view.updateStatus = view.save = () => {};
  const keys = Object.fromEntries(['SPACE', 'ENTER', 'LEFT', 'RIGHT', 'UP', 'DOWN'].map(k => [k, { isDown: false }]));
  view.draggingBag = true;
  for (let i = 0; i < 25; i++) view.update(50, keys);
  assert.equal(view.craft.loaded.flat().some(Boolean), false);
  view.draggingBag = false; view.placingBag = true; view.pendingTarget = view.craft.nextLoadTarget();
  for (let i = 0; i < 25; i++) view.update(50, keys);
  assert.equal(view.craft.loaded.flat().some(Boolean), false);
  view.placingBag = false;
  for (let i = 0; i < 25; i++) view.update(50, keys);
  assert.equal(view.craft.loaded[0][1], true);
  delete global.Phaser;
});
test('crowded and widely separated rungs fail the corresponding step; spacing can be repaired', () => {
  for (const y of [430, 575]) {
    const c = ready(); c.rungs[1] = y;
    assert.equal(c.loadAt(1, 1), false); assert.equal(c.issue.kind, 'spacing');
    c.repair(); c.placeRung(1, 510); c.finishAssembly();
    assert.equal(c.loadAt(1, 1), true);
  }
});
test('completion requires just one center check per rung, and persists after reopening', () => {
  const c = ready();
  assert.equal(c.loadAt(0, 0), false);
  assert.equal(c.loadAt(0, 2), false);
  for (let row = 0; row < 4; row++) {
    assert.equal(c.loadAt(row, 1), true);
    if (row !== 3) assert.equal(c.phase, 2);
  }
  assert.equal(c.phase, 3);
  const restored = new LadderCraft(JSON.parse(JSON.stringify(c.toJSON())));
  assert.equal(restored.phase, 3);
  assert.deepEqual(restored.loaded, c.loaded);
});
test('old load progress retains center checks and finishes when all four centers passed', () => {
  const saved = ready().toJSON();
  saved.loaded = [[true, true, true], [true, true, false], [true, false, true], [false, false, false]];
  const restored = new LadderCraft(saved);
  assert.equal(restored.phase, 2);
  assert.deepEqual(restored.loaded, [[false, true, false], [false, true, false], [false, false, false], [false, false, false]]);
  assert.deepEqual(restored.nextLoadTarget(), { row: 2, side: 1, x: 730, y: 630 });
  saved.loaded = Array.from({ length: 4 }, () => [false, true, false]);
  const completed = new LadderCraft(saved);
  assert.equal(completed.phase, 3);
  assert.equal(completed.nextLoadTarget(), null);
});
test('mid-thread exit restores route and tightening without aliasing live state', () => {
  const c = assembled(); c.routeStep = 3;
  const snapshot = c.toJSON(); const restored = new LadderCraft(snapshot);
  assert.equal(restored.phase, 1); assert.equal(restored.routeStep, 3);
  restored.placeRung(0, 400);
  assert.equal(snapshot.rungs[0], 390); assert.equal(c.rungs[0], 390);
});
