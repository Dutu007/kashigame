const stage = document.getElementById('stage');
const replay = document.querySelector('.replay');

const DESIGN_W = 1672;
const DESIGN_H = 941;
const TRANSITION_DURATION = 11100;

let transitionTimer = null;
let rafA = null;
let rafB = null;
let ready = false;
let requested = !new URLSearchParams(location.search).has('embedded');
let started = false;

// The map loading screen calls resume only once the chapter is visible.
function startWhenReady() {
  requested = true;
  if (!ready || started) return;
  started = true;
  restart();
}
window.ChapterBridge = { resume: startWhenReady, save() {}, pause() {} };

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
   转场完成计时
   ======================================== */
function startCompletionTimer() {
  if (transitionTimer !== null) {
    clearTimeout(transitionTimer);
    transitionTimer = null;
  }

  transitionTimer = setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent('zhimengxiangTransitionComplete')
    );
    transitionTimer = null;
  }, TRANSITION_DURATION);
}

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

  stage.classList.remove('play');

  /* 跨两个渲染帧重置动画，不同步读取布局。 */
  rafA = requestAnimationFrame(() => {
    rafB = requestAnimationFrame(() => {
      stage.classList.add('play');
      startCompletionTimer();
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

  if (transitionTimer !== null) {
    clearTimeout(transitionTimer);
    transitionTimer = null;
  }
});
