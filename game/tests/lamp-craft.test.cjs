const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LampCraft, LampAssembly } = require('../js/LampWorkshop.js');

const fold = [{ x: 570, y: 610 }, { x: 750, y: 610 }, { x: 945, y: 610 }];

test('按压会改善均匀度并排出气泡，交互区外点击无效', () => {
  const c = new LampCraft();
  const before = c.quality();
  assert.ok(c.pressAt({ x: 750, y: 610 }).useful > 0);
  assert.ok(c.uniformity > before.uniformity);
  assert.ok(c.air < before.air);
  assert.equal(c.pressAt({ x: 740, y: 420 }), false);
});

test('翻折会提升可塑性，连续翻折可以继续记录', () => {
  const c = new LampCraft();
  const before = c.quality();
  assert.equal(c.foldStroke([{ x: 740, y: 610 }, { x: 760, y: 610 }]), false);
  assert.equal(c.foldStroke(fold).crossing, true);
  assert.ok(c.plasticity > before.plasticity);
  assert.equal(c.foldStroke(fold.slice().reverse()).side, -1);
  assert.equal(c.folds, 2);
});

test('完成条件是泥料状态达标，不是固定按压或翻折次数', () => {
  const c = new LampCraft();
  for (let i = 0; i < 4; i++) c.pressAt({ x: 700 + i * 30, y: 610 });
  for (let i = 0; i < 3; i++) c.foldStroke(fold);
  assert.equal(c.ready(), false); // 轻按后均匀度还不够，不能按固定次数放行。
  c.foldStroke(fold.slice().reverse());
  assert.equal(c.ready(), true);
  assert.equal(c.phase, 1);
});

test('状态可以保存恢复，并兼容旧版动作存档', () => {
  const c = new LampCraft();
  c.pressAt({ x: 750, y: 610 });
  c.foldStroke(fold);
  const restored = new LampCraft(JSON.parse(JSON.stringify(c.toJSON())));
  assert.equal(restored.uniformity, c.uniformity);
  assert.equal(restored.plasticity, c.plasticity);
  assert.equal(restored.phase, 0);

  const oldComplete = new LampCraft({ v: 3, phase: 1, presses: 3, folds: 2, knead: 5 });
  assert.equal(oldComplete.phase, 1);
  assert.equal(oldComplete.toJSON().v, 5);
});

test('灯嘴和把手只能拖到对应接缝附近，拼好后才完成', () => {
  const a = new LampAssembly();
  assert.equal(a.ready(), false);
  assert.equal(a.down({ id: 1, x: 430, y: 540 }), true);
  a.move({ id: 1, x: 969.46, y: 608.1 });
  assert.equal(a.up({ id: 1, x: 969.46, y: 608.1 }), true);
  assert.equal(a.parts.spout.attached, true);
  assert.equal(a.down({ id: 2, x: 1080, y: 520 }), true);
  a.move({ id: 2, x: 547.95, y: 610.01 });
  assert.equal(a.up({ id: 2, x: 547.95, y: 610.01 }), true);
  assert.equal(a.ready(), true);
  const restored = new LampAssembly(JSON.parse(JSON.stringify(a.toJSON())));
  assert.equal(restored.ready(), true);
});

test('旧存档已接合的零件恢复到校准位置，未接合零件保留拖动位置', () => {
  const a = new LampAssembly({
    spout: { x: 900, y: 600, attached: true },
    handle: { x: 610, y: 525, attached: true },
  });
  assert.deepEqual(a.parts.spout, { x: 969.46, y: 608.1, rotation: -0.4869, attached: true });
  assert.deepEqual(a.parts.handle, { x: 547.95, y: 610.01, rotation: -0.9128000000000001, attached: true });
  const loose = new LampAssembly({ handle: { x: 1100, y: 700, attached: false } });
  assert.equal(loose.parts.handle.x, 1100);
  assert.equal(loose.parts.handle.y, 700);
  assert.equal(loose.ready(), false);
});
