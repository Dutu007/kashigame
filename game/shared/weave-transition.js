// Prepare the visual while the current map stays visible; swap maps only under full cover.
(function () {
  'use strict';
  const visualURL = new URL('map-transition/index.html?v=smooth-2', document.currentScript.src).href;
  const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  const painted = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  let active = null;
  let prepared = null;

  function prepare() {
    if (prepared) return prepared;
    const overlay = document.createElement('div');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#16110c;opacity:0;visibility:hidden;pointer-events:none;transition:opacity 360ms ease;';
    const frame = document.createElement('iframe');
    frame.title = '织梦巷织结转场';
    frame.tabIndex = -1;
    frame.style.cssText = 'display:block;width:100%;height:100%;border:0;pointer-events:none;';
    const ready = new Promise(resolve => frame.addEventListener('load', async () => {
      await frame.contentWindow.transitionReady;
      resolve();
    }, { once: true }));
    frame.src = visualURL;
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    prepared = { overlay, frame, ready };
    return prepared;
  }

  function blockInput(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  async function play(change) {
    const previousFocus = document.activeElement;
    const visual = prepare();
    const { overlay, frame } = visual;
    window.addEventListener('keydown', blockInput, true);
    window.addEventListener('keyup', blockInput, true);
    try {
      // Until the transition artwork is decoded, keep the current scene visible.
      await visual.ready;
      overlay.id = 'weaveMapTransition';
      overlay.removeAttribute('aria-hidden');
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-label', '正在穿行织梦巷');
      overlay.style.visibility = 'visible';
      overlay.style.pointerEvents = 'auto';
      frame.contentWindow.startTransition();
      await painted();
      overlay.style.opacity = '1';
      const cycle = delay(3400);
      await painted();
      await Promise.all(overlay.getAnimations().map(animation => animation.finished));
      overlay.dataset.phase = 'covered';
      await Promise.all([cycle, change()]);
      await painted();
      overlay.dataset.phase = 'leaving';
      overlay.style.transitionDuration = '450ms';
      overlay.style.opacity = '0';
      await delay(470);
    } finally {
      overlay.remove();
      prepared = null;
      window.removeEventListener('keydown', blockInput, true);
      window.removeEventListener('keyup', blockInput, true);
      if (previousFocus?.isConnected) previousFocus.focus();
      window.focus();
      if (document.getElementById('board')) prepare();
    }
  }

  window.WeaveMapTransition = Object.freeze({
    run(change) {
      if (active) return active;
      active = play(change).finally(() => { active = null; });
      return active;
    },
    get active() { return active !== null; },
  });
  if (document.getElementById('board')) prepare();
})();
