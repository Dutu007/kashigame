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
    this.arrow = scene.add.text(bx + bw - 480, by + bh - 88, 'E / 空格  继续 ▸', {
      fontFamily: FONT, fontSize: '20px', color: '#74512d', resolution: 2,
    }).setDepth(101).setVisible(false);
    this.arrow.setVisible(false);
  }

  open(lines, onDone) {
    this.lines = lines; this.idx = 0; this.onDone = onDone || null;
    this.isOpen = true; this.openAt = this.scene.time.now;
    this.panel.setVisible(true);
    this._showLine();
  }

  _showLine() {
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
    if (this.typeEvent) this.typeEvent.remove();
    this.typeEvent = this.scene.time.addEvent({
      delay: 26, repeat: Math.ceil(full.length / 2), callback: () => {
        i = Math.min(full.length, i + 2);
        this.text.setText(full.slice(0, i));
        if (i >= full.length) { this.typing = false; this.arrow.setVisible(true); }
      },
    });
  }

  advance() {
    if (!this.isOpen) return;
    if (this.typing) { // 立即补完
      if (this.typeEvent) this.typeEvent.remove();
      this.text.setText(this.lines[this.idx].t);
      this.typing = false; this.arrow.setVisible(true);
      return;
    }
    this.idx++;
    if (this.idx < this.lines.length) this._showLine();
    else this.close();
  }

  close() {
    this.isOpen = false; this.closedAt = this.scene.time.now;
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
// 制作和修补小游戏在 UI 场景中运行，打开时锁住移动，完成后把结果写回主状态。
class WorkshopModal {
  constructor(scene) {
    this.scene = scene;
    this.opened = false;
    this.kind = null;
    this.phase = 0;
    this.onDone = null;
    this.feedback = '';
    this.patchProgress = null;
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
    this.patchObserved = [false, false, false];
    this.patchSelectedStone = null;
    this.patchSlots = [null, null, null];
    this.patchJointIndex = 0;
    this.patchFlow = 2;
    this.patchDragging = false;
    this.ladderGame = kind === 'ladder' ? new LadderWorkshop(this, G.state.ladderAssembly) : null;
    this.lampGame = kind === 'lamp' ? new LampWorkshop(this, G.state.lampCraft) : null;
    const savedPatch = kind === 'patch' && G.state && G.state.uc && G.state.uc.patch;
    if (savedPatch) {
      this.phase = Number.isInteger(savedPatch.phase) ? savedPatch.phase : 0;
      this.patchObserved = Array.isArray(savedPatch.observed) ? savedPatch.observed.slice(0, 3) : [false, false, false];
      this.patchSlots = Array.isArray(savedPatch.slots) ? savedPatch.slots.slice(0, 3) : [null, null, null];
      this.patchJointIndex = Number.isInteger(savedPatch.jointIndex) ? savedPatch.jointIndex : 0;
      this.patchFlow = Number.isInteger(savedPatch.flow) ? savedPatch.flow : 2;
    }
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
    this.destroyPatchAssist();
    [this.backdrop, this.panel, this.titleT, this.stepT, this.tipT, this.body].forEach(o => o.setVisible(false));
    this.tipT.setText('Esc：退出');
    if (G.ui) G.ui.modalOpen = false;
    if (success && this.kind === 'patch' && G.state && G.state.uc) {
      G.state.uc.patch = null;
      SaveService.save();
    }
    const cb = success ? this.onDone : null;
    this.onDone = null;
    if (cb) cb();
  }

  cancel() {
    if (!this.opened) return;
    if (this.kind === 'patch') this.savePatchProgress();
    this.close(false);
    this.scene.toast.show(this.kind === 'patch' ? '修补暂停' : '制作暂停', this.kind === 'patch' ? '可以回到缺口处继续' : '可以回到守井人处继续');
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
    this.destroyPatchAssist();
    this.progressG = null; this.progressT = null;
    this.feedback = this.feedback || '';
    if (this.kind === 'ladder') this.ladderGame.render();
    else if (this.kind === 'lamp') this.lampGame.render();
    else this.renderPatch();
    const board = this.kind === 'patch' ? [286, 316, 848, 508] : [254, 306, 992, 584];
    this.body.add(skinFrame(this.scene, 'card', ...board, { hollow: true, scale: 0.07 }));
  }

  // -------- UC 补口小游戏：独立修渠工作台 --------
  renderPatch() {
    this.savePatchProgress();
    const steps = ['看水痕', '排石', '压缝', '试流', '完成'];
    this.titleT.setText('修补旧渠缺口');
    this.stepT.setText(`现场工作台　${Math.min(this.phase + 1, 5)}/5：${steps[this.phase]}`);
    this.patchBoardImage();
    if (this.phase === 0) this.renderPatchObserve();
    else if (this.phase === 1) this.renderPatchStones();
    else if (this.phase === 2) this.renderPatchJoints();
    else if (this.phase === 3) this.renderPatchFlow();
    else this.renderPatchComplete();
    if (this.feedback) this.label(this.feedback, 1450, 930, { align: 'center', wrap: 440, fontSize: '21px', color: '#9e3d2e' });
  }

  savePatchProgress() {
    if (this.kind !== 'patch' || !G.state || !G.state.uc) return;
    G.state.uc.patch = {
      phase: this.phase,
      observed: this.patchObserved.slice(),
      slots: this.patchSlots.slice(),
      jointIndex: this.patchJointIndex,
      flow: this.patchFlow,
    };
    SaveService.save();
  }

  patchBoardImage() {
    // 只显示原 UC 地图中缺口附近的裁切区域，保留黑暗通道和油灯照亮的局部视野。
    const board = { left: 300, top: 330, width: 820, height: 480 };
    const img = this.scene.add.image(board.left + board.width / 2, board.top + board.height / 2, 'MAP_UC_GAP')
      .setDisplaySize(board.width, board.height).setDepth(304);
    this.body.add(img);
    const shade = this.scene.add.rectangle(board.left + board.width / 2, board.top + board.height / 2,
      board.width, board.height, 0x080503, 0.22).setDepth(305);
    if (!this.scene.textures.exists('patch_glow')) {
      const glowTex = this.scene.textures.createCanvas('patch_glow', 650, 430);
      const ctx = glowTex.context;
      const grad = ctx.createRadialGradient(325, 215, 35, 325, 215, 325);
      grad.addColorStop(0, 'rgba(255, 219, 142, 0.24)');
      grad.addColorStop(0.46, 'rgba(232, 170, 82, 0.12)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 650, 430);
      glowTex.refresh();
    }
    const glow = this.scene.add.image(660, 555, 'patch_glow').setDepth(306);
    const frame = this.scene.add.graphics().setDepth(307);
    frame.lineStyle(5, 0x7a4a21, 1).strokeRect(board.left, board.top, board.width, board.height);
    this.body.add([shade, glow, frame]);
    this.patchBoard = board;
  }

  patchMarker(x, y, index, label) {
    const done = this.patchObserved[index];
    const c = this.scene.add.circle(x, y, 30, done ? 0x2e6e63 : 0xc9973f, 0.94)
      .setStrokeStyle(4, 0xf7ecd4, 1).setInteractive({ useHandCursor: true }).setDepth(308);
    c.on('pointerdown', () => { this.patchObserved[index] = true; this.feedback = ''; this.render(); });
    this.body.add(c);
    this.label(`${index + 1}  ${label}`, x, y + 48, { align: 'center', fontSize: '19px', color: '#f7ecd4' })
      .setStroke('#17100b', 5).setDepth(309);
  }

  renderPatchObserve() {
    this.label('先读水痕，再动手修。点击图上的三个观察点，判断水从哪里冲过缺口。', 720, 270, { align: 'center', wrap: 860, fontSize: '24px', color: '#6b472a' });
    this.patchMarker(500, 520, 0, '上游冲刷');
    this.patchMarker(650, 555, 1, '缺口承力边');
    this.patchMarker(805, 600, 2, '下游水位');
    this.patchSidePanel('现场记录', `已观察 ${this.patchObserved.filter(Boolean).length}/3 处`, '三处都确认后，\n才能判断石头怎么落位。');
    this.button(1450, 820, 340, 70, '记录完成，开始排石', () => {
      if (this.patchObserved.every(Boolean)) { this.phase = 1; this.feedback = ''; this.render(); }
      else { this.feedback = '还有观察点没有确认'; this.render(); }
    }, { fill: 0x2e6e63 });
  }

  patchSidePanel(title, main, sub, yStart = 350) {
    this.label(title, 1450, yStart, { align: 'center', fontSize: '30px', color: '#8a6a2f' });
    this.label(main, 1450, yStart + 105, { align: 'center', wrap: 420, fontSize: '25px', color: '#5f3f28' });
    this.label(sub, 1450, yStart + 225, { align: 'center', wrap: 420, fontSize: '21px', color: '#7a5a3a' });
  }

  renderPatchStones() {
    this.label('把石头拖进缺口的三个落点。先放基底，再放迎水侧楔石，最后压上顶石。', 720, 270, { align: 'center', wrap: 860, fontSize: '24px', color: '#6b472a' });
    const slots = [
      { x: 645, y: 620, name: '基底' }, { x: 735, y: 590, name: '迎水侧' }, { x: 825, y: 555, name: '压顶' },
    ];
    slots.forEach((slot, i) => {
      const g = this.scene.add.graphics().setDepth(306);
      g.lineStyle(4, this.patchSlots[i] == null ? 0xc9973f : 0x79d1c1, 0.95)
        .strokeRoundedRect(slot.x - 70, slot.y - 30, 140, 60, 16);
      this.body.add(g);
      const zone = this.scene.add.circle(slot.x, slot.y, 64, 0x2e6e63, 0.12)
        .setInteractive({ useHandCursor: true }).setDepth(307);
      zone.on('pointerdown', () => this.placePatchStone(i));
      this.body.add(zone);
      this.label(this.patchSlots[i] == null ? slot.name : '已放置', slot.x, slot.y + 66, { align: 'center', fontSize: '19px', color: '#f7ecd4' })
        .setStroke('#17100b', 5).setDepth(309);
    });
    this.patchSlotRects = slots;
    // 场景级交互辅助：选中描边 + 拖拽落点提示（石子在容器内，辅助层须挂场景根才盖得住）
    this.destroyPatchAssist();
    this.patchStoneImgs = [];
    this.patchSelRing = this.scene.add.graphics().setDepth(310);
    this.patchSlotHi = this.scene.add.graphics().setDepth(309);
    const source = [
      { key: 'UC_STONE_BASE', name: '底托石', x: 1420, y: 620, w: 240, h: 84 },
      { key: 'UC_STONE_WEDGE', name: '侧楔石', x: 1420, y: 728, w: 170, h: 105 },
      { key: 'UC_STONE_CAP', name: '压顶石', x: 1420, y: 822, w: 240, h: 80 },
      { key: 'UC_STONE_BASE', name: '风化碎块', x: 1420, y: 895, w: 110, h: 55 },
    ];
    source.forEach((s, i) => {
      const placed = this.patchSlots.indexOf(i) >= 0;
      if (placed) { this.patchStoneImgs[i] = null; return; }
      const img = this.scene.add.image(s.x, s.y, s.key).setDisplaySize(s.w, s.h).setDepth(308)
        .setInteractive({ useHandCursor: true, draggable: true });
      if (i === 3) img.setTint(0x777777);
      this.patchStoneImgs[i] = img;
      let lastDrag = [s.x, s.y]; // dragend 对容器子对象会传 (0,0)，用 drag 的最后坐标判定落点
      let dragged = false;       // 原地点击（无移动）不算投放，只保留选中态
      img.on('pointerdown', () => { this.patchSelectedStone = i; this.feedback = ''; this.refreshStoneRing(); });
      img.on('pointerover', () => { if (!this.patchDragging) img.setScale(img.scaleX * 1.06, img.scaleY * 1.06); });
      img.on('pointerout', () => { img.setScale(img.scaleX / 1.06, img.scaleY / 1.06); });
      img.on('dragstart', () => { this.patchSelectedStone = i; this.patchDragging = true; img.setDepth(312); this.refreshStoneRing(); });
      img.on('drag', (_pointer, x, y) => {
        dragged = true; lastDrag = [x, y]; img.setPosition(x, y);
        this.showSlotHi(this.patchSlotAt(x, y));
        this.refreshStoneRing();
      });
      img.on('dragend', () => {
        this.patchDragging = false;
        this.showSlotHi(-1);
        if (!dragged) { this.refreshStoneRing(); return; }
        dragged = false;
        const slot = this.patchSlotAt(lastDrag[0], lastDrag[1]);
        if (slot >= 0) this.placePatchStone(slot);
        else { this.feedback = '把石头放到缺口的落点上'; this.render(); }
      });
      this.scene.input.setDraggable(img);
      this.body.add(img);
      this.label(s.name, 1600, s.y - 12, { align: 'center', fontSize: '20px', color: '#6b472a' }).setDepth(309);
    });
    this.refreshStoneRing();
    this.patchSidePanel('排石记录', `${this.patchSlots.filter(v => v != null).length}/3 块到位`, '石头要互相卡住，不能只靠湿泥。', 345);
  }

  destroyPatchAssist() { // 场景级辅助高亮的清理（随 render/关闭）
    if (this.patchSelRing) { this.patchSelRing.destroy(); this.patchSelRing = null; }
    if (this.patchSlotHi) { this.patchSlotHi.destroy(); this.patchSlotHi = null; }
    this.patchStoneImgs = null;
  }

  refreshStoneRing() { // 选中石子的金色描边（点选/拖拽共用）
    if (!this.patchSelRing) return;
    const g = this.patchSelRing.clear();
    const img = this.patchSelectedStone != null ? (this.patchStoneImgs || [])[this.patchSelectedStone] : null;
    if (!img) return;
    const w = img.displayWidth + 28, h = img.displayHeight + 22;
    g.lineStyle(3, 0xffd27a, 0.95).strokeRoundedRect(img.x - w / 2, img.y - h / 2, w, h, 12);
  }

  showSlotHi(slotIdx) { // 拖拽中的落点实时提示
    if (!this.patchSlotHi) return;
    const g = this.patchSlotHi.clear();
    if (slotIdx == null || slotIdx < 0 || !this.patchSlotRects) return;
    const s = this.patchSlotRects[slotIdx];
    g.lineStyle(5, 0x79d1c1, 0.9).strokeRoundedRect(s.x - 74, s.y - 34, 148, 68, 16);
  }

  patchSlotAt(x, y) {
    const slots = [{ x: 645, y: 620 }, { x: 735, y: 590 }, { x: 825, y: 555 }];
    // 落点间距 ~90px，必须取最近的一个，否则相邻落点会被前面的抢走
    let best = -1, bestD = 95;
    slots.forEach((s, i) => {
      const d = Math.hypot(x - s.x, y - s.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  placePatchStone(slot) {
    if (this.patchSelectedStone == null) { this.feedback = '先拖一块石头，再放进缺口'; this.render(); return; }
    if (this.patchSlots[slot] != null) { this.feedback = '这个落点已经有石头了'; this.render(); return; }
    if (this.patchSelectedStone !== slot) {
      this.feedback = '这块石头的形状不适合这个落点';
      this.patchSelectedStone = null; this.render(); return;
    }
    this.patchSlots[slot] = this.patchSelectedStone;
    this.patchSelectedStone = null;
    this.feedback = '';
    if (this.patchSlots.every(v => v != null)) this.phase = 2;
    this.render();
  }

  renderPatchJoints() {
    this.label('石头落稳了。现在沿水流方向，把湿泥压进五处接缝。', 720, 270, { align: 'center', wrap: 860, fontSize: '24px', color: '#6b472a' });
    const joints = [{ x: 620, y: 625 }, { x: 675, y: 600 }, { x: 730, y: 580 }, { x: 785, y: 560 }, { x: 840, y: 540 }];
    const g = this.scene.add.graphics().setDepth(306);
    joints.forEach((p, i) => {
      g.fillStyle(i < this.patchJointIndex ? 0x79d1c1 : (i === this.patchJointIndex ? 0x9e3d2e : 0xc9973f), 0.95).fillCircle(p.x, p.y, 22);
      g.lineStyle(3, 0xf7ecd4, 1).strokeCircle(p.x, p.y, 22);
    });
    this.body.add(g);
    joints.forEach((p, i) => {
      const c = this.scene.add.circle(p.x, p.y, 38, 0x2e6e63, 0.08).setInteractive({ useHandCursor: true }).setDepth(307);
      c.on('pointerdown', () => this.pressPatchJoint(i));
      this.body.add(c);
    });
    this.patchSidePanel('压缝进度', `${this.patchJointIndex}/5 处`, '从上游往下游，\n顺序错了会把湿泥带出来。');
  }

  pressPatchJoint(i) {
    if (i !== this.patchJointIndex) this.feedback = '顺着水流走，先处理当前亮起的接缝';
    else { this.patchJointIndex++; this.feedback = ''; if (this.patchJointIndex >= 5) this.phase = 3; }
    this.render();
  }

  renderPatchFlow() {
    this.label('最后开闸试流。把水量调到能通过、又不会冲开新接缝的范围。', 720, 270, { align: 'center', wrap: 860, fontSize: '24px', color: '#6b472a' });
    const flow = this.scene.add.graphics().setDepth(306);
    flow.fillStyle(0x79d1c1, 0.24 + this.patchFlow * 0.1).fillRoundedRect(430, 500 - this.patchFlow * 5, 550, 130 + this.patchFlow * 10, 50);
    for (let i = 0; i < this.patchFlow + 1; i++) flow.fillTriangle(520 + i * 100, 555, 548 + i * 100, 568, 520 + i * 100, 581);
    this.body.add(flow);
    this.label('试流阀门', 1450, 330, { align: 'center', fontSize: '30px', color: '#8a6a2f' });
    this.label(`水量 ${this.patchFlow}/5`, 1450, 390, { align: 'center', wrap: 420, fontSize: '25px', color: '#5f3f28' });
    this.label('目标是稳定的小股水流。\n点击右侧刻度，或用方向键调整。', 1450, 450, { align: 'center', wrap: 420, fontSize: '21px', color: '#7a5a3a' });
    for (let i = 1; i <= 5; i++) {
      const y = 760 - i * 50;
      const c = this.scene.add.circle(1430, y, 22, i === this.patchFlow ? 0x9e3d2e : 0x6d8d7e, 1)
        .setStrokeStyle(3, 0xc9973f, 1).setInteractive({ useHandCursor: true }).setDepth(308);
      c.on('pointerdown', () => { this.patchFlow = i; this.feedback = ''; this.render(); });
      this.body.add(c);
      this.label(String(i), 1490, y, { fontSize: '22px', color: '#6b472a' });
    }
    this.button(1450, 860, 340, 70, '开闸试流', () => {
      if (this.patchFlow === 3) { this.phase = 4; this.feedback = ''; }
      else if (this.patchFlow < 3) this.feedback = '水量太小，还看不出缺口是否真正接通';
      else this.feedback = '水量太急，先收一点，别把新压的泥冲开';
      this.render();
    }, { fill: 0x2e6e63 });
  }

  renderPatchComplete() {
    const g = this.scene.add.graphics().setDepth(307);
    g.fillStyle(0x79d1c1, 0.55).fillRoundedRect(430, 500, 550, 130, 50);
    for (let i = 0; i < 5; i++) g.fillTriangle(520 + i * 100, 555, 548 + i * 100, 568, 520 + i * 100, 581);
    this.body.add(g);
    this.patchSidePanel('修补完成', '水流已接通', '缺口的石头、湿泥和水量都通过了检查。');
    this.label('这次修的是水路，不只是把洞填上。', 720, 740, { align: 'center', wrap: 760, fontSize: '27px', color: '#6b472a' });
    this.button(1450, 820, 340, 70, '确认修补并继续', () => this.close(true), { fill: 0x8a6a2f });
  }

  update(time, delta) {
    if (!this.opened) return;
    const jd = key => Phaser.Input.Keyboard.JustDown(key);
    if (jd(this.keys.ESC)) { this.cancel(); return; }
    if (this.kind === 'ladder') {
      this.ladderGame.update(delta, this.keys);
    } else if (this.kind === 'lamp') {
      this.lampGame.update(delta, this.keys);
    } else if (this.kind === 'patch') {
      if (this.phase === 2) {
        if (jd(this.keys.LEFT) || jd(this.keys.DOWN)) this.pressPatchJoint(this.patchJointIndex);
        if (jd(this.keys.RIGHT) || jd(this.keys.UP)) this.pressPatchJoint(this.patchJointIndex);
      } else if (this.phase === 3) {
        if (jd(this.keys.LEFT) || jd(this.keys.DOWN)) { this.patchFlow = Math.max(1, this.patchFlow - 1); this.render(); }
        if (jd(this.keys.RIGHT) || jd(this.keys.UP)) { this.patchFlow = Math.min(5, this.patchFlow + 1); this.render(); }
        if (jd(this.keys.ENTER)) {
          if (this.patchFlow === 3) { this.phase = 4; this.feedback = ''; }
          else this.feedback = this.patchFlow < 3 ? '水量太小，还看不出缺口是否真正接通' : '水量太急，先收一点，别把新压的泥冲开';
          this.render();
        }
      }
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

    // 目标追踪（左上羊皮纸签：宽度随文本自适应，避免溢出）
    this.trackerPanel = skinFrame(this, 'goal', 24, 12, 640, 100, { cuts: [0.26, 0.12, 0.3, 0.3] }).setDepth(310);
    this.trackerT = this.add.text(132, 62, '', {
      fontFamily: FONT, fontSize: '25px', color: UI_COLORS.cream, resolution: 2,
    }).setOrigin(0, 0.5).setDepth(311);

    // 操作提示（右上）
    this.hintPanel = skinFrame(this, 'notice', VIEW_W - 770, 22, 746, 78, { cuts: [0.25, 0.14, 0.3, 0.3] }).setDepth(310);
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
      this.hintPanel.setVisible(!!t);
    };
    G.ui = {
      dialogue: this.dialogue,
      toast: this.toast,
      setGoal: this.setGoal,
      setHint: this.setHint,
      modalOpen: false,
      openWorkshop: (kind, onDone) => this.workshop.open(kind, onDone),
      openPatchRepair: onDone => this.workshop.open('patch', onDone),
    };
    setGoal(G.goalText);
    setHint(G.hint);

    this.keys = this.input.keyboard.addKeys('SPACE,E');
    this.input.keyboard.addCapture('SPACE,E');
  }
  update() {
    if (this.workshop && this.workshop.opened) {
      this.workshop.update(this.time.now, this.game.loop.delta);
      return;
    }
    const d = this.dialogue;
    if (d.isOpen && this.time.now - d.openAt > 200) {
      const jd = k => Phaser.Input.Keyboard.JustDown(k);
      if (jd(this.keys.SPACE) || jd(this.keys.E)) d.advance();
    }
  }
}
