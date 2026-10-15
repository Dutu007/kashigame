// 手动校准拼好的油灯：使用游戏自己的成型帧归一化代码和现行 PNG。
// 入口 http://localhost:8080/tools/assembly-tuner.html
// 输出坐标为 1920×1080 游戏逻辑坐标，贴图原点为中心；不写主线存档。
(() => {
  'use strict';
  // 布局确认后使用新的缓存命名，避免先前未提交的调整覆盖已确认参数。
  const STORAGE_KEY = 'twc_lamp_assembly_layout_final_20261013';
  const CARD = { x: 270, y: 316, width: 960, height: 568 };
  const DEFAULTS = LAMP_ASSEMBLY_LAYOUT.parts;
  const NAMES = { body: '灯身', spout: '灯嘴', handle: '把手' };
  const LIMITS = { x: [270, 1230], y: [316, 884], width: [10, 960], height: [10, 960], rotationDeg: [-180, 180], layer: [-10, 10] };
  const fields = Object.keys(LIMITS);
  const $ = id => document.getElementById(id);
  const canvas = $('preview');
  const context = canvas.getContext('2d');
  const textures = {};
  let tableImage;
  let selected = 'spout';
  let drag = null;
  let loaded = false;
  let layout = structuredClone(DEFAULTS);
  const seams = new AssemblySeamTuner(() => layout, () => { save(); draw(); });

  const round = n => Math.round(n * 100) / 100;
  const clamp = (n, field) => Math.max(LIMITS[field][0], Math.min(LIMITS[field][1], n));
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version === 1) {
      for (const key of Object.keys(DEFAULTS)) {
        for (const field of fields) {
          if (Number.isFinite(saved.parts?.[key]?.[field])) layout[key][field] = clamp(saved.parts[key][field], field);
        }
        if (typeof saved.parts?.[key]?.flipX === 'boolean') layout[key].flipX = saved.parts[key].flipX;
      }
    }
  } catch (_) { /* 未保存过或参数损坏时保留初始布局。 */ }
  seams.sync();

  function parameters() {
    const parts = {};
    for (const [key, part] of Object.entries(layout)) {
      parts[key] = Object.fromEntries(fields.map(field => [field, round(part[field])]));
      // radians 可直接用于 Phaser setRotation，避免复制后重复换算。
      parts[key].rotation = round(part.rotationDeg * Math.PI / 180 * 100) / 100;
      parts[key].flipX = part.flipX;
    }
    return { tool: 'lamp-assembly-layout', version: 1, coordinateSpace: 'game-1920x1080', origin: [0.5, 0.5],
      bodyFrame: 7, textures: { body: 'POTTERY_FORMING', spout: 'POTTERY_LAMP_SPOUT_RAW', handle: 'POTTERY_LAMP_HANDLE_RAW' }, parts, seams: seams.parameters() };
  }

  function save() {
    const params = parameters();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(params)); } catch (_) { $('copy-status').textContent = '浏览器无法保存参数，请复制或保留下面的文本。'; }
    $('output').value = JSON.stringify(params, null, 2);
  }

  function syncControls() {
    const part = layout[selected];
    $('selection-title').textContent = NAMES[selected];
    for (const field of fields) $(field).value = round(part[field]);
    $('rotation-slider').value = part.rotationDeg;
    $('flipX').checked = part.flipX;
    document.querySelectorAll('[data-part]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.part === selected)));
  }

  function drawPart(key, outline = false, context = canvas.getContext('2d')) {
    const part = layout[key], source = textures[key];
    context.save();
    context.translate(part.x - CARD.x, part.y - CARD.y);
    context.rotate(part.rotationDeg * Math.PI / 180);
    context.scale(part.flipX ? -1 : 1, 1);
    context.filter = seams.colorFilter(key);
    context.drawImage(source.image, source.x, source.y, source.width, source.height, -part.width / 2, -part.height / 2, part.width, part.height);
    if (outline) {
      context.strokeStyle = '#93e0cf'; context.lineWidth = 1.5; context.setLineDash([7, 5]);
      context.strokeRect(-part.width / 2, -part.height / 2, part.width, part.height);
      context.setLineDash([]); context.fillStyle = '#93e0cf';
      context.beginPath(); context.arc(0, 0, 3, 0, Math.PI * 2); context.fill();
    }
    context.restore();
  }

  function order() { return Object.keys(layout).sort((a, b) => layout[a].layer - layout[b].layer); }
  function draw() {
    if (!loaded) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(tableImage, 0, 0, CARD.width, CARD.height);
    if ($('show-grid').checked) {
      context.strokeStyle = '#ffedbc66'; context.fillStyle = '#fff0cd'; context.lineWidth = 1; context.font = '12px Consolas, monospace';
      for (let x = 300; x <= 1200; x += 50) {
        context.beginPath(); context.moveTo(x - CARD.x, 0); context.lineTo(x - CARD.x, CARD.height); context.stroke();
        if (x % 100 === 0) context.fillText(String(x), x - CARD.x + 4, 16);
      }
      for (let y = 350; y <= 850; y += 50) {
        context.beginPath(); context.moveTo(0, y - CARD.y); context.lineTo(CARD.width, y - CARD.y); context.stroke();
        context.fillText(String(y), 4, y - CARD.y - 4);
      }
    }
    order().forEach(key => {
      if (!seams.drawBlended(context, key, drawPart)) drawPart(key);
      if (key !== 'body') seams.paint(context, key, tableImage, drawPart);
    });
    seams.outline(context);
    // 边框只用于校准，关闭可检查真实拼接效果。
    if ($('show-outline').checked) {
      const part = layout[selected];
      context.save(); context.translate(part.x - CARD.x, part.y - CARD.y); context.rotate(part.rotationDeg * Math.PI / 180);
      context.strokeStyle = '#93e0cf'; context.lineWidth = 1.5; context.setLineDash([7, 5]);
      context.strokeRect(-part.width / 2, -part.height / 2, part.width, part.height);
      context.setLineDash([]); context.fillStyle = '#93e0cf'; context.beginPath(); context.arc(0, 0, 3, 0, Math.PI * 2); context.fill();
      context.restore();
    }
  }

  function changed() { syncControls(); save(); draw(); }
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    const border = 2;
    return { x: CARD.x + (event.clientX - rect.left - border) * CARD.width / (rect.width - border * 2),
      y: CARD.y + (event.clientY - rect.top - border) * CARD.height / (rect.height - border * 2) };
  }

  // 使用 alpha 命中检测，透明留白不会挡住后面的零件。
  function hit(key, pointer) {
    const part = layout[key], source = textures[key];
    const angle = -part.rotationDeg * Math.PI / 180;
    const dx = pointer.x - part.x, dy = pointer.y - part.y;
    let lx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const ly = dx * Math.sin(angle) + dy * Math.cos(angle);
    if (part.flipX) lx = -lx;
    const px = Math.floor((lx / part.width + 0.5) * source.width);
    const py = Math.floor((ly / part.height + 0.5) * source.height);
    return px >= 0 && py >= 0 && px < source.width && py < source.height && source.alpha[(py * source.width + px) * 4 + 3] >= 48;
  }

  canvas.addEventListener('pointerdown', event => {
    if (!loaded || event.button !== 0) return;
    event.preventDefault(); canvas.focus();
    const pointer = point(event);
    if ($('seam-mode').checked) {
      if (!seams.down(pointer)) return;
      drag = { id: event.pointerId, seam: true };
      canvas.setPointerCapture(event.pointerId); draw(); return;
    }
    // 工具栏选中的对象优先，便于把零件从灯身的遮挡中拖出来。
    const keys = [selected, ...order().reverse().filter(key => key !== selected)];
    const key = keys.find(key => hit(key, pointer));
    if (!key) return;
    selected = key;
    drag = { id: event.pointerId, dx: layout[key].x - pointer.x, dy: layout[key].y - pointer.y };
    canvas.setPointerCapture(event.pointerId); canvas.classList.add('dragging'); syncControls(); draw();
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const pointer = point(event);
    if (drag.seam) { seams.move(pointer); return; }
    layout[selected].x = round(clamp(pointer.x + drag.dx, 'x'));
    layout[selected].y = round(clamp(pointer.y + drag.dy, 'y'));
    changed();
  });
  function release(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null; canvas.classList.remove('dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', () => { drag = null; canvas.classList.remove('dragging'); });

  document.querySelectorAll('[data-part]').forEach(button => button.addEventListener('click', () => { selected = button.dataset.part; syncControls(); draw(); }));
  for (const field of fields) {
    $(field).addEventListener('input', () => {
      if ($(field).value.trim() === '') return;
      const value = Number($(field).value);
      if (!Number.isFinite(value)) return;
      const part = layout[selected], old = part[field];
      part[field] = clamp(value, field);
      if ($('lock-ratio').checked && (field === 'width' || field === 'height')) {
        const other = field === 'width' ? 'height' : 'width';
        part[other] = clamp(round(part[other] * part[field] / old), other);
      }
      if (field === 'rotationDeg') $('rotation-slider').value = part.rotationDeg;
      if (field === 'width') $('height').value = round(part.height);
      if (field === 'height') $('width').value = round(part.width);
      save(); draw();
    });
    $(field).addEventListener('change', syncControls);
  }
  $('rotation-slider').addEventListener('input', () => { layout[selected].rotationDeg = Number($('rotation-slider').value); changed(); });
  $('flipX').addEventListener('change', () => { layout[selected].flipX = $('flipX').checked; changed(); });
  $('show-outline').addEventListener('change', draw);
  $('show-grid').addEventListener('change', draw);
  $('send-back').addEventListener('click', () => { if (selected !== 'body') { layout[selected].layer = clamp(layout.body.layer - 1, 'layer'); changed(); } });
  $('bring-front').addEventListener('click', () => { if (selected !== 'body') { layout[selected].layer = clamp(layout.body.layer + 1, 'layer'); changed(); } });
  $('reset-part').addEventListener('click', () => { layout[selected] = structuredClone(DEFAULTS[selected]); changed(); });
  $('reset-all').addEventListener('click', () => { layout = structuredClone(DEFAULTS); changed(); });

  document.addEventListener('keydown', event => {
    if (event.target.closest('input, textarea, select') || !loaded) return;
    if ($('seam-mode').checked) return;
    const amount = event.altKey ? 10 : event.shiftKey ? 5 : 1;
    const deltas = { ArrowLeft: ['x', -amount], ArrowRight: ['x', amount], ArrowUp: ['y', -amount], ArrowDown: ['y', amount], '[': ['rotationDeg', -amount], ']': ['rotationDeg', amount] };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    const [field, increment] = delta;
    layout[selected][field] = clamp(layout[selected][field] + increment, field); changed();
  });

  $('copy').addEventListener('click', async () => {
    save();
    const text = '油灯拼接布局、接缝融合及调色参数\n' + $('output').value;
    try {
      await navigator.clipboard.writeText(text);
      $('copy-status').textContent = '参数已复制，包含布局、接缝方式、区域、强度和颜色。粘贴给助手即可。';
    } catch (_) {
      const details = $('output').closest('details'); details.open = true;
      $('output').focus(); $('output').select();
      $('copy-status').textContent = '浏览器未允许自动复制。已选中参数，请按 Ctrl+C 后粘贴给助手。';
    }
  });

  class TunerAssets extends Phaser.Scene {
    preload() {
      this.load.image('POTTERY_TABLE', '../map-assets/POTTERY_TABLE.png');
      this.load.image('POTTERY_FORMING_SOURCE', '../map-assets/POTTERY_FORMING_V1.png');
      this.load.image('POTTERY_LAMP_SPOUT_RAW', '../map-assets/POTTERY_LAMP_SPOUT_RAW.png');
      this.load.image('POTTERY_LAMP_HANDLE_RAW', '../map-assets/POTTERY_LAMP_HANDLE_RAW.png');
      this.load.on('loaderror', file => { $('load-status').textContent = '素材加载失败：' + file.key + '；请从本地服务打开。'; });
    }
    create() {
      try {
        if (!['POTTERY_TABLE', 'POTTERY_FORMING_SOURCE', 'POTTERY_LAMP_SPOUT_RAW', 'POTTERY_LAMP_HANDLE_RAW'].every(key => this.textures.exists(key))) return;
        // 与正式拼接页完全相同的第 7 帧，避免源图裁切和游戏 atlas 不一致。
        LampFormingView.prepareFrames(this);
        tableImage = this.textures.get('POTTERY_TABLE').getSourceImage();
        for (const [key, textureKey, frame] of [['body', 'POTTERY_FORMING', 7], ['spout', 'POTTERY_LAMP_SPOUT_RAW', '__BASE'], ['handle', 'POTTERY_LAMP_HANDLE_RAW', '__BASE']]) {
          const texture = this.textures.get(textureKey), cut = texture.get(frame);
          const image = texture.getSourceImage();
          const scratch = document.createElement('canvas'); scratch.width = cut.cutWidth; scratch.height = cut.cutHeight;
          const ctx = scratch.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(image, cut.cutX, cut.cutY, cut.cutWidth, cut.cutHeight, 0, 0, cut.cutWidth, cut.cutHeight);
          textures[key] = { image, x: cut.cutX, y: cut.cutY, width: cut.cutWidth, height: cut.cutHeight, alpha: ctx.getImageData(0, 0, scratch.width, scratch.height).data };
        }
        loaded = true; $('load-status').textContent = '游戏素材已加载 · 自动保存'; changed();
        // 隐藏 Phaser 只负责一次素材准备，交互与预览用上面的独立画布。
        this.game.loop.stop();
      } catch (error) { $('load-status').textContent = '加载失败：' + error.message; console.error(error); }
    }
  }
  new Phaser.Game({ type: Phaser.CANVAS, parent: 'asset-loader', width: 1, height: 1, audio: { noAudio: true }, scene: [TunerAssets], banner: false });
  syncControls(); save();
})();
