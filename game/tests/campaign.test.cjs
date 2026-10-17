const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fileURLToPath, pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'shared/campaign.js'), 'utf8');

function fixture(records = {}, fail = false, parent) {
  const storage = new Map(Object.entries(records).map(([key, value]) => [key, JSON.stringify(value)]));
  const window = { localStorage: {
    getItem(key) { if (fail) throw new Error('blocked'); return storage.get(key) ?? null; },
    setItem(key, value) { if (fail) throw new Error('quota'); storage.set(key, value); },
  } };
  window.parent = parent || window;
  vm.runInNewContext(source, { window });
  return { service: window.Campaign, window, storage };
}

test('chapter completion unlocks the next chapter and preserves the selected hero across reloads', () => {
  const f = fixture();
  assert.equal(f.service.canEnter('karez'), false);
  f.service.chooseCharacter('aide');
  f.service.enter('weave');
  f.service.complete('weave');
  assert.equal(f.service.canEnter('karez'), true);
  f.service.enter('karez');
  const reload = fixture(Object.fromEntries([...f.storage].map(([key, value]) => [key, JSON.parse(value)])));
  const state = reload.service.snapshot();
  assert.equal(state.character, 'aide');
  assert.equal(state.currentChapter, 'karez');
  assert.equal(state.completed.weave, true);
  assert.equal(state.completed.karez, false);
});

test('a legacy karez save remains accessible without falsely completing weave-lane', () => {
  const { service } = fixture({ twc_l2_save: { v: 4, s: { chapterComplete: false } } });
  assert.equal(service.canEnter('karez'), true);
  assert.equal(service.snapshot().completed.weave, false);
  assert.equal(service.snapshot().currentChapter, 'karez');
});

test('invalid save versions do not unlock chapter two', () => {
  for (const saved of [null, { v: 3, s: {} }, { v: 4 }, 'broken']) {
    assert.equal(fixture({ twc_l2_save: saved }).service.canEnter('karez'), false);
  }
});

test('embedded chapters share in-memory saves when browser storage is blocked', () => {
  const host = fixture({}, true);
  const child = fixture({}, true, host.window);
  assert.equal(child.service, host.service);
  child.service.chooseCharacter('aide');
  const checkpoint = { v: 4, s: { ub: { done: true } } };
  child.service.write('twc_l2_save', checkpoint);
  checkpoint.s.ub.done = false;
  assert.equal(host.service.read('twc_l2_save').s.ub.done, true);
  assert.equal(fixture({}, true, host.window).service.snapshot().character, 'aide');
  assert.equal(host.service.storageOK, false);
});

test('resetting chapter two clears its completion and checkpoint while preserving chapter one', () => {
  const { service } = fixture();
  service.chooseCharacter('aide'); service.complete('weave'); service.complete('karez');
  service.write('twc_l2_save', { v: 4, s: { chapterComplete: true } });
  service.resetChapter('karez');
  assert.equal(service.read('twc_l2_save'), null);
  assert.equal(service.snapshot().completed.karez, false);
  assert.equal(service.snapshot().completed.weave, true);
  assert.equal(service.snapshot().character, 'aide');
});

test('every shared character frame exists with the expected canvas dimensions', () => {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'shared/characters.js'), 'utf8'), {
    window, URL, document: { currentScript: { src: pathToFileURL(path.join(root, 'shared/characters.js')).href } },
  });
  const characters = window.GameCharacters;
  let count = 0;
  for (const [id, definition] of Object.entries(characters.definitions)) {
    for (const [pose, frames] of Object.entries(definition.frames)) {
      for (let i = 0; i < frames; i++) {
        const file = fileURLToPath(characters.frame(id, pose, i));
        assert.ok(fs.existsSync(file), file);
        const png = fs.readFileSync(file);
        assert.equal(png.readUInt32BE(16), 300, file);
        assert.equal(png.readUInt32BE(20), 340, file);
        count++;
      }
    }
  }
  assert.equal(count, 190);
});
