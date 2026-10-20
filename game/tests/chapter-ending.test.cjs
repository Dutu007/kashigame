const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const bridgeSource = fs.readFileSync(require.resolve('../shared/chapter-bridge.js'), 'utf8');

function fixture(gameApp) {
  const calls = [], completed = [];
  const window = {
    location: { assign: url => calls.push('assign:' + url) },
    addEventListener() {},
  };
  window.parent = gameApp ? { GameApp: gameApp } : window;
  vm.runInNewContext(bridgeSource, { window, URL,
    document: { currentScript: { src: 'http://localhost/game/shared/chapter-bridge.js' } },
    Campaign: { complete: id => completed.push(id) },
  });
  return { bridge: window.ChapterBridge, calls, completed };
}

test('finishing chapter two hands the level list back to the shell host', () => {
  const finished = [];
  const f = fixture({ finishChapter: id => finished.push(id) });
  f.bridge.complete('karez');
  assert.deepEqual(finished, ['karez']);
  assert.deepEqual(f.completed, ['karez']);
  assert.deepEqual(f.calls, [], 'the host decides how chapter two ends');
});

test('a standalone chapter two returns to the level list instead of an ending card', () => {
  const f = fixture();
  f.bridge.complete('karez');
  assert.deepEqual(f.calls, ['assign:http://localhost/game/index.html']);
});

test('chapter one keeps its hand-off card so the journey can continue into chapter two', () => {
  const f = fixture();
  f.bridge.complete('weave');
  assert.deepEqual(f.calls, ['assign:http://localhost/game/index.html?completed=weave']);
});

test('a retired chapter neither reports completion nor navigates away', () => {
  const finished = [];
  const f = fixture({ finishChapter: id => finished.push(id) });
  f.bridge.prepareRestart();
  f.bridge.complete('karez');
  assert.deepEqual(finished, []);
  assert.deepEqual(f.completed, []);
  assert.deepEqual(f.calls, []);
});
