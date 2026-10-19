const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../js/ui.js'), 'utf8');

function fixture() {
  function display() {
    return {
      visible: true, text: '',
      setVisible(value) { this.visible = value; return this; },
      setText(value) { this.text = value; return this; },
      setDepth() { return this; }, setOrigin() { return this; },
      setPosition() { return this; }, clear() { return this; },
    };
  }
  const timers = [];
  const scene = { add: { text: display, graphics: display }, time: { now: 0,
    addEvent(options) {
      const event = { ...options, removed: false, remove() { this.removed = true; } };
      timers.push(event); return event;
    },
  } };
  const context = { Phaser: { Scene: class {} }, FONT: '', VIEW_W: 1920, VIEW_H: 1080, skinImage: display };
  vm.createContext(context);
  vm.runInContext(source + '\nthis.DialogueBox = DialogueBox;', context);
  return { dialogue: new context.DialogueBox(scene), timers };
}

test('closing a typing dialogue cancels its timer and a queued callback cannot reveal the continue cue', () => {
  const { dialogue: d, timers } = fixture();
  d.open([{ s: 'keeper', t: '井底还有需要查看的水痕。' }]);
  const event = timers.at(-1);
  d.close();
  assert.equal(event.removed, true);
  // A callback already queued by the clock must also be harmless after close.
  for (let i = 0; i < 20; i++) event.callback();
  assert.equal(d.isOpen, false);
  assert.equal(d.typing, false);
  assert.equal(d.panel.visible, false);
  assert.equal(d.text.visible, false);
  assert.equal(d.arrow.visible, false);
});

test('a naturally finished line releases its timer; closing and repeated advance finish only once', () => {
  const { dialogue: d, timers } = fixture(); let completed = 0;
  d.open([{ s: 'keeper', t: '好了' }], () => completed++);
  const event = timers.at(-1);
  event.callback();
  assert.equal(d.typing, false);
  assert.equal(d.arrow.visible, true);
  assert.equal(event.removed, true);
  d.advance(); d.advance(); event.callback();
  assert.equal(completed, 1);
  assert.equal(d.typeEvent, null);
  assert.equal(d.arrow.visible, false);
});

test('an earlier line cannot overwrite a new dialogue or reveal its continue cue early', () => {
  const { dialogue: d, timers } = fixture();
  d.open([{ s: 'keeper', t: '旧话' }]);
  const old = timers.at(-1);
  d.open([{ s: 'aide', t: '我们再看看两侧的碎石。' }]);
  const current = timers.at(-1);
  current.callback();
  const shown = d.text.text;
  old.callback();
  assert.equal(old.removed, true);
  assert.equal(d.text.text, shown);
  assert.equal(d.typing, true);
  assert.equal(d.arrow.visible, false);
  d.advance();
  assert.equal(current.removed, true);
  assert.equal(d.arrow.visible, true);
  d.close(); old.callback(); current.callback();
  assert.equal(d.arrow.visible, false);
});
