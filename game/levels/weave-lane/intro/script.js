const stage = document.getElementById('stage');
const video = document.querySelector('.intro-video');
const skip = document.querySelector('.intro-skip');
const replay = document.querySelector('.replay');

const DESIGN_W = 1672;
const DESIGN_H = 941;
/* Narration fallback timing; also used when the opening video cannot play. */
const TRANSITION_DURATION = 11100;
/* Give the decoder time to produce a frame before falling back to narration. */
const VIDEO_STALL = 12000;

let transitionTimer = null;
let stallTimer = null;
let rafA = null;
let rafB = null;
let ready = false;
let requested = !new URLSearchParams(location.search).has('embedded');
let started = false;
let finished = false;
let skipRequested = false;
let mode = null;
let pausedByHost = false;

// The map loading screen calls resume only once the chapter is visible.
function startWhenReady() {
  requested = true;
  if (!ready || started) return;
  started = true;
  startVideo();
}
window.ChapterBridge = {
  resume() {
    if (pausedByHost) {
      pausedByHost = false;
      if (mode === 'video') playVideo();
      return;
    }
    startWhenReady();
  },
  save() {},
  pause() {
    pausedByHost = true;
    if (mode === 'video' && !video.paused) video.pause();
  },
  /* Skips the opening and hands the chapter back to the shell. */
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
   舞台自适应
   ======================================== */
function fitStage() {
  // Cover the viewport so the transition has no side/top letterbox bars.
  // The fixed design stage is intentionally cropped at the overflowing edge.
  const scale = Math.max(
    window.innerWidth / DESIGN_W,
    window.innerHeight / DESIGN_H
  );

  stage.style.setProperty('--stage-scale', String(scale));
}

/* ========================================
   完成转场：交给关卡外壳切到正片
   ======================================== */
function complete() {
  if (finished) return;
  finished = true;
  clearTimeout(transitionTimer);
  transitionTimer = null;
  clearTimeout(stallTimer);
  stallTimer = null;
  if (video) {
    try {
      video.pause();
    } catch (_) {
      /* A missing decoder must not block the handoff. */
    }
  }
  window.dispatchEvent(new CustomEvent('zhimengxiangTransitionComplete'));
}

/* ========================================
   片头视频
   ======================================== */
function playVideo() {
  if (!video) return;
  const playback = video.play();
  if (playback && playback.catch) {
    playback.catch(() => {
      if (!finished) startNarration();
    });
  }
}

function startVideo() {
  if (!video) {
    startNarration();
    return;
  }
  if (skipRequested) {
    complete();
    return;
  }
  mode = 'video';
  stage.classList.add('video-mode');
  stage.classList.add('play');
  if (skip) skip.hidden = false;
  clearTimeout(stallTimer);
  stallTimer = setTimeout(() => {
    if (!finished && mode === 'video' && video.paused) startNarration();
  }, VIDEO_STALL);
  playVideo();
}

/* ========================================
   旁白兜底：视频不可用时沿用原有分镜旁白
   ======================================== */
function startNarration() {
  if (finished) return;
  if (mode === 'video') {
    mode = 'narration';
    stage.classList.remove('video-mode');
    stage.classList.remove('video-playing');
    if (skip) skip.hidden = true;
    if (video) {
      try {
        video.pause();
      } catch (_) {
        /* Ignore a stopped element. */
      }
    }
  }
  clearTimeout(transitionTimer);
  clearTimeout(stallTimer);
  stallTimer = null;
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
   跳过片头
   ======================================== */
function skipOpening(event) {
  if (event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  if (finished) return;
  // The shell only starts playback after its own transition; remember an early skip
  // so it takes effect as soon as the opening is allowed to begin.
  if (!started) {
    skipRequested = true;
    return;
  }
  complete();
}
if (skip) skip.addEventListener('click', skipOpening);
window.addEventListener('keydown', event => {
  if (!['Space', 'Enter', 'Escape'].includes(event.code)) return;
  skipOpening(event);
}, true);

/* ========================================
   初始化
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

function restart() {
  clearRafs();
  if (mode === 'video') {
    if (video) {
      video.currentTime = 0;
      playVideo();
    }
    return;
  }
  startNarration();
}

async function init() {
  fitStage();
  window.addEventListener('resize', fitStage, { passive: true });

  if (video) {
    video.addEventListener('playing', () => {
      clearTimeout(stallTimer);
      stallTimer = null;
      // Reveal the video only once it is actually painting; the background stays
      // visible while the decoder buffers.
      if (mode === 'video') stage.classList.add('video-playing');
    });
    video.addEventListener('error', () => {
      if (!finished && mode === 'video') startNarration();
    });
    video.addEventListener('ended', () => {
      if (!finished) complete();
    });
  }

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
  clearTimeout(transitionTimer);
  clearTimeout(stallTimer);
  transitionTimer = null;
  stallTimer = null;
  if (video) {
    try {
      video.pause();
    } catch (_) {
      /* Ignore a stopped element. */
    }
  }
});
