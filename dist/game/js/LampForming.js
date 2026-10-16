// Fixed-path wheel throwing. All speeds are in logical canvas units per second.
class LampForming {
  constructor(saved = {}) {
    this.progress = LampForming.clamp(Number(saved.progress) || 0);
    this.warp = LampForming.clamp(Number(saved.warp) || 0);
    this.speed = 0;
    this.angle = 0;
    this.previous = null;
    this.message = '按住 E 加速，松开减速；从亮圈开始慢慢拖动。';
  }
  static clamp(n, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, n)); }
  // 轨道为三次贝塞尔：起点在盘面内、终点收到收肩位置，整条弧线都落在木转盘上，
  // 拖动行程比最初的 S 形短约四分之一，玩家手腕不用大幅平移。
  static point(t) {
    const u = 1 - t;
    return {
      x: u * u * u * 869.01 + 3 * u * u * t * 973.67 + 3 * u * t * t * 920.23 + t * t * t * 846.75,
      y: u * u * u * 731.78 + 3 * u * u * t * 677.23 + 3 * u * t * t * 568.11 + t * t * t * 503.54,
    };
  }
  ready() { return this.progress >= 1 && this.warp < 0.12; }
  toJSON() { return { progress: this.progress, warp: this.warp }; }
  release() { this.previous = null; }
  // 求手位在轨道上的最近点：先粗采样再二分细化。
  // 轨道改短后不能再按手位高度反推 t（旧写法写死了 340px 的纵向跨度），
  // 而且这里本来就得量“手到轨道的垂直距离”，投影才是与形状无关的正确做法。
  static project(x, y) {
    let t = 0, best = Infinity;
    for (let i = 0; i <= 64; i++) {
      const q = LampForming.point(i / 64);
      const d = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y);
      if (d < best) { best = d; t = i / 64; }
    }
    let lo = Math.max(0, t - 1 / 64), hi = Math.min(1, t + 1 / 64);
    for (let i = 0; i < 12; i++) {
      const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3;
      const qa = LampForming.point(a), qb = LampForming.point(b);
      const da = (qa.x - x) * (qa.x - x) + (qa.y - y) * (qa.y - y);
      const db = (qb.x - x) * (qb.x - x) + (qb.y - y) * (qb.y - y);
      if (da < db) hi = b; else lo = a;
    }
    return (lo + hi) / 2;
  }
  step(dt, accelerating, hand) {
    dt = LampForming.clamp(dt, 0, 0.05);
    if (!dt || this.ready()) return;
    this.speed = LampForming.clamp(this.speed + (accelerating ? 0.28 : -0.20) * dt);
    this.angle += this.speed * dt * 3.5;
    if (!hand) {
      this.release();
      this.message = this.speed > 0.78 ? '转得太快了，松开 E 减速。' : '按住 E 转盘；按住亮圈，沿轨道缓缓向上拖。';
      if (this.speed > 0.78) this.warp = Math.min(0.65, this.warp + dt * 0.13);
      return;
    }
    const prev = this.previous || hand;
    this.previous = { x: hand.x, y: hand.y };
    const velocity = Math.hypot(hand.x - prev.x, hand.y - prev.y) / dt;
    const t = LampForming.project(hand.x, hand.y);
    const track = LampForming.point(t);
    const offset = Math.hypot(hand.x - track.x, hand.y - track.y);
    if (this.speed > 0.78 || offset > 30 || velocity > 125 || t > this.progress + 0.10) {
      if (this.speed > 0.08) this.warp = Math.min(0.65, this.warp + dt * 0.32);
      this.message = this.speed > 0.78 ? '转得太快了，松开 E。'
        : offset > 30 ? '手偏离轨道了，慢慢移回亮圈。'
        : '拖得太快了，回到亮圈再慢慢来。';
      return;
    }
    if (this.speed < 0.08) { this.message = '转盘停了，按住 E。'; return; }
    // Gentle contact on the current section repairs distortion, including at the endpoint.
    if (Math.abs(t - this.progress) < 0.10) this.warp = Math.max(0, this.warp - dt * 0.16);
    const forward = Math.max(0, t - this.progress);
    this.progress = Math.min(1, this.progress + Math.min(forward, dt * 0.075 * Math.min(1, this.speed / 0.42)));
    if (this.progress > 0.998) this.progress = 1;
    this.message = this.warp > 0.12 ? '保持轻缓，歪斜正在修复。'
      : this.speed < 0.32 ? '转速偏慢，按住 E 稍稍加速。' : '手势很稳，沿轨道继续。';
  }
}

class LampFormingView {
  static prepareFrames(scene) {
    if (scene.textures.exists('POTTERY_FORMING')) return;
    const source = scene.textures.get('POTTERY_FORMING_SOURCE').getSourceImage();
    const scratch = document.createElement('canvas');
    const ctx = scratch.getContext('2d', { willReadFrequently: true });
    const cells = [];
    // Read equal grid cells, then align the clay's center and contact baseline.
    // Ignore isolated translucent specks when measuring the silhouette.
    for (let i = 0; i < 8; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const x = Math.round(col * source.width / 4), y = Math.round(row * source.height / 2);
      const width = Math.round((col + 1) * source.width / 4) - x;
      const height = Math.round((row + 1) * source.height / 2) - y;
      scratch.width = width; scratch.height = height;
      ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height).data;
      const rows = new Uint16Array(height), cols = new Uint16Array(width);
      for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
        if (data[(py * width + px) * 4 + 3] >= 96) { rows[py]++; cols[px]++; }
      }
      let left = 0, right = width - 1, top = 0, bottom = height - 1;
      while (left < right && cols[left] < 8) left++;
      while (right > left && cols[right] < 8) right--;
      while (top < bottom && rows[top] < 8) top++;
      while (bottom > top && rows[bottom] < 8) bottom--;
      cells.push({ x: x + left, y: y + top, w: right - left + 1, h: bottom - top + 1 });
    }
    const scale = 440 / Math.max(...cells.map(c => c.w));
    const texture = scene.textures.createCanvas('POTTERY_FORMING', 512 * 8, 512);
    cells.forEach((c, i) => {
      const w = c.w * scale, h = c.h * scale;
      texture.context.drawImage(source, c.x, c.y, c.w, c.h, i * 512 + (512 - w) / 2, 430 - h, w, h);
      texture.add(i, 0, i * 512, 0, 512, 512);
    });
    texture.refresh();
  }
  constructor(workshop, saved) {
    this.workshop = workshop;
    this.scene = workshop.scene;
    LampFormingView.prepareFrames(this.scene);
    this.model = new LampForming(saved);
    this.hand = null;
    this.pointerId = null;
    this.eKey = this.scene.input.keyboard.addKey('E');
    this.onBlur = () => { this.hand = null; this.pointerId = null; this.model.speed = 0; this.model.release(); this.eKey.reset(); };
    this.scene.game.events.on('blur', this.onBlur);
  }
  dispose() { this.scene.game.events.off('blur', this.onBlur); this.onBlur(); }
  down(pointer) {
    if (this.model.ready()) return;
    const p = LampForming.point(this.model.progress);
    if (Math.hypot(pointer.x - p.x, pointer.y - p.y) > 42) return;
    this.pointerId = pointer.id;
    this.hand = { x: pointer.x, y: pointer.y };
    this.model.release();
  }
  move(pointer) { if (this.pointerId === pointer.id) this.hand = { x: pointer.x, y: pointer.y }; }
  up(pointer) { if (!pointer || pointer.id === this.pointerId) { this.hand = null; this.pointerId = null; this.model.release(); } }
  render() {
    const w = this.workshop, add = o => w.add(o);
    this.onBlur();
    w.modal.titleT.setText('转盘成型 · 油灯主体');
    w.modal.stepT.setText('揉好的泥 → 扁圆灯腹 → 收肩圆口');
    w.modal.tipT.setText('Esc：保存并退出');
    add(this.scene.add.image(750, 600, 'POTTERY_TABLE').setDisplaySize(960, 568));
    this.wheel = add(this.scene.add.graphics());
    // A separate projected wheel rotates beneath the clay; the pottery never tumbles in screen space.
    this.clayA = add(this.scene.add.image(750, 572, 'POTTERY_FORMING', 0).setDisplaySize(440, 440));
    this.clayB = add(this.scene.add.image(750, 572, 'POTTERY_FORMING', 1).setDisplaySize(440, 440));
    this.track = add(this.scene.add.graphics());
    w.text('按住 E 加速 · 松开 E 减速', 750, 269, 920, 24);
    w.text('转盘速度', 1460, 350, 355, 27);
    this.gauge = add(this.scene.add.graphics());
    w.text('慢        合适        过快', 1460, 426, 355, 20);
    this.stateText = w.modal.label('', 1300, 480, { wrap: 320, fontSize: '24px', color: '#5f3f28' });
    this.stateText.setLineSpacing(12);
    this.helpText = w.modal.label('', 1300, 600, { wrap: 320, fontSize: '24px', color: '#2e6e63' });
    this.helpText.setLineSpacing(12);
    const beforeButton = w.modal.body.length;
    this.finishButton = w.button(827, '主体成型，开始拼接', () => { if (this.model.ready()) w.beginAssembly(); });
    this.finishVisuals = w.modal.body.list.slice(beforeButton);
    w.button(895, '重新成型', () => {
      this.model = new LampForming(); w.save(); w.modal.render();
    }, 0x9e3d2e);
    this.draw();
  }
  update(dt) {
    this.model.step(dt, this.eKey.isDown, this.hand);
    this.draw();
  }
  draw() {
    const m = this.model;
    const g = this.wheel.clear();
    g.fillStyle(0x80532e, 1).fillEllipse(750, 737, 485, 130);
    g.lineStyle(3, 0xc09356, 1).strokeEllipse(750, 730, 485, 122);
    for (let i = 0; i < 8; i++) {
      const a = m.angle + i * Math.PI / 4;
      g.lineStyle(2, 0xcda774, 0.5).lineBetween(750 + Math.cos(a) * 170, 730 + Math.sin(a) * 42, 750 + Math.cos(a) * 235, 730 + Math.sin(a) * 58);
    }
    const frame = m.progress * 7, base = Math.min(7, Math.floor(frame)), blend = frame - base;
    const wobble = Math.sin(m.angle * 2) * m.warp;
    this.clayA.setFrame(base).setAlpha(1 - blend);
    this.clayB.setFrame(Math.min(7, base + 1)).setAlpha(blend);
    for (const clay of [this.clayA, this.clayB]) {
      clay.setDisplaySize(440 * (1 + m.warp * 0.1), 440 * (1 - m.warp * 0.06));
      clay.setX(750 + wobble * 16).setRotation(wobble * 0.04);
    }
    const t = this.track.clear();
    if (!m.ready()) {
      for (let i = 0; i < 60; i++) {
        const a = LampForming.point(i / 60), b = LampForming.point((i + 1) / 60);
        t.lineStyle(16, 0xf7ecd4, 0.48).lineBetween(a.x, a.y, b.x, b.y);
        t.lineStyle(3, i / 60 < m.progress ? 0x2e8874 : 0xb89048, 0.9).lineBetween(a.x, a.y, b.x, b.y);
      }
      const p = LampForming.point(m.progress);
      t.lineStyle(4, 0xffd774, 1).strokeCircle(p.x, p.y, 20);
      t.fillStyle(0xffd774, 1).fillTriangle(p.x - 6, p.y - 26, p.x + 6, p.y - 26, p.x, p.y - 35);
      if (this.hand) {
        t.fillStyle(0xf9dfb6, 1).fillCircle(this.hand.x, this.hand.y, 10);
        t.lineStyle(2, 0x63452b, 1).strokeCircle(this.hand.x, this.hand.y, 10);
      }
    }
    const gauge = this.gauge.clear();
    gauge.fillStyle(0xd2c1a5, 1).fillRoundedRect(1300, 395, 320, 20, 6);
    gauge.fillStyle(0x479b82, 1).fillRect(1300 + 320 * 0.32, 395, 320 * 0.46, 20);
    gauge.fillStyle(0xb9543c, 1).fillRect(1300 + 320 * 0.78, 395, 320 * 0.22, 20);
    gauge.fillStyle(0x493523, 1).fillRect(1298 + 320 * m.speed, 388, 4, 34);
    this.stateText.setText('成型 ' + Math.round(m.progress * 100) + '%\n' + (m.warp > 0.12 ? '陶坯有些歪斜，可轻缓修复' : '陶坯形状稳定'));
    this.helpText.setText(m.ready() ? '主体成型了！\n灯嘴与把手留待后续工序。' : m.message);
    this.finishButton.input.enabled = m.ready();
    for (const visual of this.finishVisuals) visual.setAlpha(m.ready() ? 1 : 0.4);
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { LampForming };
