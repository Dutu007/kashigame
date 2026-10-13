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

    const bw = 1320, bh = 548;
    const bx = (VIEW_W - bw) / 2, by = VIEW_H - bh - 36;
    this.boxRect = { bx, by, bw, bh };

    // 新版对话框是一张完整构图底图，灯笼、花纹、城市和正文留白保持整体关系。
    this.panel = scene.add.image(VIEW_W / 2, by + bh / 2, 'UI_DIALOG_FRAME')
      .setDisplaySize(bw, bh).setDepth(100).setVisible(false);

    // 名牌（参考图样式1：左上红砖底名牌）
    this.plateG = scene.add.graphics().setDepth(101).setVisible(false);
    this.nameText = scene.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '30px', color: UI_COLORS.cream, resolution: 2,
    }).setOrigin(0.5).setDepth(102).setVisible(false);

    this.text = scene.add.text(bx + 320, by + 194, '', {
      fontFamily: FONT, fontSize: '31px', color: UI_COLORS.ink,
      wordWrap: { width: 820, useAdvancedWrap: true }, lineSpacing: 14, resolution: 2,
    }).setDepth(101).setVisible(false);

    // 继续箭头（参考图右下金色小箭头）
    this.arrow = scene.add.text(bx + bw - 52, by + bh - 48, '▼', {
      fontFamily: FONT, fontSize: '24px', color: '#c9973f', resolution: 2,
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
      this.nameText.setPosition(bx + 390, by + 100).setText(sp.name);
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
        if (i >= full.length) { this.typing = false; }
      },
    });
  }

  advance() {
    if (!this.isOpen) return;
    if (this.typing) { // 立即补完
      if (this.typeEvent) this.typeEvent.remove();
      this.text.setText(this.lines[this.idx].t);
      this.typing = false;
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
    const g = scene.add.graphics();
    ornateFrame(g, 0, 0, 660, 82, { fill: 0x14332e, accent: UI_COLORS.red, radius: 14, outerWidth: 2 });
    g.fillStyle(UI_COLORS.gold, 1)
      .fillTriangle(54, 20, 68, 41, 54, 62).fillTriangle(40, 41, 54, 20, 54, 62);
    this.titleT = scene.add.text(96, 14, '', {
      fontFamily: FONT, fontSize: '27px', color: '#e8c979', resolution: 2,
    });
    this.subT = scene.add.text(96, 49, '', {
      fontFamily: FONT, fontSize: '20px', color: '#d8cdb2', resolution: 2,
    });
    this.root.add([g, this.titleT, this.subT]);
    this.root.setAlpha(0);
  }
  show(title, sub) { this.queue.push({ title, sub: sub || '' }); this._next(); }
  _next() {
    if (this.busy || !this.queue.length) return;
    this.busy = true;
    const { title, sub } = this.queue.shift();
    this.titleT.setText(title); this.subT.setText(sub);
    this.root.setPosition((VIEW_W - 660) / 2, -90);
    this.scene.tweens.add({
      targets: this.root, alpha: 1, y: 96, duration: 260, ease: 'Cubic.out',
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
    this.backdrop = scene.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x071411, 0.84)
      .setDepth(300).setInteractive();
    this.panel = scene.add.graphics().setDepth(301);
    ornateFrame(this.panel, 210, 112, 1500, 856, { fill: 0xf7ecd4, accent: UI_COLORS.teal, radius: 20, outerWidth: 5 });
    titleRibbon(this.panel, 250, 130, 460, 64, UI_COLORS.teal);
    this.titleT = scene.add.text(480, 162, '', {
      fontFamily: FONT, fontSize: '32px', color: UI_COLORS.cream, resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(304);
    this.stepT = scene.add.text(270, 220, '', {
      fontFamily: FONT, fontSize: '22px', color: '#2e6e63', resolution: 2,
    }).setDepth(304);
    this.tipT = scene.add.text(1660, 220, 'Esc：退出', {
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
      resolution: 2, align: style.align || 'left', wordWrap: style.wrap ? { width: style.wrap } : undefined,
    }).setOrigin(style.align === 'center' ? 0.5 : (style.align === 'right' ? 1 : 0), 0).setDepth(304);
    this.body.add(t); return t;
  }

  button(x, y, w, h, text, onClick, options = {}) {
    const g = this.scene.add.graphics().setDepth(304);
    titleRibbon(g, x - w / 2, y - h / 2, w, h, options.fill || UI_COLORS.teal);
    const bg = this.scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    const tx = this.scene.add.text(x, y, text, {
      fontFamily: FONT, fontSize: options.fontSize || '25px', color: options.color || '#f7ecd4',
      resolution: 2, align: 'center', wordWrap: { width: w - 28, useAdvancedWrap: true },
    }).setOrigin(0.5).setDepth(305);
    bg.on('pointerdown', () => { if (this.opened) onClick(); });
    this.body.add([g, bg, tx]);
    return bg;
  }

  card(x, y, w, h, title, sub, done, onClick) {
    const bg = this.scene.add.graphics().setDepth(304);
    ornateFrame(bg, x - w / 2, y - h / 2, w, h, {
      fill: done ? 0xd8e2c7 : 0xe8d9b0,
      accent: done ? UI_COLORS.teal : UI_COLORS.red,
      radius: 10, outerWidth: 3,
    });
    bg.setInteractive(new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    const t = this.scene.add.text(x, y - 20, title, {
      fontFamily: FONT, fontSize: '28px', color: UI_COLORS.ink, resolution: 2,
    }).setOrigin(0.5).setDepth(305);
    const s = this.scene.add.text(x, y + 26, done ? '已检查' : sub, {
      fontFamily: FONT, fontSize: '21px', color: done ? '#2e6e63' : '#7a4a21', resolution: 2,
    }).setOrigin(0.5).setDepth(305);
    bg.on('pointerdown', () => { if (this.opened) onClick(); });
    this.body.add([bg, t, s]);
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
      this.label(s.name, 1600, s.y + 5, { align: 'center', fontSize: '20px', color: '#6b472a' }).setDepth(309);
    });
    this.refreshStoneRing();
    this.patchSidePanel('排石记录', `${this.patchSlots.filter(v => v != null).length}/3 块到位`, '石头要互相卡住，不能只靠湿泥。', 320);
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

// -------- 调试面板（F2 开关）：按里程碑跳转剧情，免去重复走流程 --------
// 每档都是"到此为止"的完整状态快照：之后的里程碑自动复位，保证目标追踪与交互门控一致
const DEBUG_STAGES = [
  { name: '新档开场',                 spawn: { scene: 'Surface', x: 380 } },
  { name: '已接任务（清第一口井）',     spawn: { scene: 'Surface', x: 709 } },
  { name: '已检查第一口井（寻材料）',   spawn: { scene: 'Surface', x: 260 } },
  { name: '材料齐全（找守井人制作）',   spawn: { scene: 'Surface', x: 430 } },
  { name: '制作完成（可布梯下井）',     spawn: { scene: 'Surface', x: 709 } },
  { name: '上游检查完成（清第二口井）', spawn: { scene: 'Surface', x: 1660 } },
  { name: '中段已通（清第三口井）',     spawn: { scene: 'Surface', x: 2731 } },
  { name: '下游修补完成（可复查）',     spawn: { scene: 'Tunnel', seg: 'UC', x: 2650 } },
  { name: '复查完成（回地表汇报）',     spawn: { scene: 'Surface', x: 430 } },
  { name: '章节完成（自由探索）',       spawn: { scene: 'Surface', x: 700 } },
  { name: '做完梯子，准备做土陶小油灯',   spawn: { scene: 'Surface', x: 430 }, lampTest: true },
  { name: '泥已揉好，测试转盘成型', spawn: { scene: 'Surface', x: 430 }, lampTest: true, formingTest: true },
];

function buildDebugState(i) {
  if (DEBUG_STAGES[i].lampTest) {
    const st = buildDebugState(3);
    st.ladderWorkshopDone = true; st.laddersLeft = 3;
    if (DEBUG_STAGES[i].formingTest) st.lampCraft = {
      v: 5, phase: 1, uniformity: 0.9, plasticity: 0.84, moisture: 0.7, air: 0.1,
      presses: 4, folds: 4, formingActive: true, forming: { progress: 0, warp: 0 },
    };
    return st;
  }
  const st = {
    introDone: false, ladderProblemFound: false,
    materials: { A: false, B: false, C: false },
    ladderWorkshopDone: false, ladderAssembly: null, lampWorkshopDone: false, lampCraft: null,
    craftDone: false, laddersLeft: 0,
    lampOwned: false, lampOn: false,
    wells: [
      { weeds: 3, cleared: false, ladder: false },
      { weeds: 2, cleared: false, ladder: false },
      { weeds: 2, cleared: false, ladder: false },
    ],
    ub: { s0: 0, r1: false, r2: false, r3: false, s1: 0, done: false },
    uc: { p: [null, null, null], rot: [0, 0, 0], done: false, patch: null },
    patchIntroSeen: false, verified: false,
    undergroundVisited: false, uaInspected: false,
    recordSaved: false, chapterComplete: false,
    lastWell: null, sceneId: 'Surface',
  };
  if (i >= 1) st.introDone = true;
  if (i >= 2) { st.wells[0].weeds = 0; st.wells[0].cleared = true; st.ladderProblemFound = true; }
  if (i >= 3) st.materials = { A: true, B: true, C: true };
  if (i >= 4) { st.ladderWorkshopDone = true; st.lampWorkshopDone = true; st.craftDone = true; st.laddersLeft = 3; st.lampOwned = true; }
  if (i >= 5) { st.wells[0].ladder = true; st.laddersLeft = 2; st.undergroundVisited = true; st.uaInspected = true; st.lastWell = 0; st.lampOn = true; }
  if (i >= 6) { st.wells[1].weeds = 0; st.wells[1].cleared = true; st.wells[1].ladder = true; st.laddersLeft = 1; Object.assign(st.ub, { s0: 2, r1: true, r2: true, r3: true, s1: 2, done: true }); st.lastWell = 1; }
  if (i >= 7) { st.wells[2].weeds = 0; st.wells[2].cleared = true; st.wells[2].ladder = true; st.laddersLeft = 0; st.uc.done = true; st.uc.p = [0, 90, 0]; st.uc.rot = [0, 90, 0]; st.patchIntroSeen = true; st.lastWell = 2; }
  if (i >= 8) st.verified = true;
  if (i >= 9) { st.recordSaved = true; st.chapterComplete = true; }
  st.sceneId = DEBUG_STAGES[i].spawn.scene;
  if (st.sceneId === 'Tunnel') st.lastSeg = DEBUG_STAGES[i].spawn.seg;
  return st;
}

class DebugPanel {
  constructor(scene) {
    this.scene = scene;
    this.open = false;
    const w = 440, rowH = 50, n = DEBUG_STAGES.length;
    const h = 100 + 56 + n * (rowH + 10);
    // 右侧 330px 留给开发用的调整工具面板（?tools=1 时出现），避免两者重叠
    const toolGutter = location.search.indexOf('tools=1') >= 0 ? 336 : 0;
    const px = Math.max(24, VIEW_W - toolGutter - w - 24), py = 90;
    this.root = scene.add.container(0, 0).setDepth(200).setVisible(false);
    const g = scene.add.graphics();
    ornateFrame(g, px, py, w, h, { fill: 0x14332e, accent: UI_COLORS.red, radius: 14, outerWidth: 2 });
    this.root.add(g);
    this.root.add(scene.add.text(px + 24, py + 16, '调试 · 剧情跳转', {
      fontFamily: FONT, fontSize: '26px', color: '#e8c979', resolution: 2,
    }));
    this.root.add(scene.add.text(px + w - 24, py + 22, 'F2 开/关', {
      fontFamily: FONT, fontSize: '18px', color: '#d8cdb2', resolution: 2,
    }).setOrigin(1, 0));
    // 开发入口：一键加载土陶主体位置调整工具（tmp/place-tuner.js，独立覆盖层，不改游戏状态）。
    // 点过之后记住开关，普通刷新（不带 ?tools=1）也会自动加载；再点一次关闭。
    const toolOn = () => { try { return localStorage.getItem('twc_tools') === '1'; } catch (e) { return false; } };
    const toolBtn = scene.add.graphics();
    titleRibbon(toolBtn, px + 24, py + 46, w - 48, 34, UI_COLORS.red);
    toolBtn.setInteractive(new Phaser.Geom.Rectangle(px + 24, py + 46, w - 48, 34), Phaser.Geom.Rectangle.Contains);
    toolBtn.on('pointerover', () => toolBtn.setAlpha(0.84));
    toolBtn.on('pointerout', () => toolBtn.setAlpha(1));
    toolBtn.on('pointerdown', () => {
      if (window.__placeTool) {                      // 已开着 → 关掉并忘记开关
        try { window.__placeTool.destroy(); localStorage.removeItem('twc_tools'); } catch (e) {}
        if (G.ui) G.ui.toast.show('已关闭调整工具', '刷新页面后也不会再自动出现');
        return;
      }
      try { localStorage.setItem('twc_tools', '1'); } catch (e) {}
      const s = document.createElement('script');
      s.src = 'tmp/place-tuner.js?v=' + Date.now();
      s.onerror = () => { if (G.ui) G.ui.toast.show('加载失败', '请确认 tmp/place-tuner.js 存在，且用开发服务器打开'); };
      document.body.appendChild(s);
    });
    this.root.add(toolBtn);
    this.root.add(scene.add.text(px + w / 2, py + 63,
      toolOn() ? '关闭「主体位置调整」工具' : '加载「主体位置调整」工具', {
        fontFamily: FONT, fontSize: '20px', color: '#f7ecd4', resolution: 2,
    }).setOrigin(0.5, 0.5));
    DEBUG_STAGES.forEach((st, i) => {
      const by = py + 68 + 56 + i * (rowH + 10);
      const btn = scene.add.graphics();
      titleRibbon(btn, px + 24, by, w - 48, rowH, UI_COLORS.teal);
      btn.setInteractive(new Phaser.Geom.Rectangle(px + 24, by, w - 48, rowH), Phaser.Geom.Rectangle.Contains);
      btn.on('pointerdown', () => this.jumpTo(i));
      btn.on('pointerover', () => btn.setAlpha(0.84));
      btn.on('pointerout', () => btn.setAlpha(1));
      this.root.add(btn);
      this.root.add(scene.add.text(px + 40, by + rowH / 2, i + '　' + st.name, {
        fontFamily: FONT, fontSize: '22px', color: '#f7ecd4', resolution: 2,
      }).setOrigin(0, 0.5));
    });
    this.toggleKey = scene.input.keyboard.addKey('F2');
    scene.input.keyboard.addCapture('F2');
  }
  toggle() { this.open = !this.open; this.root.setVisible(this.open); }
  jumpTo(i) {
    const stage = DEBUG_STAGES[i];
    const d = this.scene.dialogue;                       // 带着对话/弹窗跳转会残留，先无副作用关闭
    if (d.isOpen) { d.onDone = null; d.close(); }
    const ws = this.scene.workshop;
    if (ws.opened) { ws.onDone = null; ws.close(false); }
    G.state = buildDebugState(i);
    G.restored = false;
    SaveService.save();
    const game = window.__game;
    const cur = game.scene.getScenes(true).find(s => s.scene.key === 'Surface' || s.scene.key === 'Tunnel');
    const target = stage.spawn.scene;
    const data = target === 'Tunnel' ? { seg: stage.spawn.seg } : {};
    if (cur) cur.scene.start(target, data); else game.scene.start(target, data);
    this.scene.time.delayedCall(650, () => {
      const sc = game.scene.getScene(target);
      if (sc && sc.player && stage.spawn.x != null) sc.player.x = stage.spawn.x;
      if (G.ui) G.ui.toast.show('调试跳转', stage.name);
    });
    this.open = false; this.root.setVisible(false);
  }
}

// -------- UI 场景 --------
class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }
  create() {
    this.dialogue = new DialogueBox(this);
    this.toast = new Toast(this);
    this.workshop = new WorkshopModal(this);
    this.debugPanel = new DebugPanel(this);

    // 目标追踪（左上羊皮纸签：宽度随文本自适应，避免溢出）
    this.trackerPanel = this.add.graphics().setDepth(90);
    this.trackerT = this.add.text(78, 46, '', {
      fontFamily: FONT, fontSize: '25px', color: UI_COLORS.ink, resolution: 2,
    }).setOrigin(0, 0.5).setDepth(91);

    // 操作提示（右上）
    this.hintT = this.add.text(VIEW_W - 26, 46, '', {
      fontFamily: FONT, fontSize: '21px', color: '#d8cdb2', resolution: 2,
    }).setOrigin(1, 0.5).setDepth(91);
    this.hintT.setStroke('#1a120b', 4);

    this.setGoal = t => {
      this.trackerT.setText('目标：' + t);
      const w = Math.min(VIEW_W - 40, Math.ceil(this.trackerT.width) + 118);
      const tg = this.trackerPanel.clear();
      ornateFrame(tg, 20, 18, w, 58, { fill: UI_COLORS.paper, accent: UI_COLORS.teal, radius: 12, outerWidth: 2 });
    };
    this.setHint = t => this.hintT.setText(t);
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
    if (Phaser.Input.Keyboard.JustDown(this.debugPanel.toggleKey)) this.debugPanel.toggle();
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
