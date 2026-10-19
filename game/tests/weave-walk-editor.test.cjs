const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../levels/weave-lane/js/core/walk-editor.js'), 'utf8');

function fixture(saved = new Map()) {
  const nodes = new Map(), listeners = {};
  class Node {
    constructor() { this.style = {}; this.dataset = {}; this.children = []; this.listeners = {}; }
    set id(value) { this._id = value; nodes.set(value, this); }
    get id() { return this._id; }
    setAttribute(key, value) {
      this[key] = String(value);
      if (key.startsWith('data-')) this.dataset[key.slice(5)] = String(value);
    }
    append(...children) { this.children.push(...children); }
    replaceChildren() { this.children = []; }
    querySelector(selector) { return this.parts[selector]; }
    set innerHTML(value) {
      this.parts = { select: new Node(), '[data-action="undo"]': new Node() };
      new Node().id = 'walkEditorStatus';
    }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture() { this.capture = null; }
    getScreenCTM() { return { inverse: () => ({}) }; }
  }
  new Node().id = 'board';
  const polygon = [[100, 100], [400, 100], [400, 400], [100, 400]];
  const context = {
    scenes: [{ title: '测试场景', walk: [polygon], obstacles: [] }],
    state: { scene: 0, x: 200, y: 200 }, W: 1672, H: 941,
    keys: new Set(), fixStand: p => p, render() {},
    $: id => nodes.get(id),
    document: { createElement: () => new Node(), createElementNS: () => new Node() },
    localStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) },
    DOMPoint: class { constructor(x, y) { this.x = x; this.y = y; } matrixTransform() { return this; } },
    window: { addEventListener: (name, handler) => { listeners[name] = handler; } },
  };
  vm.runInNewContext(source, context);
  const overlay = nodes.get('walkEditorOverlay');
  const send = (name, extra = {}) => overlay.listeners[name]({ pointerId: 1, button: 0, clientX: 100, clientY: 100, preventDefault() {}, ...extra });
  return { context, nodes, overlay, send, saved };
}

test('dragging an edge moves both endpoints, updates live collision geometry and survives reload', () => {
  const f = fixture();
  f.context.window.WalkEditor.setActive(true);
  const edge = f.overlay.children.find(node => node.dataset.mode === 'edge');
  f.send('pointerdown', { target: edge });
  f.send('pointermove', { clientX: 125, clientY: 140 });
  f.send('pointerup');
  assert.equal(JSON.stringify(f.context.scenes[0].walk[0].slice(0, 2)), '[[125,140],[425,140]]');
  assert.equal(JSON.stringify(fixture(f.saved).context.scenes[0].walk), JSON.stringify(f.context.scenes[0].walk));
  f.nodes.get('walkEditorPanel').listeners.click({ target: { dataset: { action: 'undo' } } });
  assert.equal(JSON.stringify(f.context.scenes[0].walk[0][0]), '[100,100]');
});

test('dragging a vertex clamps to the board and cancellation restores the previous geometry', () => {
  const f = fixture();
  f.context.window.WalkEditor.setActive(true);
  const vertex = f.overlay.children.find(node => node.dataset.mode === 'vertex');
  f.send('pointerdown', { target: vertex });
  f.send('pointermove', { clientX: -300, clientY: -300 });
  assert.equal(JSON.stringify(f.context.scenes[0].walk[0][0]), '[0,0]');
  assert.equal(JSON.stringify(f.context.scenes[0].walk[0][1]), '[400,100]');
  f.send('pointercancel');
  assert.equal(JSON.stringify(f.context.scenes[0].walk[0][0]), '[100,100]');
  assert.equal(f.saved.size, 0);
});

test('invalid stored polygons cannot replace the scene geometry', () => {
  const saved = new Map([['weave-lane.walk-geometry.v1', JSON.stringify([{ walk: [], obstacles: [] }])]]);
  const f = fixture(saved);
  assert.equal(f.context.scenes[0].walk[0].length, 4);
});
