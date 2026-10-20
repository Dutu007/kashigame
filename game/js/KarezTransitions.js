// Illustrated interludes. Game progress is committed by the caller before playback.
const KAREZ_INTERLUDES = Object.freeze({
  arrival: { title: '循水而来', caption: '荒原上的三口竖井，连着小镇看不见的水脉。', duration: 3000 },
  descend: { title: '沿梯入井', caption: '握稳横踏杆，沿绳梯下到井底落脚处。', duration: 2800, repeat: 650 },
  ascend: { title: '重返地表', caption: '循着井口的天光，沿原来的绳梯返回。', duration: 2800, repeat: 650 },
  'silt-cleared': { title: '中段疏通', caption: '松沙与碎石已清走，水流重新穿过这段暗渠。', duration: 3000 },
  'water-restored': { title: '复查通水', caption: '渠缘已经稳住，参照石旁的水流也平顺了。', duration: 3000 },
  'maintenance-record': { title: '水脉有记', caption: '把巡查与修护写入记录，交还给守井人。', duration: 3200 },
});

class KarezTransitionPlayer {
  constructor({ view, readSeen, markSeen, lock = () => {}, now = () => performance.now(),
    schedule = (fn, ms) => setTimeout(fn, ms), cancel = id => clearTimeout(id) }) {
    Object.assign(this, { view, readSeen, markSeen, lock, now, schedule, cancel });
    this.current = null;
    this.queue = [];
    this.pausedBy = new Set();
  }
  get active() { return !!this.current; }
  hasSeen(id) { return this.readSeen()?.[id] === true; }
  preload(ids) { this.view.preload?.(ids); }
  play(id, done = () => {}) {
    if (!KAREZ_INTERLUDES[id]) throw new Error(`Unknown karez interlude: ${id}`);
    this.queue.push({ id, done });
    this.drain();
  }
  drain() {
    if (this.active || !this.queue.length) return;
    const entry = this.queue.shift(), meta = KAREZ_INTERLUDES[entry.id];
    const seen = this.hasSeen(entry.id);
    if (seen && !meta.repeat) { entry.done(); this.drain(); return; }
    const job = this.current = { ...entry, repeat: seen && !!meta.repeat, shown: false,
      closing: false, startedAt: this.now(), timer: null };
    this.lock(true);
    // Missing artwork must never leave the scene locked.
    this.arm(job, 6000, () => this.finish(job));
    Promise.resolve().then(() => this.view.show(entry.id, meta, job.repeat)).then(() => {
      if (this.current !== job || job.closing) return;
      job.shown = true;
      this.arm(job, job.repeat ? meta.repeat : meta.duration, () => this.finish(job));
    }).catch(() => this.finish(job));
  }
  arm(job, ms, timeout) {
    this.cancel(job.timer);
    job.timer = null;
    job.remaining = ms;
    job.timeout = timeout;
    if (!this.pausedBy.size) {
      job.tickAt = this.now();
      job.timer = this.schedule(timeout, ms);
    }
  }
  skip() {
    const job = this.current;
    // Do not let the interaction key which opened a card immediately close it.
    if (job && !job.closing && !this.pausedBy.size && this.now() - job.startedAt >= 200) this.finish(job);
  }
  finish(job) {
    if (this.current !== job || job.closing) return;
    job.closing = true;
    this.cancel(job.timer);
    if (job.shown) this.markSeen(job.id);
    Promise.resolve().then(() => this.view.hide()).catch(() => {}).then(() => {
      if (this.current !== job) return;
      this.current = null;
      this.lock(false);
      try { job.done(); } finally { this.drain(); }
    });
  }
  pause(reason) {
    if (this.pausedBy.has(reason)) return;
    this.pausedBy.add(reason);
    const job = this.current;
    if (this.pausedBy.size === 1 && job && !job.closing && job.timer !== null) {
      job.remaining = Math.max(0, job.remaining - (this.now() - job.tickAt));
      this.cancel(job.timer);
      job.timer = null;
    }
    this.view.pause?.(true);
  }
  resume(reason) {
    this.pausedBy.delete(reason);
    if (this.pausedBy.size) return;
    this.view.pause?.(false);
    const job = this.current;
    if (job && !job.closing && job.timer === null) this.arm(job, job.remaining, job.timeout);
  }
}

function createKarezTransitionView() {
  const root = document.getElementById('karez-transition');
  const art = root.querySelector('.karez-transition__art');
  const cast = root.querySelector('.karez-transition__cast');
  const skip = root.querySelector('button');
  const cache = new Map();
  let revision = 0, priorFocus;
  const artPath = id => `assets/transitions/karez/${id}.png?v=1`;
  function load(src) {
    if (!cache.has(src)) {
      const promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = () => { cache.delete(src); reject(new Error(`Artwork unavailable: ${src}`)); };
        img.src = src;
      });
      cache.set(src, promise);
    }
    return cache.get(src);
  }
  function actor(id, pose, className) {
    const img = document.createElement('img');
    img.className = `karez-transition__actor ${className}`;
    img.alt = '';
    img.dataset.character = id;
    img.src = id === 'keeper' ? 'assets/characters/keeper/keeper_idle.png?v=1' : GameCharacters.frame(id, pose, 0);
    cast.append(img);
    return load(img.src);
  }
  return {
    preload(ids) { ids.forEach(id => load(artPath(id)).catch(() => {})); },
    async show(id, meta, repeat) {
      const token = ++revision;
      priorFocus = document.activeElement;
      root.dataset.card = id;
      root.dataset.phase = 'loading';
      root.dataset.repeat = String(repeat);
      root.querySelector('h2').textContent = meta.title;
      root.querySelector('p').textContent = meta.caption;
      root.querySelector('.karez-transition__chapter').textContent = '时间织城 · 坎儿井';
      root.hidden = false;
      cast.replaceChildren();
      skip.focus({ preventScroll: true });
      const pending = [load(artPath(id))];
      if (id === 'arrival') {
        pending.push(actor(Campaign.snapshot().character || 'aysu', 'walkLeft', 'arrival-hero'));
        pending.push(actor('keeper', 'idle', 'arrival-keeper'));
      } else if (id === 'maintenance-record') {
        pending.push(actor('aide', 'idle', 'record-aide'));
        pending.push(actor('keeper', 'idle', 'record-keeper'));
        pending.push(actor('aysu', 'idle', 'record-aysu'));
      }
      await Promise.all(pending);
      if (token !== revision) return;
      art.src = artPath(id);
      await art.decode();
      if (token === revision) root.dataset.phase = 'playing';
    },
    hide() {
      ++revision;
      root.dataset.phase = 'closing';
      return new Promise(resolve => setTimeout(() => {
        root.hidden = true;
        cast.replaceChildren();
        if (priorFocus?.isConnected) priorFocus.focus({ preventScroll: true });
        resolve();
      }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180));
    },
    pause(paused) { root.dataset.paused = String(paused); },
  };
}

const KarezTransitions = typeof document === 'undefined' ? null : new KarezTransitionPlayer({
  view: createKarezTransitionView(),
  readSeen: () => G.state.cutscenes,
  markSeen(id) {
    if (!G.state.cutscenes || typeof G.state.cutscenes !== 'object') G.state.cutscenes = {};
    G.state.cutscenes[id] = true;
    SaveService.save();
  },
  lock() {
    // Clear held keys at both edges so a skip cannot also move, jump or interact.
    for (const scene of game.scene.getScenes(true)) scene.input.keyboard?.resetKeys();
  },
});

if (KarezTransitions) {
  const root = document.getElementById('karez-transition');
  root.querySelector('button').addEventListener('click', () => KarezTransitions.skip());
  const consumeKey = event => {
    if (!KarezTransitions.active) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type === 'keydown' && !event.repeat && ['Space', 'Enter', 'Escape'].includes(event.code)) KarezTransitions.skip();
  };
  window.addEventListener('keydown', consumeKey, true);
  window.addEventListener('keyup', consumeKey, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) KarezTransitions.pause('visibility');
    else KarezTransitions.resume('visibility');
  });
  if (document.hidden) KarezTransitions.pause('visibility');
}
if (typeof module !== 'undefined') module.exports = { KarezTransitionPlayer, KAREZ_INTERLUDES };
