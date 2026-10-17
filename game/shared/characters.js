// One source of truth for the protagonists used by both chapter renderers.
(function (root) {
  'use strict';
  const base = new URL('../assets/characters/', document.currentScript.src).href;
  const definitions = {
    aysu: { name: '阿依苏', frames: { idle: 1, walkDown: 22, walkUp: 22, walkLeft: 24, walkRight: 24 } },
    aide: { name: '艾德', frames: { idle: 1, walkDown: 24, walkUp: 24, walkLeft: 24, walkRight: 24 } },
  };
  function normalize(id) { return Object.hasOwn(definitions, id) ? id : 'aysu'; }
  function pose(id, action) {
    id = normalize(id);
    const directory = action === 'idle' ? 'idle' : 'walk';
    const suffix = action === 'idle' ? 'idle' : 'walk_' + action.slice(4).toLowerCase();
    return { base: `${base}${id}/${directory}/${id}_${suffix}_`, frames: definitions[id].frames[action] };
  }
  root.GameCharacters = Object.freeze({
    definitions, normalize, pose, base,
    walkCycleSeconds: 0.672,
    // The original 300 × 340 frames include transparent margins. Anchor at the soles.
    frameHeight: 340, footY: 335, visibleHeight: 294,
    frame(id, action, index = 0) { return pose(id, action).base + String(index).padStart(2, '0') + '.png'; },
    portrait(id, emotion = 'neutral') { return `${base}${id}/portraits/emotions/${id}_portrait_${emotion}.png`; },
  });
})(window);
