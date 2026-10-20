// 最后加载：所有场景类就绪后启动游戏
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0d0906',
  render: { roundPixels: true },
    // ENVELOP scales the fixed 16:9 game surface to cover the viewport;
    // excess edges are cropped instead of rendering black/green letterbox bars.
    scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, SurfaceScene, TunnelScene, UIScene],
});
Campaign.enter('karez');
if (G.state.chapterComplete) Campaign.complete('karez');
ChapterBridge.register({
  prepareRestart() { SaveService.suspended = true; },
  save() {
    // Flush live workshop models before the host removes this chapter's iframe.
    const workshop = game.scene.getScene('UI')?.workshop;
    if (workshop?.opened) {
      workshop.ladderGame?.save();
      workshop.lampGame?.save();
    }
    game.scene.getScene('Tunnel')?.patchRepair?.save();
    SaveService.save();
  },
  pause() { KarezTransitions.pause('host'); game.input.enabled = false; game.loop.sleep(); },
  resume() { game.input.enabled = true; game.loop.wake(); KarezTransitions.resume('host'); },
});
