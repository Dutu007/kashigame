// ============================================================
// UI 场景：对话框 / Toast / 目标追踪 / 操作提示
// 风格参照《时间织城 对话框 UI 设计方案》：羊皮纸底 + 喀什纹样配色
// （砖红 #9e3d2e · 孔雀青 #2e6e63 · 金 #c9973f · 米纸 #f7ecd4）
// 渲染分辨率 1920×1080，所有尺寸按此画布标定
// ============================================================

const UI_COLORS = {
  paper: 0xf7ecd4, paperLine: 0x7a4a21, teal: 0x2e6e63,
  red: 0x9e3d2e, gold: 0xc9973f, ink: '#4a2f1a', cream: '#f7ecd4',
};

// 最新 UI 设计稿的共同骨架：米纸底、细金线、孔雀青/砖红标题签和四角纹样。
// 动态文字仍由 Phaser 绘制，避免把设计稿中的示例文案烙死在游戏里。
function ornateFrame(g, x, y, w, h, options = {}) {
  const fill = options.fill == null ? UI_COLORS.paper : options.fill;
  const alpha = options.alpha == null ? 0.98 : options.alpha;
  const accent = options.accent == null ? UI_COLORS.teal : options.accent;
  const radius = options.radius == null ? 14 : options.radius;
  g.fillStyle(fill, alpha).fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(options.outerWidth || 4, UI_COLORS.gold, 1)
    .strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, radius);
  g.lineStyle(2, accent, 0.92)
    .strokeRoundedRect(x + 11, y + 11, w - 22, h - 22, Math.max(6, radius - 5));
  const mark = (cx, cy, r = 8) => {
    g.fillStyle(UI_COLORS.gold, 1)
      .fillTriangle(cx, cy - r, cx + r, cy, cx, cy + r)
      .fillTriangle(cx - r, cy, cx, cy - r, cx, cy + r);
    g.lineStyle(1, accent, 0.8).strokeCircle(cx, cy, r + 3);
  };
  mark(x + 14, y + 14); mark(x + w - 14, y + 14);
  mark(x + 14, y + h - 14); mark(x + w - 14, y + h - 14);
  return g;
}

function titleRibbon(g, x, y, w, h, color) {
  g.fillStyle(color, 1).fillRoundedRect(x, y, w, h, 8);
  g.lineStyle(2, UI_COLORS.gold, 1).strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 8);
  g.fillStyle(UI_COLORS.gold, 1)
    .fillTriangle(x - 13, y + h / 2, x, y + 7, x, y + h - 7)
    .fillTriangle(x + w + 13, y + h / 2, x + w, y + 7, x + w, y + h - 7);
}
const SPEAKERS = {
  aysu: { name: '阿依苏', plate: UI_COLORS.red },
  keeper: { name: '守井人', plate: UI_COLORS.teal },
  aide: { name: '艾德', plate: 0x8a6a2f },
  narr: { name: '', plate: null },
};

// -------- 对话框（主对话框，参考图样式1） --------
class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    this.lines = []; this.idx = 0; this.typing = false; this.typeEvent = null;
    this.lineVersion = 0;
    this.isOpen = false; this.openAt = -1e9; this.closedAt = -1e9; this.onDone = null;

    const bw = 1580, bh = 395;
    const bx = (VIEW_W - bw) / 2, by = VIEW_H - bh - 36;
    this.boxRect = { bx, by, bw, bh };

    // 新版对话框是一张完整构图底图，灯笼、花纹、城市和正文留白保持整体关系。
    this.panel = skinImage(scene, 'dialogue', VIEW_W / 2, by + bh / 2, bw, bh)
      .setDepth(100).setVisible(false);

    // 名牌（参考图样式1：左上红砖底名牌）
    this.plateG = scene.add.graphics().setDepth(101).setVisible(false);
    this.nameText = scene.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '30px', color: UI_COLORS.cream, resolution: 2,
    }).setOrigin(0.5).setDepth(102).setVisible(false);

    this.text = scene.add.text(bx + 245, by + 135, '', {
      fontFamily: FONT, fontSize: '31px', color: UI_COLORS.ink,
      wordWrap: { width: 1110, useAdvancedWrap: true }, lineSpacing: 14, resolution: 2,
    }).setDepth(101).setVisible(false);

    // 继续箭头（参考图右下金色小箭头）
    this.arrow = scene.add.text(bx + bw - 480, by + bh - 88, 'E  继续 ▸', {
      fontFamily: FONT, fontSize: '20px', color: '#74512d', resolution: 2,
    }).setDepth(101).setVisible(false);
  }

  open(lines, onDone) {
    this.lines = lines; this.idx = 0; this.onDone = onDone || null;
    this.isOpen = true; this.openAt = this.scene.time.now;
    this.panel.setVisible(true);
    this._showLine();
  }

  _showLine() {
    this._stopTyping();
    const version = this.lineVersion;
    const line = this.lines[this.idx];
    const sp = SPEAKERS[line.s] || SPEAKERS.narr;
    const pg = this.plateG;
    pg.clear().setVisible(!!sp.plate);
    this.nameText.setVisible(!!sp.plate);
    if (sp.plate) {
      const { bx, by } = this.boxRect;
      this.nameText.setPosition(bx + 375, by + 46).setText(sp.name);
    }
    this.text.setVisible(true);
    this.arrow.setVisible(false);
    // 打字机效果
    const full = line.t; let i = 0;
    this.typing = true; this.text.setText('');
    this.typeEvent = this.scene.time.addEvent({
      delay: 26, repeat: Math.max(0, Math.ceil(full.length / 2) - 1), callback: () => {
        if (!this.isOpen || this.lineVersion !== version) return;
        i = Math.min(full.length, i + 2);
        this.text.setText(full.slice(0, i));
        if (i >= full.length) { this._stopTyping(); this.arrow.setVisible(true); }
      },
    });
  }

  _stopTyping() {
    if (this.typeEvent) this.typeEvent.remove();
    this.typeEvent = null;
    this.typing = false;
    this.lineVersion++;
  }

  advance() {
    if (!this.isOpen) return;
    if (this.typing) { // 立即补完
      this._stopTyping();
      this.text.setText(this.lines[this.idx].t);
      this.arrow.setVisible(true);
      return;
    }
    this.idx++;
    if (this.idx < this.lines.length) this._showLine();
    else this.close();
  }

  close() {
    this.isOpen = false; this.closedAt = this.scene.time.now;
    this._stopTyping();
    this.panel.setVisible(false); this.plateG.setVisible(false);
    this.nameText.setVisible(false); this.text.setVisible(false); this.arrow.setVisible(false);
    const cb = this.onDone; this.onDone = null;
    if (cb) cb();
  }
}

// -------- Toast（参考图样式7：任务提示横条） --------
class Toast {
  constructor(scene) {
    this.scene = scene; this.queue = []; this.busy = false;
    this.root = scene.add.container(0, 0).setDepth(110);
    const g = skinFrame(scene, 'panel', 0, 0, 780, 120, { cuts: [0.18, 0.18, 0.25, 0.24] });
    this.titleT = scene.add.text(120, 31, '', {
      fontFamily: FONT, fontSize: '27px', color: UI_COLORS.ink, resolution: 2,
    });
    this.subT = scene.add.text(120, 68, '', {
      fontFamily: FONT, fontSize: '20px', color: '#74512d', resolution: 2,
    });
    this.root.add([g, this.titleT, this.subT]);
    this.root.setAlpha(0);
  }
  show(title, sub) { this.queue.push({ title, sub: sub || '' }); this._next(); }
  _next() {
    if (this.busy || !this.queue.length) return;
    this.busy = true;
    const { title, sub } = this.queue.shift();
    fitUIText(this.titleT.setText(title), 565, 34, 27); fitUIText(this.subT.setText(sub), 565, 28, 20, 16);
    this.root.setPosition((VIEW_W - 780) / 2, -130);
    this.scene.tweens.add({
      targets: this.root, alpha: 1, y: 110, duration: 260, ease: 'Cubic.out',
      onComplete: () => {
        this.scene.time.delayedCall(2100, () => {
          this.scene.tweens.add({
            targets: this.root, alpha: 0, y: 44, duration: 300,
            onComplete: () => { this.busy = false; this._next(); },
          });
        });
      },
    });
  }
}

// -------- 制作小游戏弹窗 --------
// 绳梯和陶灯制作在 UI 场景中运行，打开时锁住移动，完成后把结果写回主状态。
class WorkshopModal {
  constructor(scene) {
    this.scene = scene;
    this.opened = false;
    this.kind = null;
    this.phase = 0;
    this.onDone = null;
    this.feedback = '';
    this.body = scene.add.container(0, 0).setDepth(303);
    this.backdrop = scene.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x071411, 0.78)
      .setDepth(300).setInteractive();
    this.panel = scene.add.container(0, 0).setDepth(301);
    this.panel.add(skinImage(scene, 'workshop', 960, 542, 1540, 885));
    this.panel.add(skinFrame(scene, 'card', 1250, 308, 428, 625, { scale: 0.10 }));
    const detail = scene.add.graphics();
    detail.lineStyle(1, UI_COLORS.gold, 0.55).lineBetween(285, 253, 1625, 253);
    this.panel.add(detail);
    this.titleT = scene.add.text(310, 163, '', {
      fontFamily: UI_HEADING_FONT, fontSize: '40px', color: UI_COLORS.ink, resolution: 2,
    }).setDepth(304);
    this.stepT = scene.add.text(310, 213, '', {
      fontFamily: FONT, fontSize: '22px', color: '#2e6e63', resolution: 2,
    }).setDepth(304);
    this.tipT = scene.add.text(1615, 217, 'Esc：退出', {
      fontFamily: FONT, fontSize: '22px', color: '#7a4a21', resolution: 2,
    }).setOrigin(1, 0).setDepth(304);
    this.body.add([]);
    [this.backdrop, this.panel, this.titleT, this.stepT, this.tipT, this.body].forEach(o => o.setVisible(false));

    this.keys = scene.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,SPACE,ENTER,ESC,ONE,TWO,THREE,FOUR');
    scene.input.keyboard.addCapture('LEFT,RIGHT,UP,DOWN,SPACE,ENTER,ESC,ONE,TWO,THREE,FOUR');
    this.holdActive = false;
    this.holdProgress = 0;
    this.lastRender = 0;
    scene.input.on('pointerup', () => { this.holdActive = false; });
  }

  open(kind, onDone) {
    if (this.opened) return;
    this.opened = true;
    this.kind = kind;
    this.phase = 0;
    this.onDone = onDone || null;
    this.feedback = '';
    this.holdActive = false;
    this.holdProgress = 0;
    this.inspected = [false, false, false];
    this.spacing = 0;
    this.knotIndex = 0;
    this.ladderGame = kind === 'ladder' ? new LadderWorkshop(this, G.state.ladderAssembly) : null;
    this.lampGame = kind === 'lamp' ? new LampWorkshop(this, G.state.lampCraft) : null;
    [this.backdrop, this.panel, this.titleT, this.stepT, this.tipT, this.body].forEach(o => o.setVisible(true));
    if (G.ui) G.ui.modalOpen = true;
    this.render();
  }

  close(success) {
    if (this.ladderGame) { this.ladderGame.dispose(success); this.ladderGame = null; }
    if (this.lampGame) { this.lampGame.dispose(success); this.lampGame = null; }
    this.opened = false;
    this.holdActive = false;
    this.body.removeAll(true);
    [this.backdrop, this.panel, this.titleT, this.stepT, this.tipT, this.body].forEach(o => o.setVisible(false));
    this.tipT.setText('Esc：退出');
    if (G.ui) G.ui.modalOpen = false;
    const cb = success ? this.onDone : null;
    this.onDone = null;
    if (cb) cb();
  }

  cancel() {
    if (!this.opened) return;
    this.close(false);
    this.scene.toast.show('制作暂停', '可以回到守井人处继续');
  }

  label(text, x, y, style = {}) {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: FONT, fontSize: style.fontSize || '27px', color: style.color || UI_COLORS.ink,
      resolution: 2, align: style.align || 'left', wordWrap: style.wrap ? { width: style.wrap, useAdvancedWrap: true } : undefined,
    }).setOrigin(style.align === 'center' ? 0.5 : (style.align === 'right' ? 1 : 0), 0).setDepth(304);
    this.body.add(t); return t;
  }

  button(x, y, w, h, text, onClick, options = {}) {
    const secondary = options.fill === UI_COLORS.red || options.fill === 0x8a6a2f;
    const g = skinFrame(this.scene, 'confirm', x - w / 2 - 9, y - h / 2 - 8, w + 18, h + 16,
      { frame: secondary ? 'gold' : 'teal', cuts: [0.14, 0.14, 0.25, 0.25], scale: 0.7 }).setDepth(304);
    // Clip the paper surrounding the extracted button to its six-sided silhouette.
    const maskG = this.scene.make.graphics({ add: false });
    const left = x - w / 2 - 9, top = y - h / 2 - 8, mw = w + 18, mh = h + 16;
    const points = [[0.006, 0.5], [0.10, 0.035], [0.90, 0.035], [0.994, 0.5], [0.90, 0.945], [0.10, 0.945]];
    maskG.fillStyle(0xffffff).fillPoints(points.map(([px, py]) => ({ x: left + px * mw, y: top + py * mh })), true);
    const mask = maskG.createGeometryMask();
    g.setMask(mask);
    g.once('destroy', () => { mask.destroy(); maskG.destroy(); });
    const bg = this.scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    const tx = this.scene.add.text(x, y, text, {
      fontFamily: UI_HEADING_FONT, fontSize: options.fontSize || '25px', color: options.color || (secondary ? UI_COLORS.ink : '#f7ecd4'),
      resolution: 2, align: 'center', wordWrap: { width: w - 28, useAdvancedWrap: true },
    }).setOrigin(0.5).setDepth(305);
    fitUIText(tx, w - 64, h - 14, parseInt(options.fontSize || '25'), 18);

    bg.on('pointerover', () => { g.setAlpha(0.82); });
    bg.on('pointerout', () => { g.setAlpha(1); });
    bg.on('pointerdown', () => { if (this.opened) onClick(); });
    this.body.add([g, bg, tx]);
    return bg;
  }

  render() {
    if (!this.opened) return;
    this.body.removeAll(true); // 连带销毁上一阶段的进度条等图形，防止残留屏幕
    this.progressG = null; this.progressT = null;
    this.feedback = this.feedback || '';
    if (this.kind === 'ladder') this.ladderGame.render();
    else if (this.kind === 'lamp') this.lampGame.render();
    const board = [254, 306, 992, 584];
    this.body.add(skinFrame(this.scene, 'card', ...board, { hollow: true, scale: 0.07 }));
  }

  update(time, delta) {
    if (!this.opened) return;
    const jd = key => Phaser.Input.Keyboard.JustDown(key);
    if (jd(this.keys.ESC)) { this.cancel(); return; }
    if (this.kind === 'ladder') {
      this.ladderGame.update(delta, this.keys);
    } else if (this.kind === 'lamp') {
      this.lampGame.update(delta, this.keys);
    }
  }

}

// -------- UI 场景 --------
class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }
  create() {
    this.dialogue = new DialogueBox(this);
    this.toast = new Toast(this);
    this.workshop = new WorkshopModal(this);

    // 目标追踪：位于顶部返回按钮右侧，保留按钮与目标框之间的间距。
    const trackerLeft = 132, trackerTop = 12;
    this.trackerPanel = skinFrame(this, 'goal', trackerLeft, trackerTop, 640, 100, { cuts: [0.26, 0.12, 0.3, 0.3] }).setDepth(310);
    this.trackerT = this.add.text(trackerLeft + 108, trackerTop + 50, '', {
      fontFamily: FONT, fontSize: '25px', color: UI_COLORS.cream, resolution: 2,
    }).setOrigin(0, 0.5).setDepth(311);

    // 操作提示（右上）
    this.hintPanel = skinFrame(this, 'notice', VIEW_W - 384, 22, 360, 78, { cuts: [0.25, 0.14, 0.3, 0.3] }).setDepth(310);
    this.hintT = this.add.text(VIEW_W - 88, 62, '', {
      fontFamily: FONT, fontSize: '21px', color: UI_COLORS.ink, resolution: 2,
    }).setOrigin(1, 0.5).setDepth(311);


    this.setGoal = t => {
      this.trackerT.setText('目标：' + t);
      fitUIText(this.trackerT, 815, 44, 25, 19);
      const w = Math.max(530, Math.min(970, Math.ceil(this.trackerT.width) + 166));
      this.trackerPanel.resize(w, 100);
    };
    this.setHint = t => {
      fitUIText(this.hintT.setText(t), 580, 40, 21, 16);
      const w = Math.max(280, Math.ceil(this.hintT.width) + 132);
      this.hintPanel.setPosition(VIEW_W - w - 24, 22).resize(w, 78);
      this.hintPanel.setVisible(!!t);
    };
    G.ui = {
      dialogue: this.dialogue,
      toast: this.toast,
      setGoal: this.setGoal,
      setHint: this.setHint,
      modalOpen: false,
      openWorkshop: (kind, onDone) => this.workshop.open(kind, onDone),
    };
    setGoal(G.goalText);
    setHint(G.hint);

    this.keys = this.input.keyboard.addKeys('E');
    this.input.keyboard.addCapture('E');
  }
  update() {
    if (KarezTransitions.active) return;
    if (this.workshop && this.workshop.opened) {
      this.workshop.update(this.time.now, this.game.loop.delta);
      return;
    }
    const d = this.dialogue;
    if (d.isOpen && this.time.now - d.openAt > 200) {
      const jd = k => Phaser.Input.Keyboard.JustDown(k);
      if (jd(this.keys.E)) d.advance();
    }
  }
}
