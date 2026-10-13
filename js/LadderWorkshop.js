// 绳梯制作：装配、两处穿绳收紧、逐档试重。模型不依赖 Phaser，便于验证失败与返工规则。
class LadderCraft {
  constructor(saved) {
    this.phase = 0;
    this.rungs = [null, null, null, null];
    this.ends = [-18, 24];
    this.knots = Array.from({ length: 4 }, () => [0, 0]);
    this.loaded = Array.from({ length: 4 }, () => [false, false, false]);
    this.activeKnot = { row: 0, side: 0 };
    this.routeStep = 0;
    this.pull = 0;
    this.issue = null;
    if (saved && (saved.v === 1 || saved.v === 2)) {
      if (Array.isArray(saved.rungs) && saved.rungs.length === 4) {
        this.rungs = saved.rungs.map(y => Number.isFinite(y) ? LadderCraft.clamp(y, 380, 770) : null);
      }
      if (Array.isArray(saved.ends) && saved.ends.length === 2) {
        this.ends = saved.ends.map(y => Number.isFinite(y) ? LadderCraft.clamp(y, -44, 44) : 0);
      }
      if (Array.isArray(saved.knots) && saved.knots.length === 4) {
        this.knots = saved.knots.map(pair => [0, 1].map(i => LadderCraft.clamp(Number(pair && pair[i]) || 0, 0, 1)));
      }
      // 保持旧存档的数组形状，仅保留每根横档中间的试重结果。
      if (Array.isArray(saved.loaded) && saved.loaded.length === 4) {
        this.loaded = saved.loaded.map(row => [false, !!(row && row[1]), false]);
      }
      this.phase = Number.isInteger(saved.phase) ? LadderCraft.clamp(saved.phase, 0, 3) : 0;
      if (saved.activeKnot && Number.isInteger(saved.activeKnot.row)) {
        this.activeKnot = { row: LadderCraft.clamp(saved.activeKnot.row, 0, 3), side: saved.activeKnot.side === 1 ? 1 : 0 };
      }
      this.routeStep = Math.floor(LadderCraft.clamp(Number(saved.routeStep) || 0, 0, 4));
      this.pull = LadderCraft.clamp(Number(saved.pull) || 0, 0, 120);
      if (!this.rungs.every(Number.isFinite)) this.phase = 0;
      // 旧版允许歪着直接绑结。保留材料与已绑的结，但先返回调平，旧绳路改为重新穿。
      if (saved.v === 1 && this.phase === 1) { this.routeStep = 0; this.pull = 0; }
      if (this.phase > 0 && Math.abs(this.ends[0] - this.ends[1]) > 6) {
        this.phase = 0; this.loaded = this.loaded.map(() => [false, false, false]);
      } else if (this.phase > 0) this.levelEnds();
      if (this.phase >= 2) this.phase = this.loaded.every(row => row[1]) ? 3 : 2;
    }
  }
  static clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  static get marks() { return [390, 510, 630, 750]; }
  toJSON() {
    return { v: 2, phase: this.phase, rungs: this.rungs.slice(), ends: this.ends.slice(),
      knots: this.knots.map(row => row.slice()), loaded: this.loaded.map(row => row.slice()),
      activeKnot: { ...this.activeKnot }, routeStep: this.routeStep, pull: this.pull };
  }
  placeRung(index, y) {
    this.rungs[index] = LadderCraft.clamp(y, 380, 770);
    this.loaded = this.loaded.map(() => [false, false, false]);
  }
  alignEnd(side, y) {
    this.ends[side] = LadderCraft.clamp(y, -44, 44);
    this.loaded = this.loaded.map(() => [false, false, false]);
  }
  finishAssembly() {
    if (!this.rungs.every(Number.isFinite)) { this.issue = { kind: 'missing', row: this.rungs.indexOf(null) }; return false; }
    if (Math.abs(this.ends[0] - this.ends[1]) > 6) {
      this.issue = { kind: 'tilt', row: 0, side: this.ends[0] > this.ends[1] ? 0 : 1 }; return false;
    }
    this.levelEnds();
    if (this.knots.every(row => row.every(q => q > 0))) {
      this.phase = 2;
    } else {
      this.rungs.sort((a, b) => a - b);
      this.phase = 1;
      this.selectKnot(this.knots[0][0] > 0 ? 3 : 0, this.knots[0][0] > 0 ? 1 : 0);
    }
    this.issue = null;
    return true;
  }
  levelEnds() {
    const offset = (this.ends[0] + this.ends[1]) / 2;
    this.rungs = this.rungs.map(y => y == null ? null : LadderCraft.clamp(y + offset, 380, 770));
    this.ends = [0, 0];
  }
  selectKnot(row, side) {
    this.activeKnot = { row, side }; this.routeStep = 0; this.pull = 0;
  }
  secureKnot() {
    if (this.routeStep < 4 || this.pull < 55) return false;
    if (Math.abs(this.ends[0] - this.ends[1]) > 6) { this.phase = 0; return false; }
    const { row, side } = this.activeKnot;
    this.knots[row][side] = Math.min(1, this.pull / 75);
    this.loaded[row] = [false, false, false];
    if (!this.knots[0][0]) this.selectKnot(0, 0);
    else if (!this.knots[3][1]) this.selectKnot(3, 1);
    else {
      // 已亲手示范两个关键结，同伴照同样的方法固定其他连接处。
      this.knots.forEach((pair, i) => pair.forEach((q, j) => { if (!q) this.knots[i][j] = 0.9; }));
      this.phase = 2;
    }
    this.issue = null;
    return true;
  }
  rowIssue(row) {
    if (Math.abs(this.ends[0] - this.ends[1]) > 6) return { kind: 'tilt', row, side: this.ends[0] > this.ends[1] ? 0 : 1 };
    const weak = this.knots[row].findIndex(q => q < 0.72);
    if (weak >= 0) return { kind: 'slip', row, side: weak };
    if (row === 0 && this.rungs[0] > 440) return { kind: 'spacing', row, side: 0 };
    if (row === 3 && this.rungs[3] < 700) return { kind: 'spacing', row, side: 0 };
    if (row > 0) {
      const gap = this.rungs[row] - this.rungs[row - 1];
      if (gap < 85 || gap > 150) return { kind: 'spacing', row, side: 0 };
    }
    return null;
  }
  loadAt(row, side) {
    if (this.phase !== 2 || this.issue || row < 0 || row > 3 || side !== 1) return false;
    const issue = this.rowIssue(row);
    if (issue) { this.issue = issue; return false; }
    this.loaded[row][side] = true;
    if (this.loaded.every(r => r[1])) this.phase = 3;
    return true;
  }
  repair() {
    if (!this.issue) return;
    const { kind, row, side } = this.issue;
    this.loaded[row] = [false, false, false];
    this.phase = kind === 'slip' ? 1 : 0;
    if (kind === 'slip') this.selectKnot(row, side);
    this.issue = null;
  }
  loadTargets() {
    return this.rungs.flatMap((y, row) => y == null ? [] : [{
      row, side: 1, x: 730, y: y + (this.ends[0] + this.ends[1]) / 2,
    }]);
  }
  nextLoadTarget() { return this.loadTargets().find(t => !this.loaded[t.row][t.side]) || null; }
  nearestLoadTarget(x, y) {
    return this.loadTargets().filter(t => Math.abs(t.x - x) <= 85 && Math.abs(t.y - y) <= 48)
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0] || null;
  }
}

class LadderWorkshop {
  constructor(modal, saved) {
    this.modal = modal; this.scene = modal.scene;
    this.craft = new LadderCraft(saved);
    this.feedback = '';
    this.bagPos = { x: 1450, y: 700 };
    this.bagOnLadder = false;
    this.pendingTarget = null; this.draggingBag = false; this.placingBag = false; this.dwell = 0;
    this.selection = null;
    this.closed = false;
  }
  save() {
    if (!this.closed) { G.state.ladderAssembly = this.craft.toJSON(); SaveService.save(); }
  }
  dispose(success) {
    if (this.bag) this.scene.tweens.killTweensOf(this.bag);
    if (success) G.state.ladderAssembly = null;
    else this.save();
    this.closed = true;
    this.rungSprites = []; this.bag = null; this.graphics = null;
  }
  add(object) { this.modal.body.add(object); return object; }
  text(text, x, y, width = 380, size = 25, color = '#5f3f28', align = 'center') {
    // 中文逐字换行，避免 Phaser 按空格换行造成连续中文越过面板。
    const maxUnits = width / size;
    const lines = [];
    for (const original of String(text).split('\n')) {
      let line = '', units = 0;
      for (const ch of original) {
        const unit = /[\u0000-\u00ff]/.test(ch) ? 0.58 : 1;
        if (units + unit > maxUnits && line) { lines.push(line); line = ''; units = 0; }
        line += ch; units += unit;
      }
      lines.push(line);
    }
    return this.modal.label(lines.join('\n'), x, y, { align, fontSize: size + 'px', color }).setLineSpacing(7);
  }
  button(y, label, action, fill = 0x2e6e63) {
    return this.modal.button(1460, y, 360, 62, label, action, { fill, fontSize: '25px' });
  }
  refresh() { if (!this.closed) { this.save(); this.modal.render(); } }
  render() {
    if (this.bag) this.scene.tweens.killTweensOf(this.bag);
    if (this.placingBag) { this.placingBag = false; this.pendingTarget = null; }
    const phase = this.craft.phase;
    this.modal.titleT.setText('制作绳梯');
    this.modal.stepT.setText(['1/3 · 摆横档、调绳长', '2/3 · 穿绳、收紧', '3/3 · 沙袋试重', '绳梯检查通过'][phase]);
    this.modal.tipT.setText('Esc：保存并退出');
    this.add(this.scene.add.image(750, 600, 'LADDER_TABLE').setDisplaySize(960, 568));
    const frame = this.add(this.scene.add.graphics());
    frame.lineStyle(3, 0x7a4a21, 1).strokeRoundedRect(270, 316, 960, 568, 8);
    this.graphics = this.add(this.scene.add.graphics().setDepth(2));
    this.backGraphics = this.add(this.scene.add.graphics());
    this.backGraphics.clear();
    this.rungSprites = [];
    this.bag = null;
    if (phase === 0) this.renderAssembly();
    else if (phase === 1) this.renderKnot();
    else if (phase === 2) this.renderTest();
    else this.renderComplete();
    this.modal.body.bringToTop(this.graphics);
    if (phase === 1 && this.knotLabels) this.knotLabels.forEach(t => this.modal.body.bringToTop(t));
    if (phase === 1 && this.ropeEnd) this.modal.body.bringToTop(this.ropeEnd);
    if (this.bag) this.modal.body.bringToTop(this.bag);
    if (this.feedback && phase !== 2) this.text(this.feedback, 750, 916, 930, 20, '#9e3d2e');
  }
  rope(g, points, width = 12, color = 0xcbb080) {
    const smooth = [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[Math.max(0, i - 1)], b = points[i], c = points[i + 1], d = points[Math.min(points.length - 1, i + 2)];
      for (let j = 1; j <= 12; j++) {
        const t = j / 12, t2 = t * t, t3 = t2 * t;
        const coord = key => 0.5 * ((2 * b[key]) + (-a[key] + c[key]) * t +
          (2 * a[key] - 5 * b[key] + 4 * c[key] - d[key]) * t2 + (-a[key] + 3 * b[key] - 3 * c[key] + d[key]) * t3);
        smooth.push({ x: coord('x'), y: coord('y') });
      }
    }
    for (const [w, c] of [[width + 5, 0x503523], [width, color], [3, 0xead8ad]]) {
      g.lineStyle(w, c, 1).beginPath().moveTo(smooth[0].x, smooth[0].y);
      smooth.slice(1).forEach(p => g.lineTo(p.x, p.y)); g.strokePath();
    }
    // 三股纤维交错，比单一扁平色带更容易辨认粗主绳和细绑绳。
    const fibers = [smooth[0]];
    for (let i = 1; i < smooth.length; i++) {
      const a = smooth[i - 1], b = smooth[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 5));
      for (let j = 1; j <= steps; j++) fibers.push({ x: a.x + (b.x - a.x) * j / steps, y: a.y + (b.y - a.y) * j / steps });
    }
    [0x9f7848, 0xd4b27a, 0xc0955b].forEach((strand, index) => {
      let travel = 0;
      g.lineStyle(Math.max(1.5, width * 0.22), strand, 0.85).beginPath();
      fibers.forEach((point, i) => {
        const prev = fibers[Math.max(0, i - 1)], next = fibers[Math.min(fibers.length - 1, i + 1)];
        if (i) travel += Math.hypot(point.x - prev.x, point.y - prev.y);
        const length = Math.hypot(next.x - prev.x, next.y - prev.y) || 1;
        const offset = Math.sin(travel / 8 + index * Math.PI * 2 / 3) * width * 0.25;
        const px = point.x - (next.y - prev.y) / length * offset, py = point.y + (next.x - prev.x) / length * offset;
        if (!i) g.moveTo(px, py); else g.lineTo(px, py);
      });
      g.strokePath();
    });
    let distance = 0;
    for (let i = 1; i < smooth.length; i++) {
      const p = smooth[i - 1], q = smooth[i], len = Math.hypot(q.x - p.x, q.y - p.y);
      distance += len;
      if (distance < 11 || len < 0.5) continue;
      const nx = -(q.y - p.y) / len, ny = (q.x - p.x) / len;
      g.lineStyle(1.5, 0x8c704b, 0.85).lineBetween(q.x + nx * width * 0.4, q.y + ny * width * 0.4,
        q.x - nx * width * 0.4 + (q.x - p.x) / len * 4, q.y - ny * width * 0.4 + (q.y - p.y) / len * 4);
      distance = 0;
    }
  }
  createRungs(interactive) {
    for (let i = 0; i < 4; i++) {
      const img = this.add(this.scene.add.image(1450, 460 + i * 102, 'LADDER_RUNG', 'craft'));
      this.rungSprites.push(img);
      if (!interactive) continue;
      img.setInteractive({ useHandCursor: true }); this.scene.input.setDraggable(img);
      img.on('dragstart', () => { this.selection = i; this.feedback = ''; img.setDepth(5); });
      img.on('drag', (pointer, x, y) => {
        if (x >= 380 && x <= 1160 && y >= 345 && y <= 810) {
          this.craft.placeRung(i, y - (this.craft.ends[0] + this.craft.ends[1]) / 2);
          this.paintLadder();
        } else img.setPosition(x, y);
      });
      img.on('dragend', (pointer) => {
        if (pointer.x >= 380 && pointer.x <= 1160 && pointer.y >= 345 && pointer.y <= 810) {
          let y = pointer.y - (this.craft.ends[0] + this.craft.ends[1]) / 2;
          const nearby = LadderCraft.marks.find(mark => Math.abs(mark - y) < 16);
          this.craft.placeRung(i, nearby == null ? y : nearby);
        }
        img.setDepth(0); this.selection = i; this.refresh();
      });
      // 点击选择 + 方向键细调，适合没有鼠标拖动条件的玩家。
      img.on('pointerdown', () => { this.selection = i; });
    }
  }
  paintLadder(failure = null) {
    const g = this.graphics.clear(), c = this.craft;
    const back = this.backGraphics.clear();
    [535, 925].forEach((x, side) => {
      this.rope(back, [{ x, y: 337 }, { x, y: 852 + c.ends[side] }], 15);
    });
    c.rungs.forEach((y, i) => {
      const img = this.rungSprites[i];
      if (y == null) { img.setPosition(1450, 460 + i * 102).setDisplaySize(280, 43).setRotation((i % 2 ? 1 : -1) * 0.035); return; }
      let ly = y + c.ends[0], ry = y + c.ends[1];
      if (failure && failure.row === i) {
        if (failure.kind === 'tilt') { ly += failure.side === 0 ? 28 : -5; ry += failure.side === 1 ? 28 : -5; }
        else if (failure.kind === 'slip') { if (failure.side === 0) ly += 44; else ry += 44; }
      }
      img.setPosition(730, (ly + ry) / 2).setDisplaySize(460, 52).setRotation(Math.atan2(ry - ly, 390));
      [535, 925].forEach((x, side) => {
        const yy = side === 0 ? ly : ry;
        this.rope(g, [{ x, y: yy - 10 }, { x, y: yy + 10 }], 13);
        if (c.knots[i][side]) this.binding(g, x, yy, c.knots[i][side]);
      });
      if (this.craft.phase >= 2) {
        const next = c.nextLoadTarget();
        const x = 730, yy = y + (c.ends[0] + c.ends[1]) / 2;
        const active = next && next.row === i;
        g.fillStyle(c.loaded[i][1] ? 0x2e6e63 : (active ? 0xd7ad60 : 0x14332e), c.loaded[i][1] ? 0.92 : 0.35).fillCircle(x, yy, 20);
        g.lineStyle(active ? 4 : 2, active ? 0xffe3a0 : 0xf5e4c6, active ? 1 : 0.65).strokeCircle(x, yy, 21);
        if (c.loaded[i][1]) g.lineStyle(3, 0xf7ecd4, 1).lineBetween(x - 8, yy, x - 2, yy + 6).lineBetween(x - 2, yy + 6, x + 9, yy - 7);
        if (active && !c.issue && !this.pendingTarget) g.fillStyle(0xffd582, 1).fillTriangle(x - 8, yy - 41, x + 8, yy - 41, x, yy - 30);
      }
    });
    if (failure) {
      const y = c.rungs[failure.row] + (c.ends[0] + c.ends[1]) / 2;
      g.lineStyle(4, 0xe38160, 1).strokeRoundedRect(485, y - 48, 490, 105, 16);
    }
  }
  binding(g, x, y, strength, scale = 1) {
    const slack = strength < 0.72 ? 12 : 0;
    const p = (dx, dy) => ({ x: x + dx * scale, y: y + (dy + slack) * scale });
    // 细绑绳环过木条，再围住穿孔主绳；承力结位于木条下方。
    this.rope(g, [p(-18, -16), p(-23, 15), p(-11, 31), p(17, 27), p(22, -12)], 5 * scale, 0xa77c49);
    this.rope(g, [p(21, -12), p(11, -20), p(-13, -19), p(-18, -16)], 5 * scale, 0xbe9158);
    this.rope(g, [p(-16, 30), p(0, 40), p(16, 30), p(0, 24), p(-16, 30)], 6 * scale, 0xc49b63);
    this.rope(g, [p(12, 31), p(-6, 45), p(6, 57)], 5 * scale, 0xa77c49);
  }
  renderAssembly() {
    this.text('拖动四根横档到绳索之间，再拉动两侧绳尾，让横档摆平。', 750, 272, 930, 26);
    const chalk = this.add(this.scene.add.graphics());
    LadderCraft.marks.forEach(y => {
      for (let x = 496; x < 960; x += 25) chalk.lineStyle(3, 0xf5e4c6, 0.6).lineBetween(x, y, x + 12, y);
    });
    chalk.lineStyle(2, 0xffe6a7, 0.65).lineBetween(496, 847, 965, 847);
    this.createRungs(true); this.paintLadder();
    [535, 925].forEach((x, side) => {
      const grip = this.add(this.scene.add.circle(x, 847 + this.craft.ends[side], 20, 0xd5b474, 1)
        .setStrokeStyle(3, 0x493321).setInteractive({ useHandCursor: true }));
      this.scene.input.setDraggable(grip);
      grip.on('drag', (pointer, _x, y) => {
        this.craft.alignEnd(side, y - 847); grip.y = 847 + this.craft.ends[side];
        this.paintLadder();
      });
      grip.on('dragend', () => {
        const other = this.craft.ends[1 - side];
        if (Math.abs(this.craft.ends[side] - other) <= 12) this.craft.alignEnd(side, other);
        this.feedback = ''; this.refresh();
      });
    });
    this.text('横档与绳尾', 1460, 337, 360, 29, '#805728');
    if (this.craft.rungs.every(Number.isFinite)) {
      const level = Math.abs(this.craft.ends[0] - this.craft.ends[1]) <= 6;
      this.text(level ? '横档已经摆平。\n现在可以开始绑连接处了。' : '横档还歪着，暂时不能绑。\n把长的一侧绳尾向上拉，\n与另一侧对齐。', 1460, 424, 355, 24, level ? '#2e6e63' : '#9e3d2e');
      this.text('两侧绳尾靠近同一高度时，\n会吸附对齐。\n绑好后两条主绳一样长。', 1460, 583, 355, 23);
    } else {
      this.text('把右侧木条拖进工作台。\n台面的粉笔痕可以参考。', 1460, 380, 360, 21);
    }
    this.drawShoe(1155, 590);
    this.text('脚印是步距参照', 1110, 707, 180, 18, '#f7ecd4').setStroke('#38251a', 3);
    this.button(840, this.craft.knots.every(r => r.every(q => q > 0)) ? '调整好了，继续试重' : '摆好了，开始穿绳', () => {
      if (!this.craft.finishAssembly()) {
        this.feedback = this.craft.issue && this.craft.issue.kind === 'tilt' ? '先把两侧绳尾调到同一高度，让四根横档摆平。' : '还有木条没放进两条绳索之间。';
        this.refresh(); return;
      }
      this.feedback = ''; this.bagOnLadder = false; this.refresh();
    });
    this.text('选中横档后，可用 ↑ ↓ 细调位置。绳尾拖到同一高度，横档就会回正。', 750, 884, 920, 19);
  }
  drawShoe(x, y) {
    const g = this.add(this.scene.add.graphics());
    g.lineStyle(3, 0xe0c69c, 0.9).beginPath().moveTo(x - 20, y + 95)
      .lineTo(x - 30, y + 50).lineTo(x - 30, y - 15).lineTo(x - 22, y - 36)
      .lineTo(x + 9, y - 44).lineTo(x + 28, y - 24).lineTo(x + 28, y + 49)
      .lineTo(x + 15, y + 95).closePath().strokePath();
    g.lineStyle(2, 0xe0c69c, 0.7).lineBetween(x - 21, y + 45, x + 18, y + 45);
  }
  knotJoint() {
    const side = this.craft.activeKnot.side;
    return { x: side === 0 ? 457 : 1043, dir: side === 0 ? 1 : -1 };
  }
  knotPoints() {
    const { x, dir } = this.knotJoint();
    return [{ x, y: 553 }, { x: x + dir * 76, y: 618 },
      { x: x - dir * 40, y: 675 }, { x: x + dir * 38, y: 638 }];
  }
  knotStart() { const { x, dir } = this.knotJoint(); return { x: x - dir * 74, y: 746 }; }
  knotTail() { const { x, dir } = this.knotJoint(); return { x: x + dir * 140, y: 713 }; }
  renderKnot() {
    const c = this.craft, { x, dir } = this.knotJoint();
    this.text('用细绑绳把横档锁在竖向主绳上：穿孔、绕回木条下面、环住主绳，再收紧。', 750, 272, 940, 24);
    // 主绳在木条后面，只有穿孔的短段露在木条正面，细绑绳另画在上层。
    [457, 1043].forEach(rx => this.rope(this.backGraphics, [{ x: rx, y: 380 }, { x: rx, y: 832 }], 22));
    this.add(this.scene.add.image(750, 553, 'LADDER_RUNG', 'craft').setDisplaySize(680, 110));
    this.text('横档与两侧主绳 · 局部放大', 750, 335, 860, 22, '#f7ecd4').setStroke('#38251a', 4);
    this.text('左侧主绳', 457, 383, 170, 20, '#f7ecd4').setStroke('#38251a', 4);
    this.text('右侧主绳', 1043, 383, 170, 20, '#f7ecd4').setStroke('#38251a', 4);
    this.text('正在操作的是细绑绳', 740, 843, 560, 21, '#f7ecd4').setStroke('#38251a', 4);
    this.text('第' + (c.activeKnot.row + 1) + '根横档 · ' + (c.activeKnot.side === 0 ? '左侧连接' : '右侧连接'), 1460, 351, 355, 26, '#805728');
    this.text('粗主绳穿过木孔承重。\n细绑绳同时绕住木条和主绳，\n收紧后横档才不会下滑。', 1460, 416, 355, 22);
    this.text('整架绳梯中的位置', 1460, 512, 355, 21, '#805728');
    this.insetSprites = [];
    c.rungs.forEach((_y, row) => {
      this.insetSprites.push(this.add(this.scene.add.image(1460, 558 + row * 34, 'LADDER_RUNG', 'craft').setDisplaySize(242, 22)));
    });
    const points = this.knotPoints(), start = this.knotStart(), tail = this.knotTail();
    const endpoint = c.routeStep < 4 ? (c.routeStep ? points[c.routeStep - 1] : start) : { x: tail.x, y: tail.y + c.pull };
    this.knotLabels = points.map((point, i) => this.text(String(i + 1), point.x, point.y - 12, 45, 21, '#fff1d1'));
    this.ropeEnd = this.add(this.scene.add.circle(endpoint.x, endpoint.y, 24, 0xe9c17b, 1)
      .setStrokeStyle(4, 0x493321).setInteractive({ useHandCursor: true }));
    this.scene.input.setDraggable(this.ropeEnd);
    this.ropeEnd.on('drag', (_pointer, dx, dy) => {
      if (c.routeStep < 4) {
        const point = points[c.routeStep];
        if (Math.hypot(dx - point.x, dy - point.y) < 45) c.routeStep++;
        this.ropeEnd.setPosition(LadderCraft.clamp(dx, 330, 1170), LadderCraft.clamp(dy, 420, 842));
      } else {
        c.pull = LadderCraft.clamp(dy - tail.y, 0, 110);
        this.ropeEnd.setPosition(tail.x, tail.y + c.pull);
      }
      this.paintKnot({ x: this.ropeEnd.x, y: this.ropeEnd.y });
      this.updateKnotHelp();
    });
    this.ropeEnd.on('dragend', () => { this.feedback = ''; this.refresh(); });
    this.knotHelp = this.text('', 1460, 708, 355, 23);
    this.updateKnotHelp();
    this.button(839, '锁紧这处连接', () => {
      if (!c.secureKnot()) {
        this.feedback = c.routeStep < 4 ? '细绑绳还没有完整绕住横档和主绳。' : '绳圈还松着，把亮起的绳尾再向下拉，直到绳圈收拢。';
        this.refresh(); return;
      }
      this.feedback = ''; this.resetLoad(); this.refresh();
    });
    this.text('亲手完成两处关键连接，\n同伴照同样的方法绑牢其余横档。', 1460, 892, 355, 20);
    this.paintKnot(endpoint);
  }
  updateKnotHelp() {
    if (!this.knotHelp) return;
    const c = this.craft;
    const help = [
      '① 抓住亮起的绳头，\n穿进木条的绳孔。',
      '② 从木条背面绕回来，\n让细绑绳兜住横档。',
      '③ 绕过竖向粗主绳，\n把木条和主绳连在一起。',
      '④ 穿回细绑绳的绳圈，\n然后准备拉紧。',
    ];
    this.knotHelp.setText(c.routeStep < 4 ? help[c.routeStep]
      : c.pull >= 55 ? '绳圈已收紧，\n横档和主绳已锁在一起。' : '抓住现在亮起的绳尾往下拉，\n直到木条下方的绳圈收拢。');
  }
  paintInset(g) {
    const c = this.craft;
    [1363, 1557].forEach(rx => this.rope(g, [{ x: rx, y: 540 }, { x: rx, y: 682 }], 5));
    c.rungs.forEach((_y, row) => {
      const yy = 558 + row * 34;
      [1363, 1557].forEach((rx, side) => {
        if (c.knots[row][side]) this.binding(g, rx, yy, c.knots[row][side], 0.4);
        if (row === c.activeKnot.row && side === c.activeKnot.side) {
          g.lineStyle(3, 0x9e3d2e, 1).strokeCircle(rx, yy, 14);
        }
      });
    });
  }
  paintKnot(end) {
    const g = this.graphics.clear(), c = this.craft, points = this.knotPoints();
    const back = this.backGraphics.clear();
    [457, 1043].forEach(rx => this.rope(back, [{ x: rx, y: 380 }, { x: rx, y: 832 }], 22));
    const { x, dir } = this.knotJoint(), start = this.knotStart(), tail = this.knotTail();
    [457, 1043].forEach(rx => this.rope(g, [{ x: rx, y: 542 }, { x: rx, y: 565 }], 19));
    const otherSide = 1 - c.activeKnot.side;
    if (c.knots[c.activeKnot.row][otherSide]) this.binding(g, otherSide === 0 ? 457 : 1043, 553, c.knots[c.activeKnot.row][otherSide], 1.8);
    // 绑绳的一端已绕在主绳上；玩家拖的是另一端。
    this.rope(g, [{ x: x - 13, y: 650 }, { x: x + 13, y: 655 }, { x: x - 13, y: 660 }], 8, 0xa77c49);
    const anchor = { x, y: 658 };
    let prev = start;
    points.forEach((point, i) => {
      g.lineStyle(3, 0xf1d39c, 0.4).lineBetween(prev.x, prev.y, point.x, point.y); prev = point;
      if (c.routeStep < 4) {
        g.fillStyle(i < c.routeStep ? 0x2e6e63 : 0x503820, 0.96).fillCircle(point.x, point.y, 24);
        g.lineStyle(i === c.routeStep ? 5 : 2, i === c.routeStep ? 0xffda84 : 0xf7ecd4, 0.95).strokeCircle(point.x, point.y, 24);
      }
      if (this.knotLabels && this.knotLabels[i]) this.knotLabels[i].setVisible(c.routeStep < 4);
    });
    const threaded = [anchor, start, ...points.slice(0, c.routeStep)];
    if (c.routeStep < 4) threaded.push(end);
    else {
      const tight = Math.min(1, c.pull / 75);
      const closed = [anchor, { x: x - dir * 22, y: 690 }, points[0],
        { x: x + dir * 28, y: 613 }, { x: x - dir * 22, y: 647 }, { x: x + dir * 18, y: 634 }];
      threaded.forEach((point, i) => {
        point.x += (closed[i].x - point.x) * tight;
        point.y += (closed[i].y - point.y) * tight;
      });
      threaded.push(end);
      g.lineStyle(2, 0xffdf9b, 0.85).lineBetween(tail.x, tail.y + 10, tail.x, 824);
      g.fillStyle(0xffdf9b, 0.85).fillTriangle(tail.x - 10, 814, tail.x + 10, 814, tail.x, 831);
    }
    if (c.routeStep > 0 && threaded.length >= 4) {
      this.rope(g, threaded.slice(0, 3), 9, 0xb68850);
      this.rope(back, threaded.slice(2, 4), 9, 0xb68850); // 穿出木孔的这段在横档背面。
      if (threaded.length > 4) this.rope(g, threaded.slice(3), 9, 0xb68850);
    } else this.rope(g, threaded, 9, 0xb68850);
    this.paintInset(g);
  }
  resetLoad() {
    this.pendingTarget = null; this.draggingBag = false; this.placingBag = false;
    this.bagOnLadder = false; this.dwell = 0; this.hoverTarget = null;
  }
  renderTest() {
    this.bagHomeLabel = null;
    this.text('把沙袋拖到木条上的金色亮圈并松手；也可以直接点击亮圈，自动放置沙袋。', 750, 272, 940, 24);
    this.createRungs(false); this.paintLadder(this.craft.issue);
    this.text('沙袋试重', 1460, 350, 355, 29, '#805728');
    this.status = this.text('', 1460, 409, 355, 23);
    this.text('先放到亮圈处，再等试重完成。\n每根横档只测中间一次，共四次。\n绿色对勾表示这根横档已通过。', 1460, 505, 355, 21);
    this.loadHint = this.text('', 750, 915, 925, 20, '#9e3d2e');
    this.craft.loadTargets().forEach(target => {
      const zone = this.add(this.scene.add.circle(target.x, target.y, 32, 0, 0).setInteractive({ useHandCursor: true }));
      zone.on('pointerdown', () => this.placeBag(target));
    });
    this.craft.rungs.forEach((y, row) => {
      this.text('第' + (row + 1) + '档', 420, y - 13, 105, 21, '#f7ecd4').setStroke('#38251a', 4);
    });
    this.text('中间', 730, this.craft.rungs[0] + 29, 90, 18, '#f7ecd4').setStroke('#38251a', 4);
    this.bag = this.add(this.scene.add.image(this.bagPos.x, this.bagPos.y, 'LADDER_BAG', 'craft'));
    this.bag.setOrigin(0.5, 1).setDisplaySize(this.bagOnLadder ? 96 : 112, this.bagOnLadder ? 84 : 98)
      .setInteractive({ useHandCursor: true });
    this.scene.input.setDraggable(this.bag);
    this.bag.on('dragstart', pointer => {
      if (this.craft.issue) return;
      this.scene.tweens.killTweensOf(this.bag); this.resetLoad();
      this.draggingBag = true; this.feedback = '';
      this.bag.setOrigin(0.5).setDisplaySize(96, 84).setPosition(pointer.x, pointer.y);
      this.updateStatus();
    });
    this.bag.on('drag', pointer => {
      if (this.craft.issue) return;
      this.bagPos = { x: LadderCraft.clamp(pointer.x, 300, 1580), y: LadderCraft.clamp(pointer.y, 330, 865) };
      this.bag.setPosition(this.bagPos.x, this.bagPos.y);
      this.hoverTarget = this.craft.nearestLoadTarget(pointer.x, pointer.y);
      this.paintLadder(); this.paintLoadProgress();
    });
    this.bag.on('dragend', pointer => {
      if (this.craft.issue) return;
      this.draggingBag = false;
      // 拖动时光标对应沙袋中心；松手后保持画面位置，再让袋底贴到木条。
      this.bag.setOrigin(0.5, 1).setPosition(this.bag.x, this.bag.y + 42);
      this.bagPos = { x: this.bag.x, y: this.bag.y };
      const target = this.craft.nearestLoadTarget(pointer.x, pointer.y);
      this.hoverTarget = null;
      if (target) this.placeBag(target);
      else { this.feedback = '没有放到横档上。拖到金色亮圈附近松手，或直接点亮圈。'; this.returnBagHome(); }
    });
    if (this.craft.issue) this.renderIssue();
    else {
      this.bagHomeLabel = this.text(this.bagOnLadder ? '' : '拿起沙袋', 1460, 718, 355, 21);
      this.button(780, '把沙袋放到下一处亮圈', () => this.placeBag(this.craft.nextLoadTarget()));
      this.button(857, '回工作台调整', () => {
        this.craft.phase = 0; this.resetLoad(); this.feedback = ''; this.refresh();
      }, 0x8a6a2f);
    }
    this.text('拖动时不会判定。松手后亮圈会吸附沙袋，进度转满一圈才完成试重。', 750, 885, 930, 20);
    this.updateStatus();
  }
  placeBag(target) {
    if (!target || this.craft.phase !== 2 || this.craft.issue || !this.bag) return;
    if (this.craft.loaded[target.row][target.side]) {
      this.feedback = '这一处已经通过。继续试下一个金色亮圈。';
      this.returnBagHome(); return;
    }
    this.scene.tweens.killTweensOf(this.bag);
    this.feedback = ''; this.draggingBag = false; this.hoverTarget = null;
    this.pendingTarget = { ...target }; this.dwell = 0; this.placingBag = true; this.bagOnLadder = true;
    this.bag.setOrigin(0.5, 1).setDisplaySize(96, 84);
    this.scene.tweens.add({
      targets: this.bag, x: target.x, y: target.y, duration: 300, ease: 'Cubic.out',
      onUpdate: () => { if (this.bag) this.bagPos = { x: this.bag.x, y: this.bag.y }; },
      onComplete: () => {
        if (this.closed || !this.bag) return;
        this.bagPos = { x: target.x, y: target.y }; this.placingBag = false; this.updateStatus();
      },
    });
    this.paintLadder(); this.updateStatus();
  }
  returnBagHome() {
    if (!this.bag) return;
    this.scene.tweens.killTweensOf(this.bag); this.resetLoad(); this.placingBag = true;
    this.bag.setOrigin(0.5, 1).setDisplaySize(112, 98);
    this.scene.tweens.add({
      targets: this.bag, x: 1450, y: 700, duration: 260, ease: 'Cubic.out',
      onUpdate: () => { if (this.bag) this.bagPos = { x: this.bag.x, y: this.bag.y }; },
      onComplete: () => { this.bagPos = { x: 1450, y: 700 }; this.placingBag = false; this.updateStatus(); },
    });
    this.paintLadder(this.craft.issue); this.updateStatus();
  }
  updateStatus() {
    if (!this.status) return;
    const c = this.craft, count = c.loaded.filter(row => row[1]).length;
    const target = this.pendingTarget || c.nextLoadTarget();
    const position = target ? '第 ' + (target.row + 1) + ' 根 · 中间' : '';
    this.status.setText(c.issue ? '这一处没稳住\n调整后再试，其他进度保留'
      : this.draggingBag ? '拖到亮圈附近，再松手\n拖动途中不会开始试重'
      : this.pendingTarget ? position + '\n' + (this.placingBag ? '正在放下沙袋…' : '正在试重，等进度转满一圈')
      : '已完成 ' + count + '/4 根横档\n下一根：' + position);
    if (this.loadHint) this.loadHint.setText(this.feedback || '');
    if (this.bagHomeLabel) this.bagHomeLabel.setText(this.bagOnLadder || this.draggingBag ? '' : '拿起沙袋');
  }
  renderIssue() {
    const issue = this.craft.issue;
    const messages = {
      tilt: '两侧主绳没有调平。\n回工作台把两端对齐，\n再继续检查。',
      slip: '第' + (issue.row + 1) + '档往下滑了。\n' + (issue.side === 0 ? '左' : '右') + '侧绑绳没有把连接锁紧，\n只需重绑这处连接。',
      spacing: '这两档的步距不合适。\n移动标出的横档，\n让相邻步距接近脚印。',
    };
    this.text(messages[issue.kind], 1460, 609, 355, 23, '#9e3d2e');
    this.button(837, '修这一处，再试一次', () => {
      this.craft.repair(); this.resetLoad(); this.feedback = ''; this.refresh();
    }, 0x9e3d2e);
  }
  paintLoadProgress() {
    const g = this.graphics, target = this.pendingTarget || this.hoverTarget;
    if (!target) return;
    g.lineStyle(4, 0xffdfa0, 1).strokeCircle(target.x, target.y, 27);
    if (this.pendingTarget && !this.placingBag) {
      g.lineStyle(6, 0x80ceb0, 1).beginPath().arc(target.x, target.y, 29, -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * Math.min(1, this.dwell / 0.8), false).strokePath();
    }
  }
  update(delta, keys) {
    const c = this.craft, jd = key => Phaser.Input.Keyboard.JustDown(key);
    const dt = Math.min(delta, 50) / 1000;
    if (c.phase === 0 && this.selection != null && c.rungs[this.selection] != null) {
      let dy = 0; if (jd(keys.UP)) dy -= 5; if (jd(keys.DOWN)) dy += 5;
      if (dy) { c.placeRung(this.selection, c.rungs[this.selection] + dy); this.paintLadder(); this.save(); }
    }
    if (c.phase !== 2 || c.issue || !this.bag) return;
    if (jd(keys.SPACE)) this.placeBag(c.nextLoadTarget());
    if (jd(keys.ENTER) && !this.pendingTarget && !this.placingBag) {
      const target = c.nearestLoadTarget(this.bagPos.x, this.bagPos.y);
      if (target) this.placeBag(target);
    }
    if (this.draggingBag) return;
    if (this.placingBag) { this.updateStatus(); return; }
    let dx = 0, dy = 0;
    if (keys.LEFT.isDown) dx -= 260 * dt; if (keys.RIGHT.isDown) dx += 260 * dt;
    if (keys.UP.isDown) dy -= 260 * dt; if (keys.DOWN.isDown) dy += 260 * dt;
    if (dx || dy) {
      this.pendingTarget = null; this.dwell = 0; this.bagOnLadder = false;
      this.bagPos.x = LadderCraft.clamp(this.bagPos.x + dx, 490, 960);
      this.bagPos.y = LadderCraft.clamp(this.bagPos.y + dy, 380, 790);
      this.bag.setPosition(this.bagPos.x, this.bagPos.y); this.updateStatus(); return;
    }
    if (!this.pendingTarget) return;
    this.dwell += dt;
    this.bag.setPosition(this.pendingTarget.x, this.pendingTarget.y + Math.sin(Math.min(1, this.dwell / 0.8) * Math.PI) * 3);
    this.paintLadder(); this.paintLoadProgress(); this.updateStatus();
    if (this.dwell < 0.8) return;
    const target = this.pendingTarget;
    c.loadAt(target.row, target.side); this.pendingTarget = null; this.dwell = 0;
    this.bagPos = { x: target.x, y: target.y };
    if (c.issue) {
      const fraction = (target.x - 535) / 390;
      const extra = c.issue.kind === 'slip' ? (c.issue.side === 0 ? 1 - fraction : fraction) * 44 : 0;
      this.bagPos.y += extra; this.feedback = ''; this.refresh(); return;
    }
    this.save();
    if (c.phase === 3) { this.refresh(); return; }
    this.bag.setPosition(target.x, target.y);
    this.paintLadder(); this.updateStatus();
  }
  renderComplete() {
    this.text('四根横档的中间都承住了沙袋，没有歪斜或滑落。', 750, 272, 930, 26);
    this.createRungs(false); this.paintLadder();
    this.text('绳梯可以用了', 1460, 370, 355, 30, '#2e6e63');
    this.text('阿伊苏：这次稳了。\n艾德：照这个做法，\n再把另外两架准备好。', 1460, 464, 355, 25);
    this.text('三架绳梯准备好后，\n接着制作土陶小油灯。', 1460, 631, 355, 24);
    this.button(817, '收起绳梯，继续剧情', () => this.modal.close(true));
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { LadderCraft, LadderWorkshop };
