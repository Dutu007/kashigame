const test = require('node:test');
const assert = require('node:assert/strict');
const { LampFiring } = require('../js/LampFiring.js');
const tick = (m, seconds) => { for (let i = 0; i < Math.round(seconds * 20); i++) m.update(0.05); };

test('45 秒工序按 4/11/23/7 分配，偏离火候不倒退或延长', () => {
  const m = new LampFiring(); tick(m, 10); assert.equal(m.elapsed, 0);
  m.start(); tick(m, 4.05); assert.equal(m.phase, 1);
  tick(m, 11); assert.equal(m.phase, 2);
  tick(m, 23); assert.equal(m.phase, 3); assert.equal(m.addFuel(), false);
  tick(m, 7); assert.equal(m.ready(), true); assert.equal(m.elapsed, 45);
  assert.equal(m.heat, 0);
});
test('添柴有冷却和热惯性，晾干/冷却/完成期间不能添柴', () => {
  const m = new LampFiring(); assert.equal(m.addFuel(), false); m.start();
  assert.equal(m.addFuel(), false); tick(m, 4.1);
  const heat = m.heat, fuel = m.fuel;
  assert.equal(m.addFuel(), true); assert.equal(m.addFuel(), false);
  assert.equal(m.heat, heat); assert.ok(m.fuel > fuel);
  tick(m, 1); assert.ok(m.heat > heat); assert.equal(m.addFuel(), true);
});
test('火候提示有滞回、0.6 秒确认和至少 1.5 秒显示时间', () => {
  const m = new LampFiring({ elapsed: 20, started: true, hintState: 'good', hintAge: 2 });
  for (let i = 0; i < 100; i++) { m.heat = i % 2 ? 34.9 : 35.1; m.updateHint(0.05); }
  assert.equal(m.hintState, 'good');
  m.heat = 20; for (let i = 0; i < 13; i++) m.updateHint(0.05);
  assert.equal(m.hintState, 'low');
  m.heat = 36; for (let i = 0; i < 40; i++) m.updateHint(0.05);
  assert.equal(m.hintState, 'low');
  m.heat = 50; for (let i = 0; i < 13; i++) m.updateHint(0.05);
  assert.equal(m.hintState, 'good');
  m.heat = 90; for (let i = 0; i < 15; i++) m.updateHint(0.05);
  assert.equal(m.hintState, 'good');
  for (let i = 0; i < 16; i++) m.updateHint(0.05);
  assert.equal(m.hintState, 'high');
  m.heat = 74; for (let i = 0; i < 40; i++) m.updateHint(0.05);
  assert.equal(m.hintState, 'high');
});
test('保存后恢复当前工序、火候与进度；候选提示重新确认', () => {
  for (const elapsed of [2, 9, 25, 41, 45]) {
    const m = new LampFiring({ elapsed, started: true, heat: 45, fuel: 0.5, loads: 4 });
    const restored = new LampFiring(JSON.parse(JSON.stringify(m.toJSON())));
    assert.deepEqual(restored.toJSON(), m.toJSON()); assert.equal(restored.phase, m.phase);
    assert.equal(restored.pending, null);
  }
  assert.equal(new LampFiring({ elapsed: NaN }).elapsed, 0);
});
