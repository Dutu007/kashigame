const { test } = require('node:test');
const assert = require('node:assert/strict');
const { KarezTransitionPlayer } = require('../js/KarezTransitions.js');

const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture(seen = {}) {
  let now = 0, serial = 0;
  const timers = new Map(), cards = [], writes = [], locks = [];
  const view = {
    show(id, _meta, repeat) { cards.push({ id, repeat }); return Promise.resolve(); },
    hide() { return Promise.resolve(); },
  };
  const player = new KarezTransitionPlayer({ view, readSeen: () => seen,
    markSeen(id) { seen ||= {}; seen[id] = true; writes.push(id); },
    lock: value => locks.push(value), now: () => now,
    schedule(fn, ms) { const id = ++serial; timers.set(id, { fn, at: now + ms }); return id; },
    cancel: id => timers.delete(id),
  });
  async function advance(ms) {
    const end = now + ms;
    while (true) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
    }
    now = end; await flush();
  }
  return { player, seen, cards, writes, locks, view, advance };
}

test('first descent finishes once; a saved repeat is brief and a one-shot still continues gameplay', async () => {
  const f = fixture(); let entered = 0;
  f.player.play('descend', () => entered++); await flush();
  assert.deepEqual(f.writes, []);
  await f.advance(2799); assert.equal(entered, 0);
  await f.advance(1); assert.equal(entered, 1); assert.equal(f.seen.descend, true);
  f.player.play('descend', () => entered++); await flush();
  assert.equal(f.cards.at(-1).repeat, true);
  await f.advance(650); assert.equal(entered, 2);
  f.seen['maintenance-record'] = true;
  f.player.play('maintenance-record', () => entered++);
  assert.equal(entered, 3); assert.equal(f.cards.length, 2);
  assert.deepEqual(f.locks, [true, false, true, false]);
});

test('repeated skip and an elapsed timer cannot run a continuation more than once', async () => {
  const f = fixture(); let entered = 0, release;
  f.view.hide = () => new Promise(resolve => { release = resolve; });
  f.player.play('arrival', () => entered++); await flush();
  f.player.skip(); assert.equal(f.player.current.closing, false);
  await f.advance(200);
  f.player.skip(); f.player.skip(); await flush();
  await f.advance(4000); assert.equal(entered, 0); assert.equal(f.player.active, true);
  release(); await flush();
  assert.equal(entered, 1); assert.deepEqual(f.writes, ['arrival']);
});

test('an unavailable or stalled image returns control without marking the card seen', async () => {
  const f = fixture(); let entered = 0, load;
  f.view.show = () => Promise.reject(new Error('404'));
  f.player.play('descend', () => entered++); await flush();
  assert.equal(entered, 1); assert.equal(f.player.active, false); assert.deepEqual(f.writes, []);
  f.view.show = () => new Promise(resolve => { load = resolve; });
  f.player.play('descend', () => entered++); await flush();
  await f.advance(6000); assert.equal(entered, 2); assert.equal(f.player.active, false);
  load(); await flush(); await f.advance(4000);
  assert.equal(entered, 2); assert.deepEqual(f.writes, []);
});

test('host pause and hidden-tab pause both have to clear before the remaining time runs', async () => {
  const f = fixture(); let entered = 0;
  f.player.play('ascend', () => entered++); await flush();
  await f.advance(1000); f.player.pause('host'); f.player.pause('visibility');
  await f.advance(10000); assert.equal(entered, 0);
  f.player.resume('host'); await f.advance(10000); assert.equal(entered, 0);
  f.player.resume('visibility'); await f.advance(1799); assert.equal(entered, 0);
  await f.advance(1); assert.equal(entered, 1);
});

test('loading while paused and legacy saves without a seen map keep their continuations', async () => {
  const f = fixture(null); let load, entered = 0;
  f.view.show = () => new Promise(resolve => { load = resolve; });
  f.player.play('silt-cleared', () => entered++); await flush();
  f.player.pause('host'); load(); await flush();
  await f.advance(10000); assert.equal(entered, 0);
  f.player.resume('host'); await f.advance(3000);
  assert.equal(entered, 1); assert.deepEqual(f.writes, ['silt-cleared']);
});

test('queued cards preserve narrative order including a previously viewed one-shot', async () => {
  const f = fixture({ 'silt-cleared': true }); const done = [];
  f.player.play('ascend', () => done.push('surface'));
  f.player.play('silt-cleared', () => done.push('cleared'));
  f.player.play('water-restored', () => done.push('verified')); await flush();
  await f.advance(2800);
  assert.deepEqual(done, ['surface', 'cleared']);
  assert.deepEqual(f.cards.map(card => card.id), ['ascend', 'water-restored']);
  await f.advance(3000); assert.deepEqual(done, ['surface', 'cleared', 'verified']);
});
