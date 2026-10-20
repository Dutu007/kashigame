// On-site repair: observe the bank, carry stones, seal joints and test a small flow.
const KAREZ_PATCH_STONES = [
  { key: 'UC_STONE_BASE', name: '底托石', source: -300, at: -25, y: 680, width: 220, height: 62 },
  { key: 'UC_STONE_WEDGE', name: '侧楔石', source: 300, at: -50, y: 668, width: 125, height: 61 },
  { key: 'UC_STONE_CAP', name: '压顶石', source: -450, at: 0, y: 642, width: 270, height: 49 },
];

class KarezPatchProgress {
  constructor(saved) {
    const data = saved && typeof saved === 'object' ? saved : {};
    this.observed = [0, 1, 2].map(i => data.observed?.[i] === true);
    this.slots = [0, 1, 2].map(i => data.slots?.[i] === i ? i : null);
    this.jointIndex = this.slots.every(v => v !== null) ? Math.max(0, Math.min(5, Math.floor(Number(data.jointIndex) || 0))) : 0;
    const ready = this.observed.every(Boolean) && this.slots.every(v => v !== null) && this.jointIndex === 5;
    this.trial = ready ? (data.v === 2 ? Math.max(0, Math.min(1, Number(data.trial) || 0)) : (data.phase >= 4 ? 1 : 0)) : 0;
    this.carried = null; // An unplaced stone remains on the bank after leaving/reloading.
    this.testing = false;
  }
  get phase() {
    if (!this.observed.every(Boolean)) return 'observe';
    if (this.slots.some(v => v === null)) return 'stones';
    if (this.jointIndex < 5) return 'joints';
    return this.trial < 1 ? 'flow' : 'complete';
  }
  get nextStone() { return this.slots.findIndex(v => v === null); }
  toJSON() {
    return { v: 2, observed: this.observed.slice(), slots: this.slots.slice(), jointIndex: this.jointIndex, trial: this.trial };
  }
  targets(cx) {
    if (this.phase === 'observe') return [
      { type: 'observe', index: 0, x: cx - 210, label: '查看迎水侧的冲刷痕', detail: '迎水侧冲刷较重，先把缺口底部托稳。' },
      { type: 'observe', index: 1, x: cx, label: '检查松动的渠边', detail: '渠边已经松动，底托石要放在坚实处。' },
      { type: 'observe', index: 2, x: cx + 210, label: '查看缺口下方的水位', detail: '先让石头互相卡紧，再用湿泥封住接缝。' },
    ].filter(t => !this.observed[t.index]);
    if (this.phase === 'stones') {
      const i = this.nextStone, stone = KAREZ_PATCH_STONES[i];
      return [{ type: this.carried === i ? 'place' : 'take', index: i,
        x: cx + (this.carried === i ? stone.at : stone.source),
        label: this.carried === i ? `放稳${stone.name}` : `搬起${stone.name}` }];
    }
    if (this.phase === 'joints') return [{ type: 'joint', index: this.jointIndex, x: cx - 112 + this.jointIndex * 56, label: '压实亮起的接缝' }];
    if (this.phase === 'flow') return [{ type: 'flow', x: cx + 210, label: '引入小股水，观察接缝' }];
    return [{ type: 'finish', x: cx, label: '确认修补完成' }];
  }
  act(target) {
    if (this.phase === 'observe' && target.type === 'observe' && Number.isInteger(target.index) && target.index >= 0 && target.index < 3 && !this.observed[target.index]) {
      this.observed[target.index] = true; return true;
    }
    const i = this.nextStone;
    if (this.phase === 'stones' && target.index === i) {
      if (target.type === 'take' && this.carried === null) { this.carried = i; return true; }
      if (target.type === 'place' && this.carried === i) { this.slots[i] = i; this.carried = null; return true; }
    }
    if (this.phase === 'joints' && target.type === 'joint' && target.index === this.jointIndex) {
      this.jointIndex++; return true;
    }
    if (this.phase === 'flow' && target.type === 'flow') { this.testing = true; return true; }
    return false;
  }
  updateTrial(delta, canFlow) {
    if (this.phase !== 'flow' || !this.testing || !canFlow) return false;
    const before = this.trial;
    this.trial = Math.min(1, before + Math.max(0, Math.min(50, delta)) / 2400);
    return this.trial !== before;
  }
}

if (typeof module !== 'undefined') module.exports = { KarezPatchProgress, KAREZ_PATCH_STONES };

class KarezPatchRepair {
  constructor(scene) {
    this.scene = scene;
    this.store = G.state.uc;
    this.model = new KarezPatchProgress(this.store.patch);
    this.cx = scene.seg.patchX;
    this.active = false;
    this.disposed = false;
    this.root = scene.add.container(0, 0).setDepth(8);
    this.stones = KAREZ_PATCH_STONES.map(s => {
      const img = scene.add.image(0, 0, s.key, 'repair').setOrigin(0.5, 1);
      this.root.add(img); return img;
    });
    this.mortar = scene.add.graphics().setDepth(9);
    this.guide = scene.add.graphics().setDepth(55);
    this.water = scene.add.graphics().setDepth(9);
    this.carry = scene.add.image(0, 0, 'UC_STONE_BASE', 'repair').setDepth(11).setVisible(false);
    this.lastSavedTrial = this.model.trial;
    scene.events.once('shutdown', () => this.dispose());
    this.render(true);
  }
  begin() {
    this.active = true;
    if (!this.hud) {
      const ui = this.scene.scene.get('UI');
      this.hud = ui.add.container(0, 0).setDepth(290);
      const panel = skinFrame(ui, 'card', 390, 868, 1140, 170, { scale: 0.055 });
      this.heading = ui.add.text(454, 890, '', { fontFamily: FONT, fontSize: '26px', color: '#4a2f1a', resolution: 2 });
      this.detail = ui.add.text(454, 932, '', { fontFamily: FONT, fontSize: '21px', color: '#6b472a', resolution: 2,
        wordWrap: { width: 990, useAdvancedWrap: true } });
      this.controls = ui.add.text(1470, 1008, 'A/D 靠近目标 · E 操作 · Esc 暂停', {
        fontFamily: FONT, fontSize: '18px', color: '#7a5a3a', resolution: 2,
      }).setOrigin(1, 0.5);
      this.bar = ui.add.graphics();
      this.hud.add([panel, this.heading, this.detail, this.controls, this.bar]);
    }
    this.save(); this.render(true);
  }
  end() {
    this.active = false;
    this.model.carried = null;
    this.model.testing = false;
    this.save(); this.render(true);
  }
  save() {
    if (this.disposed || this.store.done || G.state.uc !== this.store) return;
    this.store.patch = this.model.toJSON();
    SaveService.save();
    this.lastSavedTrial = this.model.trial;
  }
  target() {
    const x = this.scene.player.x;
    return this.model.targets(this.cx).reduce((best, t) => !best || Math.abs(t.x - x) < Math.abs(best.x - x) ? t : best, null);
  }
  prompt() {
    const target = this.target();
    if (Math.abs(target.x - this.scene.player.x) > 95) return `靠近亮起处，${target.label}`;
    if (target.type === 'flow') return `按住 E：小股试水（${Math.round(this.model.trial * 100)}%）`;
    return `E：${target.label}`;
  }
  goalText() {
    const m = this.model;
    if (m.phase === 'observe') return `检查缺口附近的水痕与渠边（${m.observed.filter(Boolean).length}/3）`;
    if (m.phase === 'stones') return `${m.carried === null ? '到岸边搬取' : '在缺口放稳'}${KAREZ_PATCH_STONES[m.nextStone].name}`;
    if (m.phase === 'joints') return `沿水流方向压实接缝（${m.jointIndex}/5）`;
    return m.phase === 'flow' ? '引入小股水，观察新接缝是否稳固' : '确认修补结果，再到下游复查';
  }
  interact() {
    const t = this.target();
    if (Math.abs(t.x - this.scene.player.x) > 95) {
      this.showFeedback(`再靠近亮起处，${t.label}`); return;
    }
    if (t.type === 'finish') { this.scene.finishPatch(); return; }
    if (!this.model.act(t)) return;
    this.feedback = '';
    if (t.type === 'observe') this.showFeedback(t.detail);
    if (t.type === 'place' || t.type === 'joint') {
      this.scene.dustFx.explode(8, t.x, this.scene.seg.groundY(t.x) - 16);
    }
    this.save(); this.render(true);
    setGoal(this.goalText());
  }
  showFeedback(text) {
    this.feedback = text;
    this.feedbackUntil = this.scene.time.now + 2200;
    this.render(true);
  }
  update(delta, allowed) {
    const s = this.scene, m = this.model;
    if (this.active && m.phase === 'flow') {
      const moving = s.keys.A.isDown || s.keys.D.isDown || s.keys.LEFT.isDown || s.keys.RIGHT.isDown;
      const canFlow = allowed && !moving && G.state.lampOn && s.keys.E.isDown && Math.abs(s.player.x - (this.cx + 210)) <= 95;
      if (m.updateTrial(delta, canFlow)) {
        if (m.trial - this.lastSavedTrial >= 0.1 || m.phase === 'complete') this.save();
        if (m.phase === 'complete') {
          this.showFeedback('小股水流已经平稳，回缺口处确认修补结果。');
          setGoal(this.goalText());
        }
      }
    }
    this.render();
  }
  render(force = false) {
    if (this.disposed) return;
    const m = this.model, s = this.scene, cx = this.cx;
    this.carry.setPosition(s.player.x - s.player.facing * 45, s.player.y - 76);
    const key = JSON.stringify([m.toJSON(), m.carried, this.active, Math.floor(s.time.now / 90)]);
    if (!force && key === this.renderKey) return;
    this.renderKey = key;
    KAREZ_PATCH_STONES.forEach((stone, i) => {
      const placed = m.slots[i] !== null;
      const sourceX = cx + stone.source;
      const sourceWidth = i === 1 ? 88 : 118;
      this.stones[i].setVisible(placed || this.active && m.carried !== i)
        .setPosition(placed ? cx + stone.at : sourceX, placed ? stone.y : s.seg.groundY(sourceX) + 8)
        .setDisplaySize(placed ? stone.width : sourceWidth, placed ? stone.height : sourceWidth * this.stones[i].frame.height / this.stones[i].frame.width);
    });
    this.carry.setVisible(this.active && m.carried !== null);
    if (this.active && m.carried !== null) {
      this.carry.setTexture(KAREZ_PATCH_STONES[m.carried].key, 'repair')
        .setDisplaySize(76, 76 * this.carry.frame.height / this.carry.frame.width);
    }
    this.mortar.clear();
    for (let i = 0; i < m.jointIndex; i++) {
      const x = cx - 112 + i * 56;
      this.mortar.lineStyle(5, 0x9c794e, 1).strokePoints([{x,y:599},{x:x+3,y:609},{x:x+1,y:617},{x:x+6,y:625}], false);
      this.mortar.lineStyle(1, 0xd5ba85, 0.65).lineBetween(x - 1, 601, x + 3, 621);
    }
    this.water.clear();
    if (m.trial > 0) {
      for (let row = 0; row < 3; row++) {
        const start = cx - 180 + ((s.time.now / 24 + row * 70) % 360);
        this.water.lineStyle(3, 0x79c8bd, 0.25 + m.trial * 0.4)
          .lineBetween(start, 701 + row * 13, Math.min(cx + 210, start + 60 + m.trial * 30), 700 + row * 13);
      }
    }
    this.guide.clear().setVisible(this.active);
    if (this.active) {
      for (const t of m.targets(cx)) {
        const y = t.type === 'joint' ? 600 : s.seg.groundY(t.x) - 4;
        const pulse = 0.65 + Math.sin(s.time.now / 240) * 0.15;
        this.guide.lineStyle(3, 0xe1bc69, pulse).strokeEllipse(t.x, y, t.type === 'place' ? 130 : 72, 24);
        this.guide.fillStyle(0xe1bc69, pulse).fillTriangle(t.x, y - 42, t.x - 7, y - 53, t.x + 7, y - 53);
      }
    }
    if (this.hud) {
      this.hud.setVisible(this.active && !G.ui.dialogue.isOpen && !KarezTransitions.active);
      const heading = { observe: '观察缺口', stones: '搬石落位', joints: '压实接缝', flow: '小股试水', complete: '修补已稳固' }[m.phase];
      this.heading.setText('现场修渠 · ' + heading);
      const detail = { observe: '沿亮点查看迎水侧、松动的渠边和下方水位，先看清再动手。',
        stones: m.carried === null ? '先垫底，再卡住侧面，最后压顶；走近岸边石料按 E 搬起。' : `已搬起${KAREZ_PATCH_STONES[m.carried].name}，走到缺口亮圈按 E 落稳。`,
        joints: '沿水流方向逐处压实湿泥，把石头之间的接缝封牢。',
        flow: '靠近亮起的水痕，站稳并按住 E，观察接缝能否保持稳定。',
        complete: '接缝没有松动，回缺口亮圈按 E 确认，之后去下游复查。' }[m.phase];
      this.detail.setText(this.feedbackUntil > s.time.now && this.feedback ? this.feedback : detail);
      this.bar.clear().fillStyle(0x7a5a3a, 0.2).fillRoundedRect(454, 998, 350, 10, 5);
      const progress = { observe: m.observed.filter(Boolean).length / 3 * 0.2, stones: 0.2 + m.slots.filter(v => v !== null).length / 3 * 0.35,
        joints: 0.55 + m.jointIndex / 5 * 0.25, flow: 0.8 + m.trial * 0.2, complete: 1 }[m.phase];
      if (progress > 0) this.bar.fillStyle(0x2e6e63, 1).fillRoundedRect(454, 998, 350 * progress, 10, 5);
    }
  }
  dispose() {
    if (this.disposed) return;
    this.save(); this.disposed = true;
    for (const obj of [this.root, this.mortar, this.guide, this.water, this.carry, this.hud]) obj?.destroy();
  }
}
