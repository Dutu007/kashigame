const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const bridgeSource = fs.readFileSync(require.resolve('../shared/chapter-bridge.js'), 'utf8');

function fixture() {
  const calls = [], listeners = {};
  const window = { location: { reload: () => calls.push('reload'), assign: () => calls.push('assign') },
    addEventListener: (type, fn) => { listeners[type] = fn; },
  };
  window.parent = window;
  vm.runInNewContext(bridgeSource, { window, URL,
    document: { currentScript: { src: 'http://localhost/game/shared/chapter-bridge.js' } },
    Campaign: { resetChapter: id => calls.push('reset:' + id), complete: () => calls.push('complete') },
  });
  const bridge = window.ChapterBridge;
  bridge.register({ prepareRestart: () => calls.push('suspend'), pause: () => calls.push('pause'), save: () => calls.push('save') });
  return { bridge, calls, listeners };
}

test('retiring a chapter stops unload saves and late completion before the next entry clears the old run', () => {
  const { bridge, calls, listeners } = fixture();
  bridge.prepareRestart();
  assert.deepEqual(calls, ['suspend','pause']);
  listeners.beforeunload(); listeners.pagehide(); bridge.save(); bridge.complete('karez'); bridge.prepareRestart();
  assert.deepEqual(calls, ['suspend','pause']);
});

test('normal saves and completion continue working before the chapter is retired', () => {
  const { bridge, calls } = fixture();
  bridge.save(); bridge.complete('karez');
  assert.deepEqual(calls, ['save','save','complete','assign']);
});

test('direct chapter saves are also suspended so delayed workshop callbacks cannot write the old checkpoint', () => {
  const main = fs.readFileSync(require.resolve('../js/main.js'), 'utf8');
  const start = main.indexOf('const SaveService =');
  const end = main.indexOf('(function restore()', start);
  const writes = [];
  const context = { Campaign: { write: (...args) => writes.push(args) }, G: { state:{chapterComplete:true}, goalText:'自由探索' } };
  vm.runInNewContext(main.slice(start,end) + '\nthis.service = SaveService;', context);
  context.service.save();
  assert.equal(writes.length, 1);
  context.service.suspended = true;
  context.service.save();
  assert.equal(writes.length, 1);
});
