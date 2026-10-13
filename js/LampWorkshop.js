// 土陶材料准备：把“和泥”做成由泥性状态驱动的小型体验。
// 操作不依赖固定次数，落点、按压时长、拖动方向和距离都会改变泥团状态。
class LampCraft {
  constructor(saved) {
    this.phase = 0; // 0：和泥，1：材料准备完成
    this.presses = 0;
    this.folds = 0;
    this.uniformity = 0.12;
    this.plasticity = 0.08;
    this.moisture = 0.38;
    this.air = 0.86;
    this.skew = 0;
    this.lastAction = 'start';
    this.foldSide = 1;
    this.hasPress = false;
    this.hasFold = false;

    if (saved && saved.v >= 5) {
      this.uniformity = LampCraft.clamp(Number(saved.uniformity) || 0, 0, 1);
      this.plasticity = LampCraft.clamp(Number(saved.plasticity) || 0, 0, 1);
      this.moisture = LampCraft.clamp(Number(saved.moisture) || 0, 0, 1);
      this.air = LampCraft.clamp(Number(saved.air) || 0, 0, 1);
      this.presses = Math.max(0, Math.floor(Number(saved.presses) || 0));
      this.folds = Math.max(0, Math.floor(Number(saved.folds) || 0));
      this.skew = LampCraft.clamp(Number(saved.skew) || 0, -1, 1);
      this.lastAction = saved.lastAction || 'start';
      this.foldSide = Number(saved.foldSide) < 0 ? -1 : 1;
      this.hasPress = !!saved.hasPress || this.presses > 0;
      this.hasFold = !!saved.hasFold || this.folds > 0;
    } else if (saved && saved.v === 4) {
      this.uniformity = LampCraft.clamp(Number(saved.uniformity) || 0, 0, 1);
      this.plasticity = LampCraft.clamp(Number(saved.plasticity) || 0, 0, 1);
      this.moisture = LampCraft.clamp(Number(saved.moisture) || 0, 0, 1);
      this.air = LampCraft.clamp(Number(saved.air) || 0, 0, 1);
      this.presses = Math.max(0, Math.floor(Number(saved.presses) || 0));
      this.folds = Math.max(0, Math.floor(Number(saved.folds) || 0));
      this.hasPress = this.presses > 0; this.hasFold = this.folds > 0;
      this.lastAction = this.hasFold ? 'fold' : this.hasPress ? 'press' : 'start';
    } else if (saved && (saved.v === 1 || saved.v === 2)) {
      // 兼容上一版只有“揉泥次数”的存档：未完成的进度从按压开始，
      // 已完成的旧存档直接进入交付状态，不再恢复已经删除的工序。
      const oldKnead = LampCraft.clamp(Math.floor(Number(saved.knead) || 0), 0, 3);
      this.presses = oldKnead;
      this.folds = oldKnead >= 3 ? 2 : 0;
      this.uniformity = oldKnead >= 3 ? 0.86 : 0.12 + oldKnead * 0.16;
      this.plasticity = oldKnead >= 3 ? 0.82 : 0.08 + oldKnead * 0.12;
      this.moisture = oldKnead >= 3 ? 0.7 : 0.38 + oldKnead * 0.08;
      this.air = oldKnead >= 3 ? 0.12 : Math.max(0.3, 0.86 - oldKnead * 0.16);
    } else if (saved && saved.v === 3) {
      const presses = Math.max(0, Math.floor(Number(saved.presses) || 0));
      const folds = Math.max(0, Math.floor(Number(saved.folds) || 0));
      this.presses = presses; this.folds = folds;
      const oldFinished = Number(saved.phase) === 1;
      this.uniformity = oldFinished ? 0.9 : LampCraft.clamp(0.12 + presses * 0.12 + folds * 0.14, 0, 1);
      this.plasticity = oldFinished ? 0.84 : LampCraft.clamp(0.08 + presses * 0.05 + folds * 0.2, 0, 1);
      this.moisture = oldFinished ? 0.7 : LampCraft.clamp(0.38 + folds * 0.08, 0, 1);
      this.air = oldFinished ? 0.1 : LampCraft.clamp(0.86 - presses * 0.12 - folds * 0.18, 0, 1);
    }
    this.updatePhase();
  }

  static clamp(value, lo, hi) { return Math.max(lo, Math.min(hi, value)); }
  get knead() { return this.presses + this.folds; }
  updatePhase() {
    if (this.uniformity >= 0.78 && this.plasticity >= 0.68
      && this.moisture >= 0.52 && this.moisture <= 0.88 && this.air <= 0.24) this.phase = 1;
  }
  ready() { return this.phase === 1; }
  quality() {
    return { uniformity: this.uniformity, plasticity: this.plasticity, moisture: this.moisture, air: this.air };
  }

  toJSON() {
    return { v: 5, phase: this.phase, presses: this.presses, folds: this.folds, knead: this.knead,
      uniformity: this.uniformity, plasticity: this.plasticity, moisture: this.moisture, air: this.air,
      skew: this.skew, lastAction: this.lastAction, foldSide: this.foldSide,
      hasPress: this.hasPress, hasFold: this.hasFold };
  }

  pressAt(point, holdMs = 180) {
    if (this.phase !== 0 || !point) return false;
    if (Math.abs(point.x - 750) > 270 || Math.abs(point.y - 610) > 175) return false;
    const nx = LampCraft.clamp((point.x - 750) / 270, -1, 1);
    const ny = LampCraft.clamp((point.y - 610) / 175, -1, 1);
    const center = 1 - Math.min(1, Math.hypot(nx, ny) / 1.15);
    const pressure = LampCraft.clamp(0.72 + Math.min(0.42, Math.max(0, holdMs - 180) / 900), 0.72, 1.14);
    const useful = pressure * (0.62 + center * 0.38);
    this.presses++;
    this.hasPress = true; this.lastAction = 'press';
    this.uniformity = LampCraft.clamp(this.uniformity + 0.105 * useful, 0, 1);
    this.plasticity = LampCraft.clamp(this.plasticity + 0.055 * useful, 0, 1);
    const pressMoisture = this.moisture > 0.82 ? -0.025 * useful : 0.018 * useful;
    this.moisture = LampCraft.clamp(this.moisture + pressMoisture, 0, 1);
    this.air = LampCraft.clamp(this.air - 0.105 * useful, 0, 1);
    this.skew = LampCraft.clamp(this.skew * 0.72 + nx * (1 - center) * 0.08, -1, 1);
    this.updatePhase();
    return { center, pressure, useful };
  }

  foldStroke(points) {
    if (this.phase !== 0 || !Array.isArray(points) || points.length < 2) return false;
    const start = points[0], end = points[points.length - 1];
    const dx = end.x - start.x, dy = end.y - start.y;
    const horizontal = Math.abs(dx) >= Math.abs(dy) * 1.15;
    const distance = Math.hypot(dx, dy);
    if (!horizontal || distance < 48) return false;
    const crossing = (start.x - 750) * (end.x - 750) <= 0;
    const effort = LampCraft.clamp(distance / 360, 0.25, 1);
    const clean = crossing ? 1 : 0.58;
    this.folds++;
    this.hasFold = true; this.lastAction = 'fold';
    this.uniformity = LampCraft.clamp(this.uniformity + 0.105 * effort * clean, 0, 1);
    this.plasticity = LampCraft.clamp(this.plasticity + 0.16 * effort * clean, 0, 1);
    // 翻折会让泥料重新收拢；泥团已经偏湿时，翻折会把多余水分摊开，避免进入无法恢复的死状态。
    const moistureChange = this.moisture > 0.72 ? -0.11 * effort : 0.045 * effort;
    this.moisture = LampCraft.clamp(this.moisture + moistureChange, 0, 1);
    this.air = LampCraft.clamp(this.air - 0.14 * effort * clean, 0, 1);
    const side = dx >= 0 ? 1 : -1;
    this.foldSide = side;
    this.skew = LampCraft.clamp(this.skew * 0.45 + (crossing ? 0 : side * 0.22), -1, 1);
    this.updatePhase();
    return { effort, clean, crossing, side };
  }
}

class LampAssembly {
  // 手动校准后的拼合位置；显示、吸附和已接合存档统一使用此布局。
  static settings = typeof LAMP_ASSEMBLY_LAYOUT !== 'undefined' ? LAMP_ASSEMBLY_LAYOUT : require('./LampAssemblyLayout.js');
  static layout = LampAssembly.settings.parts;
  constructor(saved = {}) {
    this.parts = {
      spout: { x: Number.isFinite(saved.spout?.x) ? saved.spout.x : 430, y: Number.isFinite(saved.spout?.y) ? saved.spout.y : 540, rotation: 0.14, attached: !!saved.spout?.attached },
      handle: { x: Number.isFinite(saved.handle?.x) ? saved.handle.x : 1080, y: Number.isFinite(saved.handle?.y) ? saved.handle.y : 520, rotation: -0.08, attached: !!saved.handle?.attached },
    };
    for (const key of ['spout', 'handle']) {
      const p = this.parts[key], target = LampAssembly.layout[key];
      p.rotation = target.rotation;
      if (p.attached) { p.x = target.x; p.y = target.y; }
    }
    this.active = null;
  }
  toJSON() { return { spout: { ...this.parts.spout }, handle: { ...this.parts.handle } }; }
  ready() { return this.parts.spout.attached && this.parts.handle.attached; }
  down(pointer) {
    if (!pointer) return false;
    for (const key of ['spout', 'handle']) {
      const p = this.parts[key];
      if (p.attached) continue;
      if (Math.hypot(pointer.x - p.x, pointer.y - p.y) <= (key === 'spout' ? 100 : 110)) {
        this.active = { key, id: pointer.id, dx: p.x - pointer.x, dy: p.y - pointer.y };
        return true;
      }
    }
    return false;
  }
  move(pointer) {
    if (!this.active || pointer.id !== this.active.id) return;
    const p = this.parts[this.active.key];
    p.x = pointer.x + this.active.dx; p.y = pointer.y + this.active.dy;
  }
  up(pointer) {
    if (!this.active || (pointer && pointer.id !== this.active.id)) return false;
    const key = this.active.key, p = this.parts[key];
    const target = LampAssembly.layout[key];
    const snapped = Math.hypot(p.x - target.x, p.y - target.y) <= 110;
    if (snapped) Object.assign(p, { x: target.x, y: target.y, rotation: target.rotation, attached: true });
    this.active = null;
    return snapped;
  }
}

let lampCanvasId = 0;
class LampWorkshop {
  constructor(modal, saved) {
    this.modal = modal;
    this.scene = modal.scene;
    this.craft = new LampCraft(saved);
    this.formingActive = this.craft.ready() && !!saved?.formingActive;
    this.spliceActive = !!saved?.spliceActive;
    this.forming = new LampFormingView(this, saved?.forming);
    this.assembly = new LampAssembly(saved?.assembly);
    this.firingActive = !!saved?.firingActive && this.assembly.ready();
    this.firing = new LampFiringView(this, saved?.firing);
    if (this.firingActive) { this.formingActive = false; this.spliceActive = false; }
    this.feedback = '';
    this.closed = false;
    this.stroke = null;
    this.effect = null;
    this.clayState = 'POTTERY_CLAY_NEUTRAL';
    this.elapsed = 0;
    this.saveClock = 0;
    this.canvasKey = 'lamp-workshop-' + (++lampCanvasId);
    this.surface = this.scene.textures.createCanvas(this.canvasKey, 960, 568);
    this.moveListener = pointer => {
      if (this.firingActive) { this.firing.move(pointer); return; }
      if (this.formingActive) { this.forming.move(pointer); return; }
      if (this.spliceActive) { this.assembly.move(pointer); this.paintAssembly(); return; }
      if (!this.stroke || this.effect || pointer.id !== this.stroke.pointerId) return;
      const point = { x: pointer.x, y: pointer.y };
      const last = this.stroke.points[this.stroke.points.length - 1];
      if (Math.hypot(point.x - last.x, point.y - last.y) >= 4) this.stroke.points.push(point);
      this.paint();
    };
    this.downListener = pointer => this.startStroke(pointer);
    this.upListener = pointer => this.endStroke(pointer);
    this.upOutsideListener = pointer => this.cancelStroke(pointer);
    this.cancelListener = pointer => this.cancelStroke(pointer);
    this.scene.input.on('pointerdown', this.downListener);
    this.scene.input.on('pointermove', this.moveListener);
    this.scene.input.on('pointerup', this.upListener);
    this.scene.input.on('pointerupoutside', this.upOutsideListener);
    this.scene.input.on('pointercancel', this.cancelListener);
  }

  add(object) { this.modal.body.add(object); return object; }

  text(value, x, y, width = 355, size = 23, color = '#5f3f28') {
    const lines = [];
    String(value).split('\n').forEach(original => {
      let line = '', units = 0;
      for (const ch of original) {
        const weight = /[\u0000-\u00ff]/.test(ch) ? 0.58 : 1;
        if (line && units + weight > width / size) {
          lines.push(line); line = ''; units = 0;
        }
        line += ch; units += weight;
      }
      lines.push(line);
    });
    return this.modal.label(lines.join('\n'), x, y, {
      align: 'center', fontSize: size + 'px', color,
    }).setLineSpacing(7);
  }

  button(y, value, action, fill = 0x2e6e63) {
    return this.modal.button(1460, y, 355, 62, value, action, { fill, fontSize: '24px' });
  }

  save() {
    if (!this.closed) {
      G.state.lampCraft = { ...this.craft.toJSON(), formingActive: this.formingActive, spliceActive: this.spliceActive,
        forming: this.forming.model.toJSON(), assembly: this.assembly.toJSON(),
        firingActive: this.firingActive, firing: this.firing.model.toJSON() };
      SaveService.save();
    }
  }

  refresh() {
    if (!this.closed) {
      this.stroke = null;
      this.effect = null;
      this.save();
      this.modal.render();
    }
  }

  dispose(success) {
    if (success) G.state.lampCraft = null;
    else this.save();
    this.closed = true;
    this.forming.dispose();
    this.firing.dispose();
    this.scene.input.off('pointerdown', this.downListener);
    this.scene.input.off('pointermove', this.moveListener);
    this.scene.input.off('pointerup', this.upListener);
    this.scene.input.off('pointerupoutside', this.upOutsideListener);
    this.scene.input.off('pointercancel', this.cancelListener);
    this.scene.textures.remove(this.canvasKey);
    this.clearAssemblySeams();
  }

  render() {
    if (this.firingActive) { this.firing.render(); return; }
    if (this.formingActive) { this.forming.render(); return; }
    if (this.spliceActive) { this.renderAssembly(); return; }
    const c = this.craft;
    if (!this.effect) {
    this.clayState = this.textureForState();
    }
    this.stroke = null;
    this.effect = null;
    this.status = null;
    this.hint = null;
    this.modal.titleT.setText('准备土陶油灯材料');
    this.modal.stepT.setText(c.phase === 0 ? '和泥成坯' : '材料准备好了');
    this.modal.tipT.setText('Esc：保存并退出');

    this.add(this.scene.add.image(750, 600, 'POTTERY_TABLE').setDisplaySize(960, 568));
    // 生成图是带透明留白的 3:2 大图，显示尺寸必须回到转盘里原泥团的范围，
    // 否则会把标题和右侧说明一起盖住。
    this.claySprite = this.add(this.scene.add.image(750, 615 + this.kneadOffsetY(), this.clayState)
      .setDisplaySize(300, 200).setAlpha(0.98));
    this.clayBaseScaleX = this.claySprite.scaleX;
    this.clayBaseScaleY = this.claySprite.scaleY;
    const frame = this.add(this.scene.add.graphics());
    frame.lineStyle(3, 0x7a4a21, 1).strokeRoundedRect(270, 316, 960, 568, 8);
    this.add(this.scene.add.image(750, 600, this.canvasKey));
    this.overlay = this.add(this.scene.add.graphics());
    // 操作反馈不再单独铺在画面底部，避免短暂文字造成视觉噪音。
    this.hint = null;

    if (c.phase === 0) this.renderKnead();
    else this.renderComplete();
    this.paint();
    this.updateStatus();
  }

  textureForState() {
    const c = this.craft;
    if (c.ready()) return 'POTTERY_CLAY_READY';
    if (c.air > 0.58) return 'POTTERY_CLAY_BUBBLE';
    if (c.lastAction === 'fold') return c.foldSide < 0 ? 'POTTERY_CLAY_FOLD_LEFT' : 'POTTERY_CLAY_FOLD_RIGHT';
    if (c.lastAction === 'press') return c.skew < 0 ? 'POTTERY_CLAY_PRESS_LEFT' : 'POTTERY_CLAY_PRESS_RIGHT';
    return 'POTTERY_CLAY_NEUTRAL';
  }

  conditionText() {
    const q = this.craft.quality();
    if (q.moisture < 0.3) return '泥团偏干，先轻按中心让泥性回匀。';
    if (q.moisture > 0.9) return '水分偏多，暂时少按压，多做一次完整翻折。';
    if (q.air > 0.58) return '泥里还有气泡，按压后把一侧翻到另一侧。';
    if (Math.abs(this.craft.skew) > 0.2) return '泥团有些偏斜，从较高的一侧向另一侧翻折。';
    if (q.uniformity < 0.65) return '软硬还不一致，换一个位置继续按压。';
    if (q.plasticity < 0.58) return '泥性开始变柔，再做一次完整翻折。';
    if (this.craft.ready()) return '泥色均匀、软硬一致，可以上转盘成型了。';
    return '手感正在变稳，继续观察泥团的变化。';
  }

  statusText() {
    const q = this.craft.quality();
    const ok = value => value ? '✓' : '○';
    const moistureOk = q.moisture >= 0.52 && q.moisture <= 0.88;
    return ok(q.uniformity >= 0.78) + ' 软硬均匀\n' +
      ok(q.plasticity >= 0.68) + ' 有韧性\n' +
      ok(moistureOk) + ' 湿润适中\n' +
      ok(q.air <= 0.24) + ' 气泡排出';
  }

  paint() {
    if (this.closed) return;
    if (!this.claySprite) return;
    const effect = this.effect;
    if (!effect) {
      if (this.stroke && this.stroke.points.length > 1) {
        const start = this.stroke.points[0];
        const last = this.stroke.points[this.stroke.points.length - 1];
        const dx = last.x - start.x;
        if (Math.abs(dx) > 22) {
          const side = dx < 0 ? -1 : 1;
          const drag = Math.min(1, Math.abs(dx) / 220);
          // 左右分别使用互为镜像的翻折图，拖动方向与泥面受力方向一致。
          this.claySprite.setTexture(side < 0 ? 'POTTERY_CLAY_FOLD_LEFT' : 'POTTERY_CLAY_FOLD_RIGHT').setFlipX(false)
            .setScale(this.clayBaseScaleX * (1 + drag * 0.04), this.clayBaseScaleY * (1 - drag * 0.025))
            .setRotation(side * drag * 0.04)
            .setX(750 + side * drag * 16);
          return;
        }
      }
      this.claySprite.setTexture(this.clayState).setFlipX(false)
        .setScale(this.clayBaseScaleX, this.clayBaseScaleY)
        .setRotation(0).setX(750).setAlpha(0.98)
        .setY(615 + this.kneadOffsetY());
      return;
    }
    const t = LampWorkshop.ease(Math.min(1, effect.elapsed / effect.duration));
    const side = effect.side || 1;
    if (effect.kind === 'press') {
      // 手指落下时先压扁，再让泥面自然回弹到受压后的状态。
      this.claySprite.setTexture(effect.texture).setFlipX(false)
        .setScale(this.clayBaseScaleX * (1 - Math.sin(Math.PI * t) * 0.035), this.clayBaseScaleY * (1 + Math.sin(Math.PI * t) * 0.035))
        .setRotation(side * Math.sin(Math.PI * t) * 0.018);
    } else {
      // 翻折沿玩家拖动方向偏移，松手时落回转盘中心。
      const lift = Math.sin(Math.PI * t);
      // 左右方向只控制位移与旋转，泥面形变保持一致。
      this.claySprite.setTexture(effect.texture).setFlipX(false)
        .setScale(this.clayBaseScaleX * (1 + lift * 0.035), this.clayBaseScaleY * (1 - lift * 0.022))
        .setRotation(side * lift * 0.035)
        .setX(750 + side * lift * 18);
    }
  }

  static ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  // 压左/压右两张源图整幅带半透明底噪（alpha 覆盖全画幅），按 300x200 缩放后
  // 实心区域比其余状态低约 10.5px，会让人看到泥团“往下一沉”。这里按状态补偿，让 8 态底边一致。
  static KNEAD_DY = {
    POTTERY_CLAY_PRESS_LEFT: -10.5,
    POTTERY_CLAY_PRESS_RIGHT: -10.5,
  };
  kneadOffsetY() { return LampWorkshop.KNEAD_DY[this.clayState] || 0; }

  renderKnead() {
    const c = this.craft;
    this.text('点击按压 · 按住加深 · 横向拖动翻折', 750, 270, 920, 23);
    this.text('泥料状态', 1460, 349, 355, 27, '#805728');
    // 状态栏使用 Phaser 自带换行，避免微软雅黑变宽后把长提示挤到下方说明上。
    this.status = this.modal.label('', 1460, 410, {
      align: 'left', wrap: 330, fontSize: '25px', color: '#5f3f28',
    });
    this.status.setX(1300).setLineSpacing(20);

    if (c.ready()) {
      this.button(821, '放上转盘，开始成型', () => this.beginForming());
    }
    this.button(895, '重新和泥', () => this.resetCraft(), 0x9e3d2e);
  }

  renderComplete() {
    this.text('泥料已和好', 750, 270, 920, 24);
    this.text('材料准备好了', 1460, 353, 355, 30, '#2e6e63');
    this.status = this.modal.label('', 1300, 410, { fontSize: '25px', color: '#2e6e63' });
    this.status.setLineSpacing(20);
    this.button(827, '放上转盘，开始成型', () => this.beginForming());
    this.button(895, '重新和泥', () => this.resetCraft(), 0x9e3d2e);
  }

  resetCraft() {
    if (this.closed) return;
    this.craft = new LampCraft();
    this.formingActive = false;
    this.forming.model = new LampForming();
    this.feedback = '泥团已经重新准备好，从中心开始按压。';
    this.save();
    this.modal.render();
  }

  startStroke(pointer) {
    if (this.firingActive) { this.firing.down(pointer); return; }
    if (this.formingActive) { this.forming.down(pointer); return; }
    if (this.spliceActive) { this.assembly.down(pointer); return; }
    if (this.effect || this.craft.phase !== 0) return;
    // 使用场景级 pointerdown，避免泥团贴图或面板重绘遮住独立的交互矩形。
    // 工作台区域是左侧 960×568 的制作区。
    if (Math.abs(pointer.x - 750) > 300 || Math.abs(pointer.y - 610) > 205) return;
    this.stroke = { pointerId: pointer.id, points: [{ x: pointer.x, y: pointer.y }], startedAt: this.scene.time.now };
    this.feedback = '';
    this.updateStatus();
  }

  endStroke(pointer) {
    if (this.firingActive) { this.firing.up(pointer); return; }
    if (this.formingActive) { this.forming.up(pointer); this.save(); return; }
    if (this.spliceActive) {
      const snapped = this.assembly.up(pointer);
      this.feedback = snapped ? (this.assembly.ready() ? '两个土胚零件都接牢了，可以准备烧制。' : '接缝压实了，再接另一个零件。') : '把零件拖到灯身旁的亮点处。';
      this.save(); this.paintAssembly(); return;
    }
    if (!this.stroke || this.effect || pointer.id !== this.stroke.pointerId) return;
    const points = this.stroke.points;
    points.push({ x: pointer.x, y: pointer.y });
    const holdMs = Math.max(0, this.scene.time.now - (this.stroke.startedAt || this.scene.time.now));
    this.stroke = null;
    const start = points[0], end = points[points.length - 1];
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    if (distance < 35) {
      const press = this.craft.pressAt(end, holdMs);
      if (press) {
        const side = end.x < 750 ? -1 : 1;
        const pressTexture = press.center > 0.68 ? 'POTTERY_CLAY_PRESS_CENTER'
          : side < 0 ? 'POTTERY_CLAY_PRESS_LEFT' : 'POTTERY_CLAY_PRESS_RIGHT';
        this.beginEffect({ kind: 'press', point: end, side, texture: pressTexture, duration: 0.42 });
        this.feedback = press.center > 0.68 ? '按压到泥心，凹痕正在慢慢回弹。' : '按压到泥边，泥团向一侧鼓起了。';
      }
      else this.feedback = '点击泥团中央，按压出一个清楚的凹痕。';
    } else if (this.craft.foldStroke(points)) {
      const side = end.x >= start.x ? 1 : -1;
      this.beginEffect({ kind: 'fold', start, end, side,
        texture: side < 0 ? 'POTTERY_CLAY_FOLD_LEFT' : 'POTTERY_CLAY_FOLD_RIGHT', duration: 0.62 });
      this.feedback = points[0].x < 750 ? '左侧泥料覆盖到右侧，泥团正在收拢。' : '右侧泥料覆盖到左侧，泥团正在收拢。';
    } else {
      this.feedback = Math.abs(end.x - start.x) < Math.abs(end.y - start.y) * 1.15
        ? '这次是上下移动，试着从一侧横向拖过泥团。'
        : '从泥团一侧按住，拖过中间，再覆盖到另一侧。';
    }
    this.save();
    this.updateStatus();
    this.paint();
  }

  cancelStroke(pointer) {
    if (this.firingActive) { this.firing.drag = null; return; }
    if (this.formingActive) { this.forming.up(pointer); return; }
    if (this.spliceActive) { this.assembly.active = null; this.paintAssembly(); return; }
    if (!this.stroke || (pointer && pointer.id !== this.stroke.pointerId)) return;
    this.stroke = null;
    this.paint();
  }

  beginEffect(effect) {
    this.effect = { ...effect, elapsed: 0 };
    this.feedback = effect.kind === 'press' ? '按压：泥团被压出柔软的凹面……' : '翻折：你拖动的一侧正在覆盖到另一侧……';
    this.updateStatus();
  }

  updateStatus() {
    if (this.status) {
      const q = this.craft.quality();
      const pct = n => Math.round(n * 100) + '%';
      this.status.setText(this.statusText());
    }
  }

  update(delta) {
    if (this.closed) return;
    const dt = Math.min(Math.max(Number(delta) || 0, 0), 50) / 1000;
    if (this.firingActive) {
      this.firing.update(dt); this.saveClock += dt;
      if (this.saveClock >= 1) { this.saveClock = 0; this.save(); }
      return;
    }
    if (this.formingActive) {
      this.forming.update(dt);
      this.saveClock += dt;
      if (this.saveClock >= 1) { this.saveClock = 0; this.save(); }
      return;
    }
    if (this.spliceActive) { this.paintAssembly(); return; }
    this.elapsed += dt;
    if (this.effect) {
      this.effect.elapsed += dt;
      this.paint();
      if (this.effect.elapsed >= this.effect.duration) {
        this.clayState = this.effect.texture;
        this.effect = null;
        this.stroke = null;
        this.feedback = '';
        this.save();
        // 普通按压/第一次翻折完成后保留现有交互层，避免重绘销毁
        // 当前泥团的 pointerdown 区域。只有完成全部步骤时才切换完成页。
        if (this.craft.ready()) this.modal.render();
        else {
          this.paint();
          this.updateStatus();
        }
      }
      return;
    }
    this.saveClock += dt;
    if (this.saveClock >= 1) {
      this.saveClock = 0;
      this.save();
    }
  }

  beginForming() {
    if (!this.craft.ready()) return;
    this.formingActive = true;
    this.stroke = null;
    this.effect = null;
    this.save();
    this.modal.render();
  }

  beginAssembly() {
    if (!this.forming.model.ready()) return;
    this.formingActive = false; this.spliceActive = true; this.assembly = new LampAssembly();
    this.save(); this.modal.render();
  }

  beginFiring() {
    if (!this.assembly.ready() || this.closed) return;
    this.formingActive = false; this.spliceActive = false; this.firingActive = true;
    this.stroke = null; this.assembly.active = null;
    this.save(); this.modal.render();
    this.clearAssemblySeams();
  }

  renderAssembly() {
    this.clearAssemblySeams();
    const add = o => this.add(o);
    this.modal.titleT.setText('拼接土胚 · 油灯嘴和把手');
    this.modal.stepT.setText('把两个零件拖到灯身接缝处');
    this.modal.tipT.setText('Esc：保存并退出');
    add(this.scene.add.image(750, 600, 'POTTERY_TABLE').setDisplaySize(960, 568));
    const { body, spout, handle } = LampAssembly.layout;
    add(this.scene.add.image(body.x, body.y, 'POTTERY_FORMING', 7)
      .setDisplaySize(body.width, body.height).setRotation(body.rotation).setFlipX(body.flipX));
    this.assemblyGuide = add(this.scene.add.graphics());
    this.spoutGuideLabel = this.text('灯嘴', spout.x, spout.y + 68, 180, 19, '#805728');
    this.handleGuideLabel = this.text('把手', handle.x, handle.y + 68, 180, 19, '#805728');
    // 添加顺序对应校准层级：灯身 0、灯嘴 1、把手 2。
    this.spoutSprite = add(this.scene.add.image(430, 540, this.createAssemblyColor('spout')).setDisplaySize(spout.width, spout.height).setFlipX(spout.flipX));
    this.spoutSeam = this.createAssemblySeam('spout');
    this.handleSprite = add(this.scene.add.image(1080, 520, this.createAssemblyColor('handle')).setDisplaySize(handle.width, handle.height).setFlipX(handle.flipX));
    this.handleSeam = this.createAssemblySeam('handle');
    this.text('拖动灯嘴到右前侧，拖动把手到左后侧；放近会自动吸附。', 750, 270, 920, 23);
    this.assemblyStatus = this.modal.label('', 1300, 390, { wrap: 320, fontSize: '24px', color: '#5f3f28' });
    this.assemblyStatus.setLineSpacing(14);
    const before = this.modal.body.length;
    this.assemblyButton = this.button(827, '拼接完成，准备烧制', () => this.beginFiring());
    this.assemblyVisuals = this.modal.body.list.slice(before);
    this.button(895, '重新拼接', () => { this.assembly = new LampAssembly(); this.save(); this.modal.render(); }, 0x9e3d2e);
    this.paintAssembly();
  }

  clearAssemblySeams() {
    for (const key of this.assemblySeamKeys || []) this.scene.textures.remove(key);
    this.assemblySeamKeys = [];
  }

  createAssemblyColor(partKey) {
    const config = LampAssembly.settings, frame = this.scene.textures.getFrame(config.textures[partKey]);
    const key = this.canvasKey + '-color-' + partKey;
    const texture = this.scene.textures.createCanvas(key, frame.cutWidth, frame.cutHeight);
    const color = config.seams.colors[partKey];
    if (config.seams.colorEnabled) texture.context.filter = `brightness(${color.brightness}) saturate(${color.saturation})`;
    texture.context.drawImage(frame.source.image, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
      0, 0, frame.cutWidth, frame.cutHeight);
    texture.context.filter = 'none'; texture.refresh();
    this.assemblySeamKeys.push(key);
    return key;
  }

  createAssemblySeam(partKey) {
    // 与调整工具相同：调色后以根部渐隐遮罩削弱零件，且只作用于灯身覆盖处。
    // 拼好后用此完整零件替换拖动图，而不是把半透明效果叠在原零件上。
    const config = LampAssembly.settings, p = config.parts[partKey];
    const makeCanvas = () => Object.assign(document.createElement('canvas'), { width: 960, height: 568 });
    const draw = (ctx, part) => {
      const q = config.parts[part], frame = this.scene.textures.getFrame(config.textures[part], part === 'body' ? config.bodyFrame : undefined);
      ctx.save(); ctx.translate(q.x - 270, q.y - 316);
      // 保留调参工具的角度精度，保证最终合成与预览一致。
      ctx.rotate(q.rotationDeg * Math.PI / 180); ctx.scale(q.flipX ? -1 : 1, 1);
      const color = config.seams.colors[part];
      if (color && config.seams.colorEnabled) ctx.filter = `brightness(${color.brightness}) saturate(${color.saturation})`;
      ctx.drawImage(frame.source.image, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
        -q.width / 2, -q.height / 2, q.width, q.height);
      ctx.restore();
    };
    const key = this.canvasKey + '-seam-' + partKey;
    const texture = this.scene.textures.createCanvas(key, 960, 568), output = texture.context;
    draw(output, partKey);
    if (config.seams.enabled && config.seams.method === 'feather') {
      const mask = makeCanvas(), m = mask.getContext('2d');
      for (const r of config.seams.regions.filter(r => r.part === partKey)) {
        m.save(); m.translate(p.x - 270, p.y - 316); m.rotate(p.rotationDeg * Math.PI / 180);
        m.scale(p.flipX ? -1 : 1, 1);
        m.translate((r.x - 0.5) * p.width, (r.y - 0.5) * p.height); m.scale(r.rx * p.width, r.ry * p.height);
        const fade = m.createRadialGradient(0, 0, 0, 0, 0, 1);
        fade.addColorStop(0, `rgba(255,255,255,${r.edgeStrength})`);
        fade.addColorStop(1 - r.edgeFeather, `rgba(255,255,255,${r.edgeStrength})`);
        fade.addColorStop(1, 'rgba(255,255,255,0)');
        m.fillStyle = fade; m.fillRect(-1, -1, 2, 2); m.restore();
      }
      m.globalCompositeOperation = 'destination-in'; draw(m, 'body');
      output.globalCompositeOperation = 'destination-out'; output.drawImage(mask, 0, 0);
      output.globalCompositeOperation = 'source-over';
    }
    texture.refresh(); this.assemblySeamKeys.push(key);
    return this.add(this.scene.add.image(750, 600, key).setVisible(false));
  }

  paintAssembly() {
    if (!this.spliceActive || !this.assemblyGuide) return;
    const g = this.assemblyGuide.clear();
    const target = (x, y) => { g.lineStyle(5, 0xffd774, 0.95).strokeCircle(x, y, 42); g.lineStyle(2, 0x9d7336, 0.8).strokeCircle(x, y, 55); };
    const s = this.assembly.parts.spout, h = this.assembly.parts.handle;
    if (!s.attached) target(LampAssembly.layout.spout.x, LampAssembly.layout.spout.y);
    if (!h.attached) target(LampAssembly.layout.handle.x, LampAssembly.layout.handle.y);
    this.spoutGuideLabel.setVisible(!s.attached); this.handleGuideLabel.setVisible(!h.attached);
    this.spoutSprite.setPosition(s.x, s.y).setRotation(s.rotation).setVisible(!s.attached);
    this.handleSprite.setPosition(h.x, h.y).setRotation(h.rotation).setVisible(!h.attached);
    this.spoutSeam.setVisible(s.attached);
    this.handleSeam.setVisible(h.attached);
    this.assemblyStatus.setText((s.attached ? '✓' : '○') + ' 灯嘴接牢\n' + (h.attached ? '✓' : '○') + ' 把手接牢\n' + (this.assembly.ready() ? '土胚拼接完成，可以准备烧制。' : '零件放到亮点附近会自动压合。'));
    this.assemblyButton.input.enabled = this.assembly.ready();
    for (const visual of this.assemblyVisuals) visual.setAlpha(this.assembly.ready() ? 1 : 0.4);
  }

}

if (typeof module !== 'undefined' && module.exports) module.exports = { LampCraft, LampAssembly, LampWorkshop };
