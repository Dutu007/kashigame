// Small lifecycle boundary between the DOM chapter, Phaser chapter and game shell.
(function (root) {
  'use strict';
  const rootURL = new URL('../index.html', document.currentScript.src).href;
  let hooks = {};
  root.ChapterBridge = {
    register(next) { hooks = next; },
    save() { if (hooks.save) hooks.save(); },
    pause() { if (hooks.pause) hooks.pause(); },
    resume() { if (hooks.resume) hooks.resume(); },
    complete(chapter) {
      this.save();
      Campaign.complete(chapter);
      try {
        if (root.parent !== root && root.parent.GameApp) {
          root.parent.GameApp.showCompletion(chapter);
          return;
        }
      } catch (_) { /* Fall through to the standalone chapter's campaign screen. */ }
      root.location.assign(rootURL + '?completed=' + chapter);
    },
  };
  root.addEventListener('pagehide', () => root.ChapterBridge.save());
  root.addEventListener('beforeunload', () => root.ChapterBridge.save());
})(window);
