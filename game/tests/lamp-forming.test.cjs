const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LampForming } = require('../js/LampForming.js');
const dt = 1 / 60;
function shape(c, seconds = 25) {
  for (let i = 0; i < seconds * 60 && !c.ready(); i++) {
    c.step(dt, c.speed < 0.5, LampForming.point(Math.min(1, c.progress + 0.002)));
  }
}
test('slow tracked dragging with controlled wheel completes all eight frames', () => {
  const c = new LampForming();
  shape(c);
  assert.equal(c.ready(), true);
  assert.equal(c.progress, 1);
});
test('rotation alone and dragging without rotation do not shape clay', () => {
  const c = new LampForming();
  for (let i = 0; i < 90; i++) c.step(dt, true, null);
  assert.equal(c.progress, 0);
  const stopped = new LampForming();
  for (let i = 0; i < 100; i++) stopped.step(dt, false, LampForming.point(i / 100));
  assert.equal(stopped.progress, 0);
});
test('overspeed, side drift, and fast dragging deform rather than skip stages', () => {
  for (const fault of ['speed', 'side', 'drag']) {
    const c = new LampForming({ progress: 0.2 });
    c.speed = fault === 'speed' ? 0.95 : 0.5;
    const p = LampForming.point(0.2);
    c.previous = p;
    const hand = fault === 'side' ? { x: p.x + 80, y: p.y }
      : fault === 'drag' ? LampForming.point(0.25) : p;
    c.step(dt, false, hand);
    assert.equal(c.progress, 0.2, fault);
    assert.ok(c.warp > 0, fault);
    c.release();
    shape(c);
    assert.equal(c.ready(), true, fault + ' must be recoverable');
  }
});
test('save restores geometry, stops wheel, and allows endpoint repair', () => {
  const c = new LampForming({ progress: 1, warp: 0.6 });
  c.speed = 0.5;
  const resumed = new LampForming(JSON.parse(JSON.stringify(c.toJSON())));
  assert.equal(resumed.speed, 0);
  assert.equal(resumed.ready(), false);
  shape(resumed);
  assert.equal(resumed.ready(), true);
});
