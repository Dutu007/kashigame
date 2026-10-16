// Chapter checkpoints contain gameplay only, never timers, DOM nodes or callbacks.
const LevelOneProgress = (() => {
  const KEY = 'twc_l1_save';
  const fields = ['scene','x','y','character','facing','quest','patternPlan','collection',
    'boundWarp','dyedWarp','woven','silkCollected','chapterComplete','dyeMet','dyeBriefed'];
  let ready = false, previous = '', pausedBusy = false;
  function save() {
    if (!ready) return;
    if (typeof saveDraftNow === 'function' && cs) saveDraftNow();
    const stable = Object.fromEntries(fields.map(key => [key, state[key]]));
    const checkpoint = { v: 1, state: stable,
      thread: { round: threadState.round, path: threadState.path, attempts: threadState.attempts,
        bound: threadState.bound, bindNext: threadState.bindNext, hintLevel: threadState.hintLevel },
      weave: { step: weaveState.step, round: weaveState.round, demo: weaveState.demo },
      vats: vatState, vatColors, activeVat, puzzleOrder: puzzleState.order,
    };
    const encoded = JSON.stringify(checkpoint);
    if (encoded === previous) return;
    if (Campaign.write(KEY, checkpoint)) previous = encoded;
  }
  function restore() {
    const saved = Campaign.read(KEY);
    if (!saved || saved.v !== 1 || !saved.state || !Number.isInteger(saved.state.scene)
      || !scenes[saved.state.scene] || !Number.isFinite(saved.state.x) || !Number.isFinite(saved.state.y)) return false;
    for (const key of fields) if (Object.hasOwn(saved.state, key)) state[key] = saved.state[key];
    if (!Array.isArray(state.collection)) state.collection = [];
    // Older checkpoints had no collection flag; an existing entry proves receipt.
    state.silkCollected = !!saved.state.silkCollected || state.collection.length > 0;
    state.character = GameCharacters.normalize(Campaign.snapshot().character);
    state.portalLock = null; state.motionTime = 0; state.busy = false;
    state.dialogueOpen = false; state.dialogueQueue = []; state.afterDialogue = null;
    if (saved.thread) Object.assign(threadState, saved.thread);
    threadState.demoPlaying = false; threadState.demoRound = -1;
    if (saved.weave) Object.assign(weaveState, saved.weave);
    for (const vat of VATS) if (saved.vats?.[vat.key]) Object.assign(vatState[vat.key], saved.vats[vat.key]);
    vatColors = saved.vatColors || null;
    activeVat = VATS.some(vat => vat.key === saved.activeVat) ? saved.activeVat : 'base';
    const order = saved.puzzleOrder;
    if (Array.isArray(order) && order.length === PUZZLE_STRIPS && new Set(order).size === PUZZLE_STRIPS
      && order.every(n => Number.isInteger(n) && n >= 0 && n < PUZZLE_STRIPS)) puzzleState.order = order.slice();
    ready = true;
    if (state.chapterComplete) Campaign.complete('weave');
    return true;
  }
  function start() { ready = true; Campaign.enter('weave'); save(); }
  ChapterBridge.register({
    save,
    pause() { pausedBusy = state.busy; state.busy = true; keys.clear(); },
    resume() { state.busy = pausedBusy; keys.clear(); },
  });
  setInterval(save, 2000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  return { save, restore, start };
})();
