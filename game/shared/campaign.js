// Shared campaign service. Embedded chapters use the host instance, including its
// in-memory fallback when localStorage is unavailable or full.
(function (root) {
  'use strict';
  try {
    if (root.parent !== root && root.parent.Campaign) {
      root.Campaign = root.parent.Campaign;
      return;
    }
  } catch (_) { /* Standalone chapter or a different origin. */ }

  const KEY = 'twc_campaign_v1';
  const memory = new Map();
  const failedKeys = new Set();
  const listeners = new Set();
  let storageOK = true;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function read(key) {
    if (memory.has(key)) return clone(memory.get(key));
    try { return JSON.parse(root.localStorage.getItem(key)); }
    catch (_) { return null; }
  }
  function write(key, value) {
    memory.set(key, clone(value));
    try { root.localStorage.setItem(key, JSON.stringify(value)); failedKeys.delete(key); }
    catch (_) { failedKeys.add(key); }
    storageOK = failedKeys.size === 0;
    return !failedKeys.has(key);
  }
  const record = read(KEY);
  const saved = record?.version === 1 ? record : null;
  const data = {
    version: 1,
    character: saved?.character === 'aide' ? 'aide' : 'aysu',
    characterChosen: !!saved?.characterChosen,
    currentChapter: saved?.currentChapter === 'karez' ? 'karez' : 'weave',
    started: { weave: !!saved?.started?.weave, karez: !!saved?.started?.karez },
    completed: { weave: !!saved?.completed?.weave, karez: !!saved?.completed?.karez },
  };
  // Keep existing chapter-two saves playable without inventing a chapter-one clear.
  const legacy = read('twc_l2_save');
  if (legacy?.v === 4 && legacy.s && typeof legacy.s === 'object') {
    data.started.karez = true;
    data.completed.karez = !!legacy.s.chapterComplete;
    if (!saved) data.currentChapter = 'karez';
  }
  const weave = read('twc_l1_save');
  if (weave?.v === 1 && weave.state) {
    data.started.weave = true;
    data.completed.weave = !!weave.state.chapterComplete;
    if (!data.characterChosen) {
      data.character = weave.state.character === 'aide' ? 'aide' : 'aysu';
      data.characterChosen = true;
    }
  }
  function commit() {
    write(KEY, data);
    for (const listener of listeners) listener(clone(data));
  }
  function checkChapter(id) {
    if (id !== 'weave' && id !== 'karez') throw new Error('Unknown chapter: ' + id);
  }
  root.Campaign = Object.freeze({
    read, write,
    snapshot: () => clone(data),
    get storageOK() { return storageOK; },
    canEnter: id => id === 'weave' || (id === 'karez' && (data.completed.weave || data.started.karez)),
    chooseCharacter(id) {
      if (id !== 'aysu' && id !== 'aide') throw new Error('Unknown character: ' + id);
      data.character = id; data.characterChosen = true; commit();
    },
    enter(id) {
      checkChapter(id);
      data.currentChapter = id;
      data.started[id] = true; commit();
    },
    complete(id) {
      checkChapter(id);
      data.started[id] = true;
      if (data.completed[id]) return;
      data.completed[id] = true; commit();
    },
    resetChapter(id) {
      checkChapter(id);
      write(id === 'weave' ? 'twc_l1_save' : 'twc_l2_save', null);
      // A restart is a brand-new run: the chapter opening plays again.
      data.completed[id] = false;
      data.started[id] = false;
      commit();
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  });
})(window);
