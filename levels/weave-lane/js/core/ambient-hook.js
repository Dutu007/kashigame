// Ambient 场景切换钩子：包装 loadScene，切场景时同步环境层配置。
// 注意 ambient.js 以顶层 const 声明（全局词法环境，不挂 window），此处直接引用 Ambient。
// 加载顺序：ambient.js -> 本文件，正常切场时保持环境动效同步。
(function () {
  if (typeof window.loadScene !== 'function' || typeof Ambient === 'undefined') return;
  const _loadScene = window.loadScene;
  window.loadScene = function (n, spawn) {
    const r = _loadScene.apply(this, arguments);
    Ambient.setScene(n);
    return r;
  };
})();
