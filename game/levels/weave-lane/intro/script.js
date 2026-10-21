const stage = document.getElementById('stage');
const replay = document.querySelector('.replay');

const DESIGN_W = 1672;
const DESIGN_H = 941;
const TRANSITION_DURATION = 11100;

const embedded = new URLSearchParams(location.search).has('embedded');

let transitionTimer = null;
let rafA = null;
let rafB = null;
let ready = false;
let requested = !embedded;
let started = false;
let finished = false;
let skipRequested = false;

/* ========================================
   舞台自适应
   ======================================== */
function fitStage() {
  const scale = Math.min(
    window.innerWidth / DESIGN_W,
    window.innerHeight / DESIGN_H
  );

  stage.style.setProperty('--stage-scale', String(scale));
}

/* ========================================
   转场完成
   ======================================== */
function complete() {
  if (finished) return;
  finished = true;
  clearTimeout(transitionTimer);
  transitionTimer = null;
  window.dispatchEvent(
    new CustomEvent('zhimengxiangTransitionComplete')
  );
}

// 地图加载层会把入场动画放到画面上之后再调用 resume；
// 直接打开本页预览时则自动播放。
function startWhenReady() {
  requested = true;
  if (!ready || started) return;
  started = true;
  if (skipRequested) {
    complete();
    return;
  }
  restart();
}
window.ChapterBridge = {
  resume: startWhenReady,
  save() {},
  pause() {},
  /* 供外壳跳过入场动画（测试也用它跳到正片）。 */
  skip() {
    if (finished) return;
    if (!started) {
      skipRequested = true;
      return;
    }
    complete();
  },
};

/* ========================================
   清理 RAF
   ======================================== */
function clearRafs() {
  if (rafA !== null) {
    cancelAnimationFrame(rafA);
    rafA = null;
  }

  if (rafB !== null) {
    cancelAnimationFrame(rafB);
    rafB = null;
  }
}

/* ========================================
   播放 / 重播动画
   ======================================== */
function restart() {
  clearRafs();

  if (transitionTimer !== null) {
    clearTimeout(transitionTimer);
    transitionTimer = null;
  }

  finished = false;
  stage.classList.remove('play');

  /* 跨两个渲染帧重置动画，不同步读取布局。 */
  rafA = requestAnimationFrame(() => {
    rafB = requestAnimationFrame(() => {
      stage.classList.add('play');
      transitionTimer = setTimeout(complete, TRANSITION_DURATION);
      rafA = null;
      rafB = null;
    });
  });
}

/* ========================================
   初始化
   ======================================== */
async function init() {
  fitStage();
  window.addEventListener('resize', fitStage, { passive: true });

  /* 避免图片解码、字体替换与第一段入场动画争用时间。 */
  const background = stage.querySelector('.background');
  await Promise.all([
    background && background.decode ? background.decode().catch(() => {}) : Promise.resolve(),
    document.fonts ? document.fonts.ready : Promise.resolve()
  ]);
  ready = true;
  if (requested) startWhenReady();

  if (replay) {
    /* 外壳里播放时隐藏“重播”，避免把已经交棒的入场动画再放一遍。 */
    replay.hidden = embedded;
    replay.addEventListener('click', restart);
  }
}

/* ========================================
   DOM ready
   ======================================== */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

/* ========================================
   页面离开时清理
   ======================================== */
window.addEventListener('beforeunload', () => {
  clearRafs();
  clearTimeout(transitionTimer);
  transitionTimer = null;
});
