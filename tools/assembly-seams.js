// 接缝区域坐标相对零件素材左上角，跟随零件旋转与翻转。
class AssemblySeamTuner {
  constructor(layout, changed) {
    this.layout = layout; this.changed = changed; this.selected = 0;
    this.defaults = LAMP_ASSEMBLY_LAYOUT.seams.regions;
    this.regions = structuredClone(this.defaults);
    this.limits = { x: [-1, 2], y: [-1, 2], rx: [0.001, 20], ry: [0.001, 20], blur: [0, 20], opacity: [0, 1], feather: [0.01, 1], edgeStrength: [0, 1], edgeFeather: [0.01, 1] };
    this.method = 'feather';
    this.colors = structuredClone(LAMP_ASSEMBLY_LAYOUT.seams.colors);
    try {
      const stored = JSON.parse(localStorage.getItem('twc_lamp_fusion_confirmed_20261013'));
      const saved = stored?.regions;
      this.savedEnabled = stored?.enabled;
      this.savedColorEnabled = stored?.colorEnabled;
      if (['feather', 'blur', 'none'].includes(stored?.method)) this.method = stored.method;
      for (const part of ['spout', 'handle']) for (const [field, lo, hi] of [['brightness', 0.3, 1.5], ['saturation', 0, 2]]) {
        const value = stored?.colors?.[part]?.[field];
        if (Number.isFinite(value)) this.colors[part][field] = Math.max(lo, Math.min(hi, value));
      }
      this.regions.forEach((r, i) => Object.entries(this.limits).forEach(([k, [lo, hi]]) => {
        if (Number.isFinite(saved?.[i]?.[k])) r[k] = Math.max(lo, Math.min(hi, saved[i][k]));
      }));
    } catch (_) { /* 保留默认值。 */ }
    this.$ = id => document.getElementById('seam-' + id);
    if (typeof this.savedEnabled === 'boolean') this.$('preview').checked = this.savedEnabled;
    if (typeof this.savedColorEnabled === 'boolean') this.$('color-preview').checked = this.savedColorEnabled;
    this.$('method').value = this.method;
    this.$('method').addEventListener('change', () => { this.method = this.$('method').value; this.sync(); changed(); });
    this.$('color-part').addEventListener('change', () => this.sync());
    for (const field of ['brightness', 'saturation']) this.$(field).addEventListener('input', () => {
      const el = this.$(field), n = Number(el.value);
      if (el.value === '' || !Number.isFinite(n)) return;
      this.colors[this.$('color-part').value][field] = Math.max(Number(el.min), Math.min(Number(el.max), n)); changed();
    });
    this.$('color-preview').addEventListener('change', changed);
    this.$('color-reset').addEventListener('click', () => { this.colors[this.$('color-part').value] = { brightness: 1, saturation: 1 }; this.sync(); changed(); });
    this.$('select').addEventListener('change', () => { this.selected = Number(this.$('select').value); this.sync(); changed(); });
    for (const field of ['blur', 'opacity', 'x', 'y', 'width', 'height', 'feather', 'edgeStrength', 'edgeFeather']) {
      this.$(field).addEventListener('input', () => {
        const input = this.$(field), n = Number(input.value);
        if (input.value === '' || !Number.isFinite(n)) return;
        const value = Math.max(Number(input.min), Math.min(Number(input.max), n));
        const r = this.regions[this.selected], p = layout()[r.part];
        if (field === 'width') r.rx = value / (2 * p.width);
        else if (field === 'height') r.ry = value / (2 * p.height);
        else r[field] = value;
        changed();
      });
      this.$(field).addEventListener('change', () => this.sync());
    }
    for (const id of ['mode', 'preview', 'outline']) this.$(id).addEventListener('change', changed);
    this.$('reset').addEventListener('click', () => { this.regions = structuredClone(this.defaults); this.sync(); changed(); });
    this.sync();
  }
  parameters() {
    const data = { version: 2, method: this.method, enabled: this.$('preview').checked, colorEnabled: this.$('color-preview').checked,
      colors: structuredClone(this.colors), coordinateSpace: 'part-normalized', blurUnit: 'game-pixel', regions: structuredClone(this.regions) };
    try { localStorage.setItem('twc_lamp_fusion_confirmed_20261013', JSON.stringify(data)); } catch (_) {}
    return data;
  }
  sync() {
    const r = this.regions[this.selected], p = this.layout()[r.part];
    this.$('select').value = this.selected;
    for (const field of ['blur', 'opacity', 'x', 'y', 'feather', 'edgeStrength', 'edgeFeather']) this.$(field).value = Math.round(r[field] * 1000) / 1000;
    for (const field of ['blur', 'opacity', 'feather']) this.$(field).disabled = this.method !== 'blur';
    for (const field of ['edgeStrength', 'edgeFeather']) this.$(field).disabled = this.method !== 'feather';
    for (const field of ['brightness', 'saturation']) this.$(field).value = this.colors[this.$('color-part').value][field];
    this.$('width').value = Math.round(r.rx * p.width * 200) / 100;
    this.$('height').value = Math.round(r.ry * p.height * 200) / 100;
  }
  local(pointer, part) {
    const p = this.layout()[part], a = -p.rotationDeg * Math.PI / 180;
    const dx = pointer.x - p.x, dy = pointer.y - p.y;
    return { x: (dx * Math.cos(a) - dy * Math.sin(a)) * (p.flipX ? -1 : 1) / p.width + 0.5,
      y: (dx * Math.sin(a) + dy * Math.cos(a)) / p.height + 0.5 };
  }
  down(pointer) {
    const indices = [this.selected, ...this.regions.map((_, i) => i).filter(i => i !== this.selected)];
    for (const i of indices) {
      const r = this.regions[i], q = this.local(pointer, r.part);
      if (((q.x - r.x) / r.rx) ** 2 + ((q.y - r.y) / r.ry) ** 2 > 1) continue;
      this.selected = i; this.offset = { x: r.x - q.x, y: r.y - q.y }; this.sync(); return true;
    }
    return false;
  }
  move(pointer) {
    const r = this.regions[this.selected], q = this.local(pointer, r.part);
    r.x = Math.max(-1, Math.min(2, q.x + this.offset.x));
    r.y = Math.max(-1, Math.min(2, q.y + this.offset.y));
    this.sync(); this.changed();
  }
  transform(ctx, r) {
    const p = this.layout()[r.part];
    ctx.translate(p.x - 270, p.y - 316); ctx.rotate(p.rotationDeg * Math.PI / 180);
    ctx.scale(p.flipX ? -1 : 1, 1);
    ctx.translate((r.x - 0.5) * p.width, (r.y - 0.5) * p.height);
    ctx.scale(r.rx * p.width, r.ry * p.height);
  }
  colorFilter(part) {
    const color = this.colors[part];
    return color && this.$('color-preview').checked ? `brightness(${color.brightness}) saturate(${color.saturation})` : 'none';
  }
  drawBlended(ctx, part, drawPart) {
    if (part === 'body' || this.method !== 'feather' || !this.$('preview').checked) return false;
    const make = () => Object.assign(document.createElement('canvas'), { width: 960, height: 568 });
    const piece = make(), out = piece.getContext('2d'), mask = make(), m = mask.getContext('2d');
    drawPart(part, false, out);
    for (const r of this.regions.filter(r => r.part === part)) {
      m.save(); this.transform(m, r);
      const fade = m.createRadialGradient(0, 0, 0, 0, 0, 1);
      fade.addColorStop(0, `rgba(255,255,255,${r.edgeStrength})`);
      fade.addColorStop(1 - r.edgeFeather, `rgba(255,255,255,${r.edgeStrength})`);
      fade.addColorStop(1, 'rgba(255,255,255,0)');
      m.fillStyle = fade; m.fillRect(-1, -1, 2, 2); m.restore();
    }
    // 只在灯身实像素覆盖处削弱零件，避免接缝外轮廓出现透明缺口。
    m.globalCompositeOperation = 'destination-in'; drawPart('body', false, m);
    out.globalCompositeOperation = 'destination-out'; out.drawImage(mask, 0, 0);
    ctx.drawImage(piece, 0, 0);
    return true;
  }
  paint(ctx, part, table, drawPart) {
    if (!this.$('preview').checked || this.method !== 'blur') return;
    const make = () => Object.assign(document.createElement('canvas'), { width: 960, height: 568 });
    const source = make(), base = source.getContext('2d');
    base.drawImage(table, 0, 0, 960, 568); drawPart('body', false, base); drawPart(part, false, base);
    // 同组相同强度的区域合并遮罩，与游戏默认的两处把手接脚一致。
    const groups = new Map();
    for (const r of this.regions.filter(r => r.part === part && r.blur > 0 && r.opacity > 0)) {
      const key = r.blur; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(r);
    }
    for (const [blur, regions] of groups) {
      const mask = make(), m = mask.getContext('2d'), result = make(), out = result.getContext('2d');
      for (const r of regions) {
        m.save(); this.transform(m, r);
        const fade = m.createRadialGradient(0, 0, 0, 0, 0, 1);
        fade.addColorStop(0, `rgba(255,255,255,${r.opacity})`);
        fade.addColorStop(1 - r.feather, `rgba(255,255,255,${r.opacity * 8 / 9})`);
        fade.addColorStop(1, 'rgba(255,255,255,0)');
        m.fillStyle = fade; m.fillRect(-1, -1, 2, 2); m.restore();
      }
      out.filter = `blur(${blur}px)`; out.drawImage(source, 0, 0); out.filter = 'none';
      out.globalCompositeOperation = 'destination-in'; out.drawImage(mask, 0, 0);
      ctx.drawImage(result, 0, 0);
    }
  }
  outline(ctx) {
    if (!this.$('outline').checked) return;
    this.regions.forEach((r, i) => {
      const p = this.layout()[r.part];
      ctx.save(); ctx.translate(p.x - 270, p.y - 316); ctx.rotate(p.rotationDeg * Math.PI / 180);
      ctx.scale(p.flipX ? -1 : 1, 1); ctx.translate((r.x - 0.5) * p.width, (r.y - 0.5) * p.height);
      ctx.strokeStyle = i === this.selected ? '#ffdd73' : '#8bddd7'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.ellipse(0, 0, r.rx * p.width, r.ry * p.height, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(-3, -3, 6, 6); ctx.restore();
    });
  }
}
