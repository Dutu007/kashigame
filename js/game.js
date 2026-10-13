// 最后加载：所有场景类就绪后启动游戏
window.__errs = [];
window.addEventListener('error', e =>
  window.__errs.push((e.message || 'error') + ' @ ' + (e.filename || '').split('/').pop() + ':' + (e.lineno || '?')));
window.addEventListener('unhandledrejection', e =>
  window.__errs.push('promise: ' + ((e.reason && e.reason.message) || e.reason)));

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0d0906',
  render: { roundPixels: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // ?timeoutloop=1：用 setTimeout 驱动主循环（窗口被遮挡、RAF 挂起时仍可运行）
  fps: { forceSetTimeOut: location.search.includes('timeoutloop') },
  scene: [BootScene, SurfaceScene, TunnelScene, UIScene],
});
window.__game = game; // 调试句柄
