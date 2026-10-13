// 游戏化守窑：45 秒体验代表实际的晾干、数小时烧制及自然冷却。
class LampFiring {
  static durations = [4, 11, 23, 7];
  static names = ['晾干入窑', '小火预热', '升温烧制', '停火冷却', '烧制完成'];
  constructor(saved = {}) {
    const finite = (v, fallback, lo, hi) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;
    this.elapsed = finite(saved.elapsed, 0, 0, 45);
    this.heat = finite(saved.heat, 0, 0, 100);
    this.fuel = finite(saved.fuel, 0, 0, 1);
    this.started = !!saved.started || this.elapsed > 0;
    this.cooldown = finite(saved.cooldown, 0, 0, 0.75);
    this.loads = finite(saved.loads, 0, 0, 1000);
    this.hintState = ['low', 'good', 'high'].includes(saved.hintState) ? saved.hintState : 'low';
    this.hintAge = finite(saved.hintAge, 0, 0, 100);
    this.pending = null; this.pendingAge = 0;
  }
  get phase() { return this.elapsed < 4 ? 0 : this.elapsed < 15 ? 1 : this.elapsed < 38 ? 2 : this.elapsed < 45 ? 3 : 4; }
  ready() { return this.phase === 4; }
  get activeFire() { return this.started && (this.phase === 1 || this.phase === 2); }
  get band() { return this.phase === 1 ? [25, 48] : [35, 75]; }
  start() { this.started = true; }
  addFuel() {
    if (!this.activeFire || this.cooldown > 0 || this.fuel > 0.9) return false;
    this.fuel = Math.min(1, this.fuel + 0.23); this.cooldown = 0.75; this.loads++; return true;
  }
  updateHint(dt) {
    const [lo, hi] = this.band;
    let next = this.hintState;
    if (next === 'low') { if (this.heat >= lo + 7) next = this.heat > hi ? 'high' : 'good'; }
    else if (next === 'high') { if (this.heat <= hi - 7) next = this.heat < lo ? 'low' : 'good'; }
    else if (this.heat < lo) next = 'low';
    else if (this.heat > hi) next = 'high';
    this.hintAge += dt;
    if (next === this.hintState) { this.pending = null; this.pendingAge = 0; return; }
    if (next !== this.pending) { this.pending = next; this.pendingAge = 0; }
    this.pendingAge += dt;
    if (this.pendingAge >= 0.6 && this.hintAge >= 1.5) {
      this.hintState = next; this.hintAge = 0; this.pending = null; this.pendingAge = 0;
    }
  }
  update(dt) {
    if (!this.started || this.ready() || !Number.isFinite(dt)) return;
    dt = Math.max(0, Math.min(0.25, dt));
    const old = this.phase;
    this.elapsed = Math.min(45, this.elapsed + dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (old !== this.phase) {
      this.pending = null; this.pendingAge = 0; this.hintAge = 0;
      this.hintState = this.heat < this.band[0] ? 'low' : this.heat > this.band[1] ? 'high' : 'good';
      if (this.phase === 1) this.fuel = 0.35;
      if (this.phase === 3) this.fuel = 0;
    }
    if (this.activeFire) {
      this.fuel = Math.max(0, this.fuel - dt * 0.055);
      const target = this.fuel * 100;
      this.heat += (target - this.heat) * (1 - Math.exp(-dt * 0.6));
      this.updateHint(dt);
    } else if (this.phase >= 3) this.heat *= Math.exp(-dt * 0.55);
    if (this.ready()) { this.heat = 0; this.fuel = 0; }
  }
  toJSON() {
    return { v: 1, elapsed: this.elapsed, heat: this.heat, fuel: this.fuel, started: this.started,
      cooldown: this.cooldown, loads: this.loads, hintState: this.hintState, hintAge: this.hintAge };
  }
}

class LampFiringView {
  constructor(workshop, saved) {
    this.w = workshop; this.scene = workshop.scene; this.model = new LampFiring(saved);
    this.drag = null; this.clock = 0; this.flash = 0;
    this.onKey = e => { if (this.w.firingActive && !this.w.closed && !e.repeat) { e.preventDefault(); this.feed(); } };
    this.onBlur = () => { this.drag = null; };
    this.scene.input.keyboard.on('keydown-SPACE', this.onKey);
    this.scene.game.events.on('blur', this.onBlur);
  }
  dispose() {
    this.scene.input.keyboard.off('keydown-SPACE', this.onKey);
    this.scene.game.events.off('blur', this.onBlur);
    if (this.textureKey) this.scene.textures.remove(this.textureKey);
  }
  feed() { if (this.model.addFuel()) { this.flash = 0.65; this.w.save(); this.paint(); } }
  down(p) {
    if (!this.model.activeFire || p.x < 1070 || p.x > 1230 || p.y < 690 || p.y > 880) return;
    this.drag = { id: p.id, x: p.x, y: p.y, startX: p.x, startY: p.y };
  }
  move(p) { if (this.drag?.id === p.id) { this.drag.x = p.x; this.drag.y = p.y; } }
  up(p) {
    if (!this.drag || this.drag.id !== p.id) return;
    const d = this.drag; this.drag = null;
    const click = Math.hypot(p.x - d.startX, p.y - d.startY) < 20;
    if (click || (p.x >= 610 && p.x <= 910 && p.y >= 670 && p.y <= 835)) this.feed();
  }
  render() {
    const w = this.w; this.drag = null;
    if (this.textureKey) this.scene.textures.remove(this.textureKey);
    this.textureKey = w.canvasKey + '-kiln';
    this.texture = this.scene.textures.createCanvas(this.textureKey, 960, 568);
    this.background = this.scene.textures.get('POTTERY_KILN').getSourceImage();
    w.modal.titleT.setText('守窑火 · 土陶油灯烧制');
    w.modal.tipT.setText('Esc：保存并退出');
    w.add(this.scene.add.image(750, 600, this.textureKey));
    this.top = w.text('', 750, 270, 930, 22);
    this.phaseLabel = w.text('', 1460, 343, 355, 28, '#2e6e63');
    this.message = w.modal.label('', 1300, 415, { wrap: 320, fontSize: '24px', color: '#5f3f28' }).setLineSpacing(12);
    this.meter = w.add(this.scene.add.graphics());
    this.heatLabel = w.modal.label('火候', 1300, 558, { fontSize: '22px' });
    this.progressLabel = w.modal.label('', 1300, 689, { fontSize: '21px' });
    w.text('点击柴堆 / 拖柴入窑 / 空格添柴', 750, 902, 950, 21);
    const before = w.modal.body.length;
    this.button = w.button(815, '开始烧制', () => {
      if (!this.model.started) { this.model.start(); w.save(); }
      else if (this.model.ready()) w.modal.close(true);
      else this.feed();
    });
    this.buttonObjects = w.modal.body.list.slice(before);
    this.buttonText = this.buttonObjects.find(o => o.type === 'Text');
    w.text('晾干、烧制与冷却采用时间转场', 1460, 873, 355, 18, '#805728');
    this.paint();
  }
  update(dt) {
    const phase = this.model.phase;
    this.model.update(dt); this.clock += dt; this.flash = Math.max(0, this.flash - dt);
    if (phase !== this.model.phase) { this.drag = null; this.w.save(); }
    this.paint();
  }
  paint() {
    if (!this.texture || this.w.closed) return;
    const m = this.model, ctx = this.texture.context;
    ctx.clearRect(0, 0, 960, 568); ctx.drawImage(this.background, 0, 0, 960, 568);
    // 火焰裁在素材真实火口内，避免把窑壁点燃。坐标相对 960×568 工作区。
    const power = m.activeFire ? Math.min(1, m.fuel * 0.9 + 0.1) : m.phase === 3 ? m.heat / 100 : 0;
    // 原有绘画素材带少量红炭；冷窑和冷却时将炭光自然压暗。
    const shade = ctx.createRadialGradient(480, 458, 30, 480, 458, 130);
    shade.addColorStop(0, `rgba(40,24,17,${0.92 * (1 - power)})`);
    shade.addColorStop(1, 'rgba(40,24,17,0)');
    ctx.fillStyle = shade; ctx.fillRect(345, 362, 278, 145);
    if (power > 0.005) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(349, 503); ctx.lineTo(349, 429);
      ctx.quadraticCurveTo(365, 365, 485, 363); ctx.quadraticCurveTo(604, 369, 619, 437);
      ctx.lineTo(619, 503); ctx.closePath(); ctx.clip();
      const glow = ctx.createRadialGradient(485, 490, 3, 485, 477, 155);
      glow.addColorStop(0, `rgba(255,105,21,${power * 0.65})`); glow.addColorStop(1, 'rgba(230,64,10,0)');
      ctx.fillStyle = glow; ctx.fillRect(340, 360, 290, 150);
      for (let i = 0; i < 8; i++) {
        const x = 380 + i * 30, h = (32 + 65 * power) * (0.75 + Math.sin(this.clock * 7 + i * 2) * 0.2);
        const sway = Math.sin(this.clock * 4 + i) * 10;
        if (m.activeFire) {
          const fire = ctx.createLinearGradient(0, 492, 0, 492 - h);
          fire.addColorStop(0, '#ffcb57'); fire.addColorStop(0.45, '#ef7425'); fire.addColorStop(1, 'rgba(211,52,10,0)');
          ctx.fillStyle = fire; ctx.beginPath(); ctx.moveTo(x - 13, 492);
          ctx.bezierCurveTo(x - 25, 465, x + sway + 15, 492 - h * 0.6, x + sway, 492 - h);
          ctx.bezierCurveTo(x + sway + 4, 492 - h * 0.45, x + 27, 478, x + 13, 492); ctx.fill();
        }
        ctx.fillStyle = `rgba(255,${80 + i * 13},25,${power})`; ctx.fillRect(x - 8, 489 + (i % 2) * 4, 15, 4);
      }
      ctx.restore();
      // 火口上方少量烟气，随火势缓动。
      for (let i = 0; i < 5; i++) {
        const age = (this.clock * 0.22 + i / 5) % 1;
        ctx.fillStyle = `rgba(82,73,61,${(1 - age) * power * 0.10})`;
        ctx.beginPath(); ctx.ellipse(480 + Math.sin(age * 5 + i) * 28, 376 - age * 48, 12 + age * 15, 9 + age * 9, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (this.drag) {
      ctx.save(); ctx.translate(this.drag.x - 270, this.drag.y - 316); ctx.rotate(-0.3);
      ctx.fillStyle = '#654329'; ctx.fillRect(-40, -8, 80, 16); ctx.fillStyle = '#b28a53'; ctx.fillRect(-39, -6, 75, 4); ctx.restore();
    }
    if (m.phase === 0 || m.phase === 3 || m.ready()) {
      ctx.fillStyle = 'rgba(30,22,15,0.55)'; ctx.fillRect(0, 480, 960, 88);
      ctx.fillStyle = '#f5e6c7'; ctx.font = '24px Microsoft YaHei'; ctx.textAlign = 'center';
      ctx.fillText(m.phase === 0 ? '晾干之后 · 陶坯入窑' : m.phase === 3 ? '停止添柴 · 数小时后，窑体自然冷却' : '窑火已熄 · 可以开窑取灯', 480, 529);
    }
    this.texture.refresh();
    const names = LampFiring.names;
    this.w.modal.stepT.setText('晾干入窑 → 小火预热 → 升温烧制 → 冷却出窑');
    this.phaseLabel.setText(names[m.phase]);
    this.top.setText(!m.started ? '陶坯拼好了，接下来守住窑火。' : m.phase === 0 ? '先让陶坯充分晾干，再装入窑中。'
      : m.phase === 3 ? '烧制结束，停止添柴，等待窑体自然冷却。' : m.ready() ? '烧制完成，收好油灯继续前行。' : '少量添柴，观察火势；火候上升会稍有延迟。');
    const hints = { low: '火还小，再添些柴。', good: '火候正好，让它稳稳烧一会儿。', high: '先别添柴，等火势缓下来。' };
    this.message.setText(!m.started ? '准备好后开始。\n全程约 45 秒。' : m.activeFire ? hints[m.hintState]
      : m.phase === 0 ? '时间流逝……\n陶坯晾干，准备起火。' : m.phase === 3 ? '余烬渐暗。\n冷却完成后再开窑。' : '土陶油灯烧好了。\n可以开窑取灯。');
    const g = this.meter.clear();
    g.fillStyle(0xc9b795).fillRoundedRect(1300, 606, 320, 22, 6);
    if (m.activeFire) { const [lo, hi] = m.band; g.fillStyle(0x689480, 0.7).fillRect(1300 + lo * 3.2, 606, (hi - lo) * 3.2, 22); }
    g.fillStyle(0x9e3d2e).fillRect(1300 + Math.min(99, m.heat) * 3.2, 600, 4, 34);
    g.fillStyle(0xc9b795).fillRoundedRect(1300, 732, 320, 12, 5);
    if (m.elapsed > 0) g.fillStyle(0x2e6e63).fillRoundedRect(1300, 732, 320 * m.elapsed / 45, 12, 5);
    this.progressLabel.setText(`烧制进程　${Math.floor(m.elapsed)} / 45 秒`);
    this.buttonText.setText(!m.started ? '开始烧制' : m.ready() ? '开窑取灯，继续剧情' : m.activeFire ? (this.flash > 0 ? '柴已添入' : '添一份柴 · 空格') : m.phase === 0 ? '陶坯晾干中…' : '等待自然冷却…');
    const enabled = !m.started || m.ready() || (m.activeFire && m.cooldown <= 0 && m.fuel <= 0.9);
    this.button.input.enabled = enabled;
    this.buttonObjects.forEach(o => o.setAlpha(enabled ? 1 : 0.55));
  }
}
if (typeof module !== 'undefined' && module.exports) module.exports = { LampFiring, LampFiringView };
