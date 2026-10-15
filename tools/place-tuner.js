// 土陶小游戏「主体位置」手动调整工具  v3
// 入口（任选其一）：
//   1) 带 ?tools=1 打开游戏，index.html 末尾的开发行会自动加载本工具（刷新后依然在）
//   2) 按 F2，在调试面板中开启「主体位置调整」工具
// 用法：
//   · 缩略图：全部 16 个状态一次显示，点选即替换掉游戏里画的那个主体
//   · 联络表：8 张成形帧并排同一基线，专门看“哪一帧往上跳”
//   · 实际位置：按真实制作区比例预览
//   · ↑↓ 微调（Shift×5 · Alt×10），Ctrl+E 导出参数并复制
(function () {
  // 已有实例先清掉，支持反复注入
  if (window.__placeTool) { try { window.__placeTool.destroy(); } catch (e) {} }

  // 工具要在工作台里用：等 UI 场景与工作台就绪后再初始化
  var waited = 0;
  (function wait() {
    var ws = window.__game && window.__game.scene.getScene('UI') && window.__game.scene.getScene('UI').workshop;
    if (!ws) {
      if ((waited += 200) > 60000) { console.warn('[placetool] 等待游戏就绪超时'); return; }
      return setTimeout(wait, 200);
    }
    start();
  })();

  function start() {

  // ---------- 游戏常量（与 LampForming.js / LampWorkshop.js 一致） ----------
  var CARD = { x: 270, y: 316, w: 960, h: 568 };
  var PLATE = { cx: 750, cy: 737, rx: 242.5, ry: 65 };
  var WHEEL = { cx: 750, cy: 512, rx: 239, ry: 219 };
  var FORM = { cx: 750, cy: 572, box: 440, cell: 512, anchorY: 720.7 };
  var KNEAD = { cx: 750, cy: 615, boxW: 300, boxH: 200 };
  var TEX_V = 34;

  var KNEAD_KEYS = [
    ['POTTERY_CLAY_BUBBLE', '气泡'],
    ['POTTERY_CLAY_NEUTRAL', '原泥'],
    ['POTTERY_CLAY_READY', '和好'],
    ['POTTERY_CLAY_PRESS_CENTER', '压中'],
    ['POTTERY_CLAY_PRESS_LEFT', '压左'],
    ['POTTERY_CLAY_PRESS_RIGHT', '压右'],
    ['POTTERY_CLAY_FOLD_LEFT', '折左'],
    ['POTTERY_CLAY_FOLD_RIGHT', '折右'],
  ];
  var FRAME_LABELS = ['0 泥团', '1 开孔', '2 扩口', '3 薄壁', '4 灯腹', '5 展腹', '6 收肩', '7 成口'];

  // ---------- 图元 ----------
  var items = [];
  function pushKnead(key, label) {
    var img = new Image();
    img.src = 'map-assets/POTTERY_CLAY_V2/POTTERY_CLAY_V2_' + key.replace('POTTERY_CLAY_', '') + '.png?v=' + TEX_V;
    items.push({ key: key, label: label, group: 'knead', img: img, dx: 0, dy: 0 });
  }
  KNEAD_KEYS.forEach(function (s) { pushKnead(s[0], s[1]); });
  var sheetImg = new Image();
  sheetImg.src = 'map-assets/POTTERY_FORMING_V1.png?v=' + TEX_V;
  for (var fi = 0; fi < 8; fi++) {
    items.push({ key: 'FORMING#' + fi, label: FRAME_LABELS[fi], group: 'forming', frame: fi, img: sheetImg, dx: 0, dy: 0 });
  }

  // 尺寸/格子：和泥按 300x200 等缩放居中；成形整格 512 缩放到 440，中心 (750,572)
  function kneadBox(it) {
    var iw = it.img.naturalWidth || 1536, ih = it.img.naturalHeight || 1024;
    var s = Math.min(KNEAD.boxW / iw, KNEAD.boxH / ih);
    return { w: iw * s, h: ih * s, s: s };
  }
  function cell(it) {
    var iw = it.img.naturalWidth || 1774, ih = it.img.naturalHeight || 887;
    var cw = iw / 4, ch = ih / 2, col = it.frame % 4, row = Math.floor(it.frame / 4);
    return { sx: Math.round(col * cw), sy: Math.round(row * ch), sw: Math.round(cw), sh: Math.round(ch) };
  }
  // 游戏画的是 prepareFrames() 归一化后的 atlas，不是源图格子。
  // 预览必须跟着用 atlas，否则预览里的帧位置和游戏里不一致（这正是上次误导人的根源）。
  function drawRectOf(it) {
    if (it.group === 'forming') {
      try {
        var t = window.__game && window.__game.textures.get('POTTERY_FORMING');
        if (t && t.key === 'POTTERY_FORMING' && t.source && t.source[0] && t.source[0].image) {
          var fr = t.get(it.frame);
          return { img: t.source[0].image, sx: fr.cutX, sy: fr.cutY, sw: fr.cutWidth, sh: fr.cutHeight };
        }
      } catch (e) { /* 退回源图 */ }
    }
    var cl = cell(it);
    return { img: it.img, sx: cl.sx, sy: cl.sy, sw: cl.sw, sh: cl.sh };
  }
  var CELL_K = FORM.box / FORM.cell;   // 0.859375

  // 贴图 alpha 轮廓（阈值 96，与 prepareFrames 相同）
  function measure(it, cb) {
    var run = function () {
      var iw = it.img.naturalWidth, ih = it.img.naturalHeight;
      var cv = document.createElement('canvas'); cv.width = iw; cv.height = ih;
      var c = cv.getContext('2d', { willReadFrequently: true });
      c.drawImage(it.img, 0, 0);
      var d = c.getImageData(0, 0, iw, ih).data;
      var left = iw, right = 0, top = ih, bottom = 0, found = false;
      for (var y = 0; y < ih; y++) for (var x = 0; x < iw; x++) {
        if (d[(y * iw + x) * 4 + 3] >= 96) {
          found = true;
          if (x < left) left = x; if (x > right) right = x;
          if (y < top) top = y; if (y > bottom) bottom = y;
        }
      }
      it.sil = found ? { left: left, right: right, top: top, bottom: bottom } : null;
      cb(it);
    };
    if (it.img.complete && it.img.naturalWidth) run(); else it.img.onload = run;
  }

  // 主体底边在屏幕上的 y（当前 dx/dy 生效后）；轮廓还没量出来时返回 null
  function baseY(it) {
    if (!it.sil) return null;
    var v = baseYRaw(it);
    return v == null ? null : v + it.dy;
  }
  function baseYRaw(it) {
    if (!it.sil) return null;
    if (it.group === 'knead') return KNEAD.cy + (it.sil.bottom - it.img.naturalHeight / 2) * kneadBox(it).s;
    return FORM.cy - FORM.cell / 2 + it.sil.bottom * CELL_K;
  }
  function baseYNoOff(it) {
    var saved = it.dy;
    it.dy = 0;
    var v = baseY(it);
    it.dy = saved;
    return v;
  }

  // ---------- 面板 ----------
  var wrap = document.createElement('div');
  wrap.style.cssText = [
    'position:fixed;right:0;top:0;height:100%;width:330px;z-index:9999;overflow:auto',
    'background:rgba(10,17,15,.97);color:#e8e2d2;border-left:1px solid #2e6e63',
    'font:12px/1.5 Consolas,"Microsoft YaHei",monospace;padding:8px 10px;box-sizing:border-box',
  ].join(';');
  wrap.innerHTML = [
    '<div style="font-size:13px;color:#8fd8c4">主体位置调整 <span style="color:#7d8b86">Ctrl+E 导出</span></div>',
    '<div style="margin:6px 0;display:flex;gap:4px">',
    '<button data-mode="grid" style="flex:1">缩略图</button>',
    '<button data-mode="sheet" style="flex:1">联络表</button>',
    '<button data-mode="detail" style="flex:1">实际位置</button></div>',
    '<div id="pt_tip" style="color:#c9973f;min-height:32px;margin-bottom:4px"></div>',
    '<div id="pt_body" style="background:#08120f;border:1px solid #1d4a41;border-radius:6px;',
    'padding:6px;max-height:46vh;overflow:auto"></div>',
    '<div style="margin:8px 0 4px;color:#8fd8c4">微调选中项</div>',
    '<div id="pt_btns"></div>',
    '<div style="margin-top:6px;color:#7d8b86">←→ 换状态 · ↑↓ 调位置（Shift×5 / Alt×10）<br>',
    'A 自动对齐 · R 归零 · Delete 关闭</div>',
    '<div id="pt_out" style="white-space:pre;background:#08120f;border:1px solid #1d4a41;border-radius:6px;',
    'padding:6px;margin-top:8px;max-height:200px;overflow:auto;color:#b9e6d8;font-size:11px"></div>',
    '<button id="pt_exp" style="width:100%;padding:6px;margin-top:6px;background:#2e6e63;color:#f7ecd4;',
    'border:0;border-radius:6px;cursor:pointer">导出到控制台并复制</button>',
  ].join('');
  document.body.appendChild(wrap);
  var body = wrap.querySelector('#pt_body');
  var outEl = wrap.querySelector('#pt_out');
  var tipEl = wrap.querySelector('#pt_tip');

  [['-10', -10], ['-5', -5], ['-1', -1], ['+1', 1], ['+5', 5], ['+10', 10]].forEach(function (b) {
    var el = document.createElement('button');
    el.textContent = b[0];
    el.style.cssText = 'width:14.5%;margin:1px;padding:5px 0;background:#1d4a41;color:#eafff7;border:0;border-radius:5px;cursor:pointer';
    el.onclick = function () { items[sel].dy += b[1]; changed(); };
    wrap.querySelector('#pt_btns').appendChild(el);
  });
  var row2 = document.createElement('div');
  row2.style.cssText = 'margin-top:3px';
  row2.innerHTML =
    '<button id="pt_auto" style="width:48%;padding:5px 0;background:#8a6a2f;color:#fff8e6;border:0;border-radius:5px;cursor:pointer">自动对齐基线</button>' +
    '<button id="pt_zero" style="width:48%;margin-left:4%;padding:5px 0;background:#9e3d2e;color:#f7ecd4;border:0;border-radius:5px;cursor:pointer">全部归零</button>';
  wrap.querySelector('#pt_btns').appendChild(row2);
  wrap.querySelector('#pt_auto').onclick = autoAlign;
  wrap.querySelector('#pt_zero').onclick = function () { items.forEach(function (i) { i.dx = 0; i.dy = 0; }); changed(); };
  wrap.querySelector('#pt_exp').onclick = exportParams;
  wrap.querySelectorAll('button[data-mode]').forEach(function (b) {
    b.style.cssText = 'padding:5px 0;background:#1d4a41;color:#eafff7;border:0;border-radius:5px;cursor:pointer;font:12px Consolas,"Microsoft YaHei",monospace';
    b.onclick = function () { mode = b.getAttribute('data-mode'); refresh(); };
  });

  // ---------- 状态 ----------
  var sel = 0, mode = 'grid';

  function changed() { refresh(); }

  // 这个是独立的调整层：不改动游戏里的绘制。
  // 理由：游戏每次 render() 都会销毁并重建贴图，外部补丁很容易挂到已销毁的对象上；
  // 「实际位置」「联络表」两个页签按真实比例重绘主体，看到的落点与游戏一致。
  function lampGame() {
    var ui = window.__game && window.__game.scene.getScene('UI');
    return ui && ui.workshop && ui.workshop.opened && ui.workshop.kind === 'lamp' ? ui.workshop.lampGame : null;
  }

  // ---------- 自动对齐：各分组主体底边对齐到本组中位基线 ----------
  function autoAlign() {
    var msg = [];
    ['knead', 'forming'].forEach(function (grp) {
      var list = items.filter(function (i) { return i.group === grp && i.sil; });
      if (!list.length) return;
      var raw = list.map(function (it) { return baseYNoOff(it); });
      var sorted = raw.slice().sort(function (a, b) { return a - b; });
      var med = sorted[Math.floor(sorted.length / 2)];
      list.forEach(function (it, k) { it.dy += Math.round((med - raw[k]) * 10) / 10; });
      msg.push((grp === 'knead' ? '和泥' : '成形') + ' ' + list.length + ' 项 → 基线 ' + med.toFixed(1));
    });
    changed();
    tipEl.textContent = '自动对齐完成：' + msg.join('；') + '。不满意的单项继续用 ↑↓ 调。';
  }

  // ---------- 绘制 ----------
  function drawItem(c, it, originX, originY, zoom, clip) {
    c.save();
    if (clip) { c.beginPath(); c.rect(clip.x, clip.y, clip.w, clip.h); c.clip(); }
    c.translate(originX, originY);
    c.scale(zoom, zoom);
    if (it.group === 'knead') {
      var b = kneadBox(it);
      c.drawImage(it.img, -b.w / 2, -b.h / 2, b.w, b.h);
    } else {
      var r = drawRectOf(it);
      c.drawImage(r.img, r.sx, r.sy, r.sw, r.sh,
        -FORM.cell / 2, -FORM.cell / 2, r.sw * CELL_K, r.sh * CELL_K);
    }
    c.restore();
  }

  function thumb(it, size) {
    var cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    cv.style.cssText = 'background:#101a17;border-radius:4px;cursor:pointer;display:block';
    if (it === items[sel]) cv.style.outline = '2px solid #7fffd4';
    var c = cv.getContext('2d');
    var span = it.group === 'knead' ? KNEAD.boxH : FORM.box;
    var zoom = (size * 0.86) / span;
    drawItem(c, it, size / 2, size / 2, zoom);
      var by = baseY(it);
    if (by != null) {
      var rel = it.dy;
      var cy = size / 2 + (by - (it.group === 'knead' ? KNEAD.cy : FORM.cy)) * zoom;
      c.strokeStyle = 'rgba(255,140,120,.95)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, cy); c.lineTo(size, cy); c.stroke();
    }
    cv.onclick = function () { sel = items.indexOf(it); refresh(); };
    return cv;
  }

  function renderGrid() {
    var head = document.createElement('div');
    head.style.cssText = 'color:#8fd8c4;margin-bottom:4px';
    head.textContent = '全部状态 · 点选（红线 = 主体底边）';
    body.appendChild(head);
    [['knead', '和泥（8 态）'], ['forming', '转盘成形（8 帧）']].forEach(function (g) {
      var t = document.createElement('div');
      t.style.cssText = 'color:#c9973f;margin:6px 0 2px';
      t.textContent = g[1];
      body.appendChild(t);
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px';
      items.filter(function (i) { return i.group === g[0]; }).forEach(function (it) {
        var cellEl = document.createElement('div');
        cellEl.style.cssText = 'width:70px;text-align:center';
        cellEl.appendChild(thumb(it, 66));
        var lb = document.createElement('div');
        lb.style.cssText = 'font-size:10px;color:' + (it === items[sel] ? '#7fffd4' : '#9fb3ac');
        lb.textContent = it.label + ' ' + (it.dy >= 0 ? '+' : '') + it.dy;
        cellEl.appendChild(lb);
        cellEl.onclick = function () { sel = items.indexOf(it); refresh(); };
        row.appendChild(cellEl);
      });
      body.appendChild(row);
    });
  }

  function renderSheet() {
    var head = document.createElement('div');
    head.style.cssText = 'color:#8fd8c4;margin-bottom:4px';
    head.textContent = '8 帧并排 · 共享基线（看哪一帧往上跳）';
    body.appendChild(head);
    var list = items.filter(function (i) { return i.group === 'forming'; });
    var cv = document.createElement('canvas');
    var cw = 322, chh = 168;
    cv.width = cw; cv.height = chh;
    cv.style.cssText = 'background:#101a17;border-radius:4px;display:block;width:100%';
    var c = cv.getContext('2d');
    var colW = cw / 8;
    var zoom = (colW * 0.92) / FORM.box;
    var refLine = chh - 30;
    c.strokeStyle = 'rgba(255,140,120,.9)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, refLine); c.lineTo(cw, refLine); c.stroke();
    c.fillStyle = '#7d8b86'; c.font = '9px Consolas,monospace';
    c.fillText('统一基线（各帧底边应贴住这条线）', 3, chh - 4);
    list.forEach(function (it, i) {
      // 让“当前底边”正好落在红线上：先把格子摆到红线，再减去底边相对格子中心的高度
      var baseOff = (it.sil ? it.sil.bottom * CELL_K - FORM.cell / 2 : 0) + it.dy;
      var sy = refLine - baseOff * zoom;
      c.save();
      c.beginPath(); c.rect(i * colW, 0, colW, chh); c.clip();
      drawItem(c, it, i * colW + colW / 2, sy, zoom);
      c.restore();
      c.fillStyle = it === items[sel] ? '#7fffd4' : '#9fb3ac';
      c.font = '9px Consolas,monospace';
      c.fillText(String(it.frame), i * colW + 3, 11);
      c.fillStyle = it.dy ? '#c9973f' : '#5d6b66';
      c.fillText(it.dy ? (it.dy > 0 ? '+' + it.dy : String(it.dy)) : '0', i * colW + 3, 22);
    });
    cv.onclick = function (e) {
      var i = Math.max(0, Math.min(7, Math.floor(e.offsetX / colW)));
      sel = items.indexOf(list[i]);
      refresh();
    };
    body.appendChild(cv);
    var gaps = list.map(function (it) {
      var z = it.dy - (baseYNoOff(it) - FORM.cy);
      return { label: it.label, z: z };
    });
    var note = document.createElement('div');
    note.style.cssText = 'color:#9fb3ac;margin-top:4px;white-space:pre';
    note.textContent = '零偏移时各帧主体底边的 y（越大越靠下；同一组内不一致才会跳）：\n' +
      list.map(function (it) {
        var v = baseYNoOff(it);
        return it.label + '  底边 y = ' + (v == null ? '量取中…' : v.toFixed(1));
      }).join('\n');
    body.appendChild(note);
    var note2 = document.createElement('div');
    note2.style.cssText = 'color:#c9973f;margin-top:4px';
    var bottoms = list.map(function (it) { return baseYNoOff(it); }).filter(function (v) { return v != null; });
    var spread = bottoms.length ? Math.max.apply(null, bottoms) - Math.min.apply(null, bottoms) : null;
    note2.textContent = spread == null
      ? '数据源：轮廓量取中…'
      : (atlasUsed
        ? '数据源：游戏实际使用的 atlas（已归一化）→ 底边跨度 ' + spread.toFixed(1) + 'px'
        : '数据源：源图格子（归一化前，仅供参考；开一次转盘成型后会自动切到真实数据）→ 底边跨度 ' + spread.toFixed(1) + 'px');
    body.appendChild(note2);
  }

  function renderDetail() {
    var it = items[sel];
    var head = document.createElement('div');
    head.style.cssText = 'color:#8fd8c4;margin-bottom:4px';
    head.textContent = '实际位置：' + it.label + '（按真实制作区比例）';
    body.appendChild(head);
    var cv = document.createElement('canvas');
    var scale = 0.32;
    cv.width = Math.round(CARD.w * scale); cv.height = Math.round(CARD.h * scale);
    cv.style.cssText = 'display:block;width:100%;border-radius:4px';
    var c = cv.getContext('2d');
    var bg = window.__game && window.__game.textures.get('POTTERY_TABLE');
    if (bg) c.drawImage(bg.getSourceImage(), 0, 0, cv.width, cv.height);
    else { c.fillStyle = '#6b4a2c'; c.fillRect(0, 0, cv.width, cv.height); }
    // 半透明底噪可视化：alpha 在 1~95 之间的像素（生成图残留的整幅淡雾）画成亮青色，
    // 这样“泥团贴图整幅是半透明”的问题会一眼看到
    var it0 = items[sel];
    if (it0.group === 'knead' && it0.img.complete && it0.img.naturalWidth) {
      var w0 = cv.width, h0 = cv.height;
      var tmp = document.createElement('canvas'); tmp.width = 192; tmp.height = 128;
      var tc = tmp.getContext('2d', { willReadFrequently: true });
      try {
        tc.drawImage(it0.img, 0, 0, 192, 128);
        var d = tc.getImageData(0, 0, 192, 128).data;
        var vis = tc.createImageData(192, 128);
        for (var i = 0; i < d.length; i += 4) {
          var a = d[i + 3];
          if (a > 0 && a < 96) { vis.data[i] = 0; vis.data[i + 1] = 255; vis.data[i + 2] = 230; vis.data[i + 3] = 190; }
        }
        tc.putImageData(vis, 0, 0);
        c.drawImage(tmp, 0, 0, w0, h0);
      } catch (e) { /* 忽略 */ }
    }
    c.save();
    c.translate(-CARD.x * scale, -CARD.y * scale);
    c.scale(scale, scale);
    c.fillStyle = 'rgba(128,83,46,1)';
    c.beginPath(); c.ellipse(PLATE.cx, PLATE.cy, PLATE.rx, PLATE.ry, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(192,147,86,1)'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(PLATE.cx, PLATE.cy - 7, PLATE.rx, PLATE.ry - 4, 0, 0, Math.PI * 2); c.stroke();
    var cx = it.group === 'knead' ? KNEAD.cx : FORM.cx;
    var cy = it.group === 'knead' ? KNEAD.cy : FORM.cy;
    drawItem(c, it, cx, cy, 1);
    var by = baseY(it);
    if (by != null) {
      c.strokeStyle = '#ff8c78'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(CARD.x, by); c.lineTo(CARD.x + CARD.w, by); c.stroke();
      c.fillStyle = '#ff8c78'; c.font = '16px Consolas,monospace';
      c.fillText('底边 ' + by.toFixed(1), CARD.x + 10, by - 8);
    }
    c.strokeStyle = 'rgba(255,215,116,.8)'; c.setLineDash([5, 5]);
    c.beginPath(); c.moveTo(cx, CARD.y); c.lineTo(cx, CARD.y + CARD.h); c.stroke();
    c.setLineDash([]);
    c.restore();
    body.appendChild(cv);
    var note = document.createElement('div');
    note.style.cssText = 'color:#9fb3ac;margin-top:4px';
    note.textContent = '红线=主体底边落点，黄虚线=转盘中心。青色=alpha 1~95 的淡雾像素' +
      (it0.group === 'knead' ? '（生成图残留，会整幅罩在转盘上）' : '') + '。↑↓ 实时改。';
    body.appendChild(note);
  }

  function renderOut() {
    var forming = items.filter(function (i) { return i.group === 'forming'; });
    var knead = items.filter(function (i) { return i.group === 'knead'; });
    var lines = ['== 当前参数 =='];
    lines.push('成形 dy: [' + forming.map(function (i) { return i.dy; }).join(', ') + ']');
    lines.push('成形 dx: [' + forming.map(function (i) { return i.dx; }).join(', ') + ']');
    knead.forEach(function (i) { lines.push(i.key + '  dx=' + i.dx + ' dy=' + i.dy); });
    var bottoms = forming.map(function (i) { return baseYNoOff(i); });
    lines.push('成形零偏移底边跨度: ' + (Math.max.apply(null, bottoms) - Math.min.apply(null, bottoms)).toFixed(1) + 'px');
    outEl.textContent = lines.join('\n');
  }

  function exportParams() {
    var forming = items.filter(function (i) { return i.group === 'forming'; });
    var knead = items.filter(function (i) { return i.group === 'knead'; });
    var text = [
      '==== 土陶主体位置调整结果 ====',
      '[成形] 逐帧 dy（帧0→7）：' + JSON.stringify(forming.map(function (i) { return i.dy; })),
      '[成形] 逐帧 dx（帧0→7）：' + JSON.stringify(forming.map(function (i) { return i.dx; })),
      '[成形] 零偏移时各帧主体底边 y：' + JSON.stringify(forming.map(function (i) {
        var v = baseYNoOff(i);
        return v == null ? null : +v.toFixed(1);
      })),
      '[和泥] 各状态偏移：',
    ].concat(knead.map(function (i) {
      return '  ' + i.key + ' dx=' + i.dx + ' dy=' + i.dy + '  底边y=' + (baseYNoOff(i) == null ? 'n/a' : baseYNoOff(i).toFixed(1));
    })).concat([
      '--- 粘贴给助手 ---',
      'const FORM_DY = [' + forming.map(function (i) { return i.dy; }).join(', ') + '];',
      'const FORM_DX = [' + forming.map(function (i) { return i.dx; }).join(', ') + '];',
      'const KNEAD_D = { ' + knead.map(function (i) {
        return i.key.replace('POTTERY_CLAY_', '') + ': [' + i.dx + ', ' + i.dy + ']';
      }).join(', ') + ' };',
    ]).join('\n');
    console.log(text);
    outEl.textContent = text + '\n\n[已复制到剪贴板]';
    try { navigator.clipboard.writeText(text); } catch (e) {}
  }

  // ---------- 游戏画面上的实时预览 ----------
  // 把选中的状态直接画在游戏真实坐标上：成形时先隐藏游戏自己的陶坯（它没有偏移），
  // 再由本层按「选中状态 + 当前偏移」重画，做到所见即所得。
  var overlay = document.createElement('canvas');
  overlay.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:9998';
  document.body.appendChild(overlay);
  var octx = overlay.getContext('2d');

  function drawOverlay() {
    var gc = document.querySelector('#game canvas');
    if (!gc) return;
    var r = gc.getBoundingClientRect();
    if (!r.width) return;
    var k = r.width / 1920;
    overlay.style.left = r.left + 'px'; overlay.style.top = r.top + 'px';
    overlay.style.width = r.width + 'px'; overlay.style.height = r.height + 'px';
    overlay.width = Math.round(r.width); overlay.height = Math.round(r.height);
    octx.setTransform(k, 0, 0, k, 0, 0);
    octx.clearRect(0, 0, 1920, 1080);

    var m = lampGame();
    var it = items[sel];
    if (!m || !it) return;

    if (m.formingActive && m.forming) {
      var sp = m.forming.clayA;
      if (m.forming.clayB) m.forming.clayB.setVisible(false);
      if (sp) {
        sp.setVisible(false);                       // 藏掉游戏原先那张
        var box = sp.displayWidth || FORM.box;
        var r = drawRectOf(it);                     // 与游戏一致：优先取 atlas 帧
        octx.drawImage(r.img, r.sx, r.sy, r.sw, r.sh,
          FORM.cx - box / 2 + it.dx, FORM.cy - box / 2 + it.dy, r.sw * CELL_K, r.sh * CELL_K);
        var by = FORM.cy - FORM.cell / 2 + (it.sil ? it.sil.bottom * CELL_K : 0) + it.dy;
        octx.strokeStyle = '#ff8c78'; octx.lineWidth = 2;
        octx.beginPath(); octx.moveTo(420, by); octx.lineTo(1080, by); octx.stroke();
        octx.fillStyle = '#ff8c78'; octx.font = '15px Consolas,monospace';
        octx.fillText('底边 ' + by.toFixed(1) + '  dy=' + it.dy, 426, by - 7);
        octx.strokeStyle = 'rgba(255,215,116,.8)'; octx.setLineDash([5, 5]);
        octx.beginPath(); octx.moveTo(FORM.cx, 330); octx.lineTo(FORM.cx, 862); octx.stroke();
        octx.setLineDash([]);
      }
      return;
    }

    // 和泥：游戏自身绘制不带偏移，这里按同样尺寸重画一次做校正预览
    if (m.claySprite && (!it.dx && !it.dy)) return;
    if (!it.img.complete || !it.img.naturalWidth) return;
    var b = kneadBox(it);
    octx.drawImage(it.img, KNEAD.cx - b.w / 2 + it.dx, KNEAD.cy - b.h / 2 + it.dy, b.w, b.h);
    var by2 = KNEAD.cy + (it.sil ? (it.sil.bottom - it.img.naturalHeight / 2) * b.s : 0) + it.dy;
    octx.strokeStyle = '#ff8c78'; octx.lineWidth = 2;
    octx.beginPath(); octx.moveTo(430, by2); octx.lineTo(1070, by2); octx.stroke();
    octx.fillStyle = '#ff8c78'; octx.font = '15px Consolas,monospace';
    octx.fillText('底边 ' + by2.toFixed(1) + '  dx=' + it.dx + ' dy=' + it.dy, 436, by2 - 7);
  }
  window.addEventListener('resize', drawOverlay);

  function refresh() {
    wrap.querySelectorAll('button[data-mode]').forEach(function (b) {
      b.style.background = b.getAttribute('data-mode') === mode ? '#2e6e63' : '#1d4a41';
    });
    body.innerHTML = '';
    if (mode === 'grid') renderGrid();
    else if (mode === 'sheet') renderSheet();
    else renderDetail();
    drawOverlay();
    renderOut();
  }
  // 游戏自身会持续重绘，这里低频补齐本层（面板上的数值已实时更新）
  var keepAlive = setInterval(drawOverlay, 150);

  function onKey(e) {
    if (e.ctrlKey && (e.key === 'e' || e.key === 'E')) { exportParams(); e.preventDefault(); return; }
    if (e.ctrlKey || e.metaKey) return;
    var step = e.shiftKey ? 5 : (e.altKey ? 10 : 1);
    var it = items[sel];
    if (e.key === 'ArrowUp') it.dy -= step;
    else if (e.key === 'ArrowDown') it.dy += step;
    else if (e.key === 'ArrowLeft') sel = (sel - 1 + items.length) % items.length;
    else if (e.key === 'ArrowRight') sel = (sel + 1) % items.length;
    else if (e.key === 'a' || e.key === 'A') { autoAlign(); e.preventDefault(); return; }
    else if (e.key === 'r' || e.key === 'R') { items.forEach(function (i) { i.dx = 0; i.dy = 0; }); changed(); e.preventDefault(); return; }
    else if (e.key === 'Delete' || e.key === 'Backspace') { window.__placeTool.destroy(); e.preventDefault(); return; }
    else return;
    e.preventDefault();
    changed();
  }
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', refresh);

  window.__placeTool = {
    items: items, refresh: refresh, exportParams: exportParams, baseY: baseY,
    select: function (i) { sel = i; refresh(); },
    // 按 key 选中，例如 selectKey('FORMING#4') / selectKey('POTTERY_CLAY_READY')
    selectKey: function (key) {
      for (var i = 0; i < items.length; i++) if (items[i].key === key) { sel = i; refresh(); return items[i].label; }
      return null;
    },
    keys: function () { return items.map(function (i) { return i.key; }); },
    destroy: function () {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('resize', drawOverlay);
      clearInterval(keepAlive);
      overlay.remove();
      wrap.remove();
      window.__placeTool = null;
      console.log('[placetool] 已关闭；刷新页面可让游戏恢复自己绘制主体');
    },
  };

  var pending = items.length;
  items.forEach(function (it) {
    if (it.group === 'knead') measure(it, done);
    else {
      // 成形共用一张图，只量一次
      if (sheetImg.complete && sheetImg.naturalWidth) {
        it.sil = { left: 0, right: cell(it).sw - 1, top: 0, bottom: cell(it).sh - 1 };
        done(it);
      } else {
        sheetImg.addEventListener('load', function () {
          it.sil = { left: 0, right: cell(it).sw - 1, top: 0, bottom: cell(it).sh - 1 };
          done(it);
        }, { once: true });
      }
    }
  });
  var doneCount = 0;
  function done() {
    if (++doneCount >= pending) {
      // 成形帧用源图量真实轮廓
      var list = items.filter(function (i) { return i.group === 'forming'; });
      measureSheet(list, function () { refresh(); });
    }
  }
  function measureSheet(list, cb) {
    var run = function () {
      // 关键：游戏里画的不是源图格子，而是 prepareFrames() 归一化后的 atlas，
      // 它把每帧内容底边一律对齐到行 430。所以基准底边要从 atlas 量；
      // 直接量源图会得到「下半排比上半排低 37px」的假象。
      // 注意：atlas 只在转盘成型视图创建后才存在；拿不到时 textures.get 会返回
      // __MISSING 占位（32x32），所以必须先确认 key。读的必须是 t.source[0].image
      // （atlas 画布），而不是 t.getSourceImage()。
      var atlas = null, atlasTex = null;
      try {
        var t = window.__game && window.__game.textures.get('POTTERY_FORMING');
        if (t && t.key === 'POTTERY_FORMING' && t.source && t.source[0] && t.source[0].image) {
          atlas = t.source[0].image; atlasTex = t;
        }
      } catch (e) { atlas = null; }
      var aCtx = null;
      if (atlas && atlas.width > 100) {
        var aCv = document.createElement('canvas');
        aCv.width = atlas.width; aCv.height = atlas.height;
        aCtx = aCv.getContext('2d', { willReadFrequently: true });
        aCtx.drawImage(atlas, 0, 0);
      }
      atlasUsed = !!aCtx;
      var sCv = document.createElement('canvas'); sCv.width = 512; sCv.height = 512;
      var sCtx = sCv.getContext('2d', { willReadFrequently: true });
      list.forEach(function (it) {
        var cl = cell(it);
        var ctx = aCtx, x0 = 0, y0 = 0, w = 512, h = 512;
        if (ctx) {                       // atlas：按该帧真实的 cutX/cutY 读
          var fr = atlasTex.get(it.frame);
          x0 = fr.cutX; y0 = fr.cutY;
          w = fr.cutWidth; h = fr.cutHeight;
        } else {                         // 退路：量源图格子（归一化前）
          sCtx.clearRect(0, 0, 512, 512);
          sCtx.drawImage(sheetImg, cl.sx, cl.sy, cl.sw, cl.sh, 0, 0, 512, 512);
          ctx = sCtx;
        }
        var d = ctx.getImageData(x0, y0, w, h).data;
        var top = -1, bottom = -1;
        for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
          if (d[(y * w + x) * 4 + 3] >= 96) { if (top < 0) top = y; bottom = y; }
        }
        it.sil = { left: 0, right: w - 1, top: top < 0 ? 0 : top, bottom: bottom < 0 ? h - 1 : bottom };
      });
      cb();
    };
    if (sheetImg.complete && sheetImg.naturalWidth) run();
    else sheetImg.addEventListener('load', run, { once: true });
  }
  var atlasUsed = false;
  console.log('[placetool] 已加载：缩略图看全部状态，联络表看偏移，↑↓ 调，Ctrl+E 导出。');

  // atlas（归一化后的成形帧）只在工作台打开后才存在。它一出现就立刻重新量一次，
  // 否则面板上会一直显示源图的预估值（那组数会误导人以为底边没对齐）。
  var atlasWasThere = atlasUsed;
  var watch = setInterval(function () {
    if (!window.__placeTool) { clearInterval(watch); return; }
    var there = false;
    try {
      var t = window.__game && window.__game.textures.get('POTTERY_FORMING');
      there = !!(t && t.key === 'POTTERY_FORMING' && t.source && t.source[0] && t.source[0].image && t.source[0].image.width > 100);
    } catch (e) { there = false; }
    if (there !== atlasWasThere) {
      atlasWasThere = there;
      var list = items.filter(function (i) { return i.group === 'forming'; });
      if (list.length) measureSheet(list, function () { refresh(); console.log('[placetool] 已切到 atlas 数据（归一化后的真实帧）'); });
    }
  }, 500);
  }   // end start()
})();
