// 最后加载：所有场景类就绪后启动游戏
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0d0906',
  render: { roundPixels: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, SurfaceScene, TunnelScene, UIScene],
});
Campaign.enter('karez');
if (G.state.chapterComplete) Campaign.complete('karez');
ChapterBridge.register({
  save() {
    // Flush live workshop models before the host removes this chapter's iframe.
    const workshop = game.scene.getScene('UI')?.workshop;
    if (workshop?.opened) {
      workshop.ladderGame?.save();
      workshop.lampGame?.save();
      if (workshop.kind === 'patch') workshop.savePatchProgress();
    }
    SaveService.save();
  },
  pause() { game.input.enabled = false; game.loop.sleep(); },
  resume() { game.input.enabled = true; game.loop.wake(); },
});
