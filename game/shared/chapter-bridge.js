// Small lifecycle boundary between the DOM chapter, Phaser chapter and game shell.
(function (root) {
  'use strict';
  const rootURL = new URL('../index.html', document.currentScript.src).href;
  let hooks = {};
  let restarting = false;
  // Chapter two ends the whole journey, so it hands the player straight back to the
  // level list. Chapter one keeps its hand-off card, which leads into chapter two.
  const RETURNS_TO_LEVEL_LIST = { karez: true };
  function afterCompletionURL(chapter) {
    return rootURL + (RETURNS_TO_LEVEL_LIST[chapter] ? '' : '?completed=' + chapter);
  }
  root.ChapterBridge = {
    register(next) { hooks = next; },
    save() { if (!restarting && hooks.save) hooks.save(); },
    pause() { if (hooks.pause) hooks.pause(); },
    resume() { if (hooks.resume) hooks.resume(); },
    prepareRestart() {
      if (restarting) return;
      restarting = true;
      if (hooks.prepareRestart) hooks.prepareRestart();
      this.pause();
    },
    complete(chapter) {
      if (restarting) return;
      this.save();
      Campaign.complete(chapter);
      try {
        const host = root.parent !== root ? root.parent.GameApp : null;
        if (host && host.finishChapter) { host.finishChapter(chapter); return; }
      } catch (_) { /* Different origin or a host without the shell API. */ }
      root.location.assign(afterCompletionURL(chapter));
    },
  };
  root.addEventListener('pagehide', () => root.ChapterBridge.save());
  root.addEventListener('beforeunload', () => root.ChapterBridge.save());
})(window);
