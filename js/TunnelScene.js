// ============================================================
// 地下场景（U-A / U-B / U-C，§04）：
//  - 三段配置驱动，分别经对应井口往返地表
//  - 黑暗遮罩 + 井口光 + 土陶油灯椭圆照明（§11/§12）
//  - U-B 清淤取障（§13）、U-C 补口试流（§14）、下游复查（§15）
//  - 未布梯井不能上井（§10）
// ============================================================

// 各段首次进入的教学提示标题（§04 段落命名；对玩家不用 U-A 这类内部编号）
const SEG_TITLES = { UA: '上游巡查段', UB: '中段巡查段', UC: '下游巡查段' };

class TunnelScene extends Phaser.Scene {
  constructor() { super('Tunnel'); }
  init(data) {
    this.segKey = (data && data.seg) || 'UA'; // 井底不互通：只能从对应井口布梯进入本段
  }

  create() {
    this.seg = SEGMENTS[this.segKey];
    this.fading = false; this.vy = 0; this.onGround = true;
    this.local = null;       // null | {kind:'silt'}；UC 补口改为独立 UI 工作台
    this.localMarkers = [];  // 作业模式内的目标菱形标记
    this.lampImg = null;     // 场景重启后旧引用已随显示列表销毁，必须清空
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H).setZoom(ZOOM).fadeIn(350, 0, 0, 0);

    // 背景：U-B 未清淤时必须显示淤积态，完成后切干净底图；U-C 修补确认后切修复态底图。
    const initialBg = this.segKey === 'UB' && !G.state.ub.done ? this.seg.bgSilt : this.seg.bg;
    this.bg = this.add.image(0, 0, initialBg).setOrigin(0, 0).setDisplaySize(W, H).setDepth(0);
    if (this.segKey === 'UB' && G.state.ub.done) this.bg.setTexture('MAP_UB');
    if (this.segKey === 'UC' && G.state.uc.done && this.textures.exists('MAP_UC_FIXED')) {
      this.bg.setTexture(this.seg.bgFixed);
    }

    // （井下不再绘制绳梯贴图：布设即下井，转场画面后续由视频替代）

    // 出生点：井筒进入偏离中心64（§10）
    const sx = this.seg.shaftX + 64;
    this.player = this.add.image(sx, this.seg.groundY(sx), 'player').setOrigin(0.5, 1).setDepth(10);
    cam.stopFollow(); // 相机改为 update 内手动平滑驱动，保证遮罩/光孔与玩家同帧对位

    // 油灯必须来自新流程的土陶小游戏；只对已完成该小游戏的存档补写显示状态。
    if (G.state.lampWorkshopDone && !G.state.lampOwned) G.state.lampOwned = true;
    const firstDescent = !G.state.undergroundVisited;
    G.state.undergroundVisited = true;
    G.state.sceneId = 'Tunnel'; G.state.lastSeg = this.segKey;

    // ---- 黑暗遮罩（屏幕空间CanvasTexture；scrollFactor0对象仍受zoom影响，纹理放大1/zoom居中） ----
    // 遮罩纹理取半分辨率：光斑边缘本就是模糊渐变，2×放大视觉不变，每帧填充/上传开销降至1/4
    if (this.textures.exists('ua_dark')) this.textures.remove('ua_dark');
    this.darkTex = this.textures.createCanvas('ua_dark', VIEW_W / 2, VIEW_H / 2);
    this.darkImg = this.add.image(VIEW_W / 2, VIEW_H / 2, 'ua_dark')
      .setOrigin(0.5).setDisplaySize(VIEW_W / ZOOM, VIEW_H / ZOOM)
      .setScrollFactor(0).setDepth(50);

    // ---- 粒子（清淤扬尘） ----
    this.dustFx = this.add.particles(0, 0, 'dust', {
      speed: { min: 40, max: 160 }, angle: { min: 200, max: 340 },
      gravityY: 320, lifespan: { min: 300, max: 650 },
      scale: { start: 1.1, end: 0 }, alpha: { start: 0.9, end: 0 }, emitting: false,
    }).setDepth(12);

    // ---- 交互提示牌（宽度随文本自适应） ----
    this.prompt = this.add.container(0, 0).setDepth(60).setVisible(false);
    this.promptPanel = skinFrame(this, 'notice', -240, -40, 480, 80, { cuts: [0.25, 0.14, 0.3, 0.3] }).setDepth(60);
    this.promptText = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '25px', color: '#4a2f1a', resolution: 2,
    }).setOrigin(0, 0.5).setDepth(61);
    this.prompt.add([this.promptPanel, this.promptText]);
    this._lastLabel = null;

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,F,T,R,ESC,SHIFT');
    this.input.keyboard.addCapture('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,F,T,R,ESC,SHIFT');

    if (!G.ui) this.scene.launch('UI');
    this.time.delayedCall(400, () => {
      if (this.groundEditor) { // ?ground=1 校准模式：不推进剧情、不写存档
        setGoal('地面线校准：' + this.segKey + '（' + (this.groundLine === 'post' ? '修复后' : '修复前') + '）');
        setHint('校准模式：画好后按 P，复制控制台输出');
        return;
      }
      setGoal(this.goalText()); setHint('A/D 移动 · 空格 跳跃 · F 油灯 · E 互动 · Esc 退出 · Shift 加速(调试)');
      if (G.ui && firstDescent) { // §06：首次照明教学在首次下井的井底触发，与下井的井无关
        G.ui.toast.show(`进入${SEG_TITLES[this.segKey]}`, '井底落脚区 · 按 F 点亮土陶小油灯');
      }
      SaveService.save();
    });
    if (location.search.includes('ground')) this.initGroundEditor();

  }

  // -------- 目标文案（§05/§15：只追踪当前障碍） --------
  goalText() {
    const s = G.state;
    if (this.segKey === 'UA') {
      if (!s.uaInspected) return '检查本段的水痕和水流';
      return '沿梯返回地表，清理第二口井';
    }
    if (!s.ub.done) return '巡查暗渠：中段清淤取障';
    if (!s.uc.done) return this.segKey === 'UC' ? '检查并修补旧渠缘的缺口'
                                                : '回地表从第三口井布梯下井，修补缺口';
    if (!s.verified) return '到下游参照石复查通水';
    return '沿梯返回地表，向守井人汇报';
  }

  get locked() {
    const d = G.ui && G.ui.dialogue;
    return this.fading || !!(G.ui && G.ui.modalOpen) || !!d && (d.isOpen || this.time.now - d.closedAt < 180);
  }

  // 局部作业模式的活动范围
  get zoneBounds() {
    if (!this.local) return [60, W - 60];
    const cx = this.local.kind === 'silt' ? this.seg.siltX : this.seg.patchX;
    return [cx - 300, cx + 300];
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const k = this.keys, jd = c => Phaser.Input.Keyboard.JustDown(c);
    const p = this.player;

    if (!this.locked) {
      let dir = 0;
      if (k.A.isDown || k.LEFT.isDown) dir -= 1;
      if (k.D.isDown || k.RIGHT.isDown) dir += 1;
      if (dir) {
        const speed = 220 * (k.SHIFT.isDown ? 3 : 1); // Shift×3为调试加速
        const [lo, hi] = this.zoneBounds;
        p.x = Phaser.Math.Clamp(p.x + dir * speed * dt, lo, hi);
        p.setFlipX(dir < 0);
      }
      if (this.onGround && jd(k.SPACE)) { this.vy = -500; this.onGround = false; } // 井底小跳（头顶净高270）
      if (jd(k.F)) {
        if (G.state.lampOwned) {
          G.state.lampOn = !G.state.lampOn; // §12：F 开关油灯
          this.cameras.main.flash(120, 60, 44, 18);
        }
      }
      if (jd(k.ESC) && this.local) this.exitLocal();   // §13/§14：退出作业并保留进度
    }

    if (!this.onGround) { this.vy += 1900 * dt; p.y += this.vy * dt; }
    const gy = this.seg.groundY(p.x);
    if (this.onGround) {
      p.y = gy; // 贴地行走：y 跟随地形折线
    } else if (p.y >= gy && this.vy >= 0) {
      p.y = gy; this.vy = 0; this.onGround = true;
    }

    // 相机手动平滑跟随（取注视点略高于脚底），并按边界钳制
    const cam = this.cameras.main;
    const tx = p.x - VIEW_W / (2 * cam.zoom);
    const ty = p.y - 120 - VIEW_H / (2 * cam.zoom);
    const kMove = Math.min(1, dt * 6);
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX + (tx - cam.scrollX) * kMove, 0, W - VIEW_W / cam.zoom);
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY + (ty - cam.scrollY) * kMove, 0, H - VIEW_H / cam.zoom);

    // 井底不互通：三段之间无跨段步行，移动范围由边界钳制自然拦住

    if (!this.locked) this.handleInteract(jd);
    this.syncLamp();
    this.syncLocalMarkers();
    this.updatePrompt();
    this.redrawDark();
  }

  // -------- 交互分发 --------
  handleInteract(jd) {
    if (this.groundEditor) return; // 校准模式屏蔽剧情交互
    if (!jd(this.keys.E)) return;
    if (this.local) { this.localE(); return; }
    const x = this.player.x, seg = this.seg, s = G.state;
    if (Math.abs(x - seg.shaftX) <= 150) { this.tryAscend(); return; }
    if (seg.inspectX && !s.uaInspected && Math.abs(x - seg.inspectX) <= 180) {
      this.tryInspectUA(); return;
    }
    if (seg.siltX && !s.ub.done && Math.abs(x - seg.siltX) <= 220) { this.tryEnterLocal('silt'); return; }
    if (seg.patchX && !s.uc.done && Math.abs(x - seg.patchX) <= 200) { this.tryEnterLocal('patch'); return; }
    if (seg.checkX && !s.verified && Math.abs(x - seg.checkX) <= 160) { this.tryVerify(); return; }
  }

  updatePrompt() {
    if (this.groundEditor) { this.prompt.setVisible(false); return; }
    if (this.locked) { this.prompt.setVisible(false); return; }
    const x = this.player.x, seg = this.seg, s = G.state;
    let label = null, px = x, py = this.seg.groundY(x) - 250;
    if (this.local) {
      label = this.localPrompt();
      px = this.local.kind === 'silt' ? seg.siltX : seg.patchX;
      py = this.seg.groundY(px) - 195;
    } else if (Math.abs(x - seg.shaftX) <= 150) {
      label = s.wells[seg.well].ladder ? 'E：沿梯返回地表' : 'E：查看井口（未布梯）';
      px = seg.shaftX; py = this.seg.groundY(px) - 320;
    } else if (seg.inspectX && !s.uaInspected && Math.abs(x - seg.inspectX) <= 180) {
      label = s.lampOn ? 'E：检查水痕和水流' : '油灯未点亮（F），看不清水痕';
      px = seg.inspectX;
    } else if (seg.siltX && !s.ub.done && Math.abs(x - seg.siltX) <= 220) {
      label = s.lampOn ? 'E：进入清淤作业' : '油灯未点亮（F），看不清作业区';
      px = seg.siltX;
    } else if (seg.patchX && !s.uc.done && Math.abs(x - seg.patchX) <= 200) {
      label = s.lampOn ? 'E：打开修渠工作台' : '油灯未点亮（F），看不清缺口';
      px = seg.patchX;
    } else if (seg.checkX && !s.verified && Math.abs(x - seg.checkX) <= 160) {
      label = s.lampOn ? 'E：照亮参照石，复查通水' : '油灯未点亮（F），看不到参照石';
      px = seg.checkX;
    }
    if (!label) { this.prompt.setVisible(false); return; }
    this.prompt.setVisible(true);
    this.setPromptLabel(label);
    this.prompt.setPosition(Phaser.Math.Clamp(px, 240, W - 240), py);
  }

  setPromptLabel(label) { // 提示牌宽度随文本自适应
    if (label === this._lastLabel) return;
    this._lastLabel = label;
    this.promptText.setText(label);
    const w = Math.ceil(this.promptText.width) + 148;
    this.promptPanel.setPosition(-w / 2, -40).resize(w, 80);
    this.promptText.setPosition(-w / 2 + 76, 0);
  }

  // -------- 井筒 / 边缘 / 复查 --------
  tryAscend() { // §10：未布梯的井不能成为无条件逃生传送门
    if (G.state.wells[this.seg.well].ladder) {
      this.fading = true;
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.time.delayedCall(380, () => this.scene.start('Surface', { spawnWell: this.seg.well }));
    } else {
      G.ui.dialogue.open(LINES.shaftClosed);
    }
  }

  tryInspectUA() {
    if (this.segKey !== 'UA' || G.state.uaInspected) return;
    if (!G.state.lampOn) {
      G.ui.toast.show('检查暂停', '先点亮油灯（F）后才能看清水痕');
      return;
    }
    G.ui.dialogue.open(LINES.uaInspect, () => {
      G.state.uaInspected = true;
      G.ui.toast.show('检查完成', '水流仍在，回地面清理第二口井');
      setGoal(this.goalText());
      SaveService.save();
    });
  }

  tryVerify() { // §15：复查 = 清淤 AND 修补 都完成
    const s = G.state;
    if (!s.lampOn) { G.ui.toast.show('复查', '先用油灯照亮参照石（F）'); return; }
    if (!s.ub.done) { G.ui.dialogue.open(LINES.hintSilt); return; }
    if (!s.uc.done) { G.ui.dialogue.open(LINES.hintPatch); return; }
    G.ui.dialogue.open(LINES.verified, () => {
      s.verified = true;
      G.ui.toast.show('复查完成', '本段通水状态改善，写入维护记录');
      setGoal(this.goalText());
      SaveService.save();
    });
  }

  // ============================================================
  // 局部作业模式（§13 清淤 / §14 补口）：镜头推近，范围内作业，Esc 退出保留进度
  // ============================================================
  tryEnterLocal(kind) {
    if (!G.state.lampOn) { G.ui.toast.show('作业区', '先点亮油灯（F）照清问题位置'); return; }
    if (kind === 'patch') { this.openPatchWorkshop(); return; }
    this.local = { kind };
    const cx = this.seg.siltX;
    // 仅推近镜头，居中交给 update 里的相机驱动
    this.tweens.add({ targets: this.cameras.main, zoom: 1.25, duration: 420, ease: 'Cubic.inOut' });
  }

  openPatchWorkshop() {
    const open = () => {
      if (!G.ui || !G.ui.openPatchRepair) return;
      G.ui.openPatchRepair(() => {
        G.state.uc.done = true;
        this.cameras.main.flash(700, 120, 110, 90);
        if (this.seg.bgFixed && this.textures.exists(this.seg.bgFixed)) this.bg.setTexture(this.seg.bgFixed);
        G.ui.toast.show('修补完成', '缺口已稳住，水流可以继续通过');
        setGoal(this.goalText());
        SaveService.save();
      });
    };
    if (!G.state.patchIntroSeen) {
      G.state.patchIntroSeen = true;
      SaveService.save();
      G.ui.dialogue.open(LINES.patchIntro, open);
    } else open();
  }

  exitLocal() {
    this.local = null;
    this.clearLocalMarkers();
    // 退出局部作业：镜头拉回标准视野（作业时推近到1.25×）
    this.tweens.add({ targets: this.cameras.main, zoom: ZOOM, duration: 380, ease: 'Cubic.inOut' });
    SaveService.save();
  }

  // ---- U-B 清淤目标（§13：S0两遍 → R1/R2任选先后 → R3被挡 → S1两遍） ----
  ubTargets() {
    const st = G.state.ub, cx = this.seg.siltX;
    const t = [];
    if (st.s0 < 2) t.push({ x: cx, kind: 'S0', label: `E：扫开表层松沙（${st.s0}/2）` });
    else {
      if (!st.r1) t.push({ x: cx - 150, kind: 'R1', label: 'E：移开碎石 R1' });
      if (!st.r2) t.push({ x: cx + 170, kind: 'R2', label: 'E：移开碎石 R2' });
      if (!st.r3) t.push({ x: cx + 10, kind: 'R3', label: 'E：取出内侧碎石 R3' });
      if (st.r1 && st.r2 && st.r3 && st.s1 < 2) t.push({ x: cx, kind: 'S1', label: `E：清走残余淤积（${st.s1}/2）` });
    }
    return t;
  }

  localPrompt() {
    if (!G.state.lampOn) return '油灯未点亮（F），无法继续作业';
    const ts = this.ubTargets();
    if (!ts.length) return '清淤完成，按 Esc 退出观察水路';
    return this.nearest(ts).label;
  }

  nearest(ts) {
    return ts.sort((a, b) => Math.abs(this.player.x - a.x) - Math.abs(this.player.x - b.x))[0];
  }

  localE() { // 作业模式下的 E
    if (!G.state.lampOn) { G.ui.toast.show('作业暂停', '点亮油灯（F）后才能继续'); return; }
    const cx = this.seg.siltX;
    const gy = this.seg.groundY(cx);
    const ub = G.state.ub, ts = this.ubTargets();
    if (!ts.length) { this.finishSilt(); return; }
    const near = this.nearest(ts);
    this.dustFx.explode(10, near.x, gy - 60);
    if (near.kind === 'S0') ub.s0++;
    else if (near.kind === 'S1') ub.s1++;
    else if (near.kind === 'R3' && !(ub.r1 && ub.r2)) { // §13：提前取出只轻晃并停住
      this.cameras.main.shake(120, 0.004);
      G.ui.toast.show('取出失败', '内侧碎石被两侧挡住，先移开 R1 / R2');
      return;
    } else ub[near.kind.toLowerCase()] = true;
    if (ub.s0 >= 2 && ub.r1 && ub.r2 && ub.r3 && ub.s1 >= 2) this.finishSilt();
  }

  finishSilt() {
    const st = G.state.ub;
    if (st.done) return;
    st.done = true;
    this.exitLocal();
    // §15：空间变化——U-B 作业区先变化（草稿用前后底图切换演示）
    this.cameras.main.flash(700, 120, 110, 90);
    this.time.delayedCall(500, () => this.bg.setTexture('MAP_UB'));
    G.ui.dialogue.open(LINES.siltFixed, () => setGoal(this.goalText()));
    SaveService.save();
  }

  clearLocalMarkers() {
    this.localMarkers.forEach(m => m.destroy());
    this.localMarkers = [];
  }

  syncLocalMarkers() { // 作业模式内显示剩余目标的菱形标记
    if (!this.local || this.locked) { if (this.localMarkers.length) this.clearLocalMarkers(); return; }
    const gy = this.seg.groundY(this.seg.siltX);
    const ts = this.ubTargets();
    while (this.localMarkers.length < ts.length) {
      this.localMarkers.push(this.add.image(0, 0, 'diamond').setDepth(13));
    }
    this.localMarkers.forEach((m, i) => {
      const vis = i < ts.length;
      m.setVisible(vis);
      if (vis) m.setPosition(ts[i].x, gy - 150 - (i % 2) * 40 + Math.sin(this.time.now / 300 + i) * 4);
    });
  }

  // -------- 黑暗遮罩（§11） --------
  redrawDark() {
    if (this.groundEditor) return; // 校准模式关闭黑暗遮罩，看清整张图
    // 变化检测：灯焰摇曳量化到 ~12Hz；玩家/相机/开关灯都没变时跳过重绘（行走时仍逐帧跟随）
    const cam = this.cameras.main;
    const key = Math.floor(this.time.now / 85) + '|' + G.state.lampOn + '|' + (this.player.flipX ? 1 : 0) +
      '|' + Math.round(this.player.x) + ',' + Math.round(this.player.y) +
      '|' + Math.round(cam.scrollX) + ',' + Math.round(cam.scrollY) + '|' + cam.zoom.toFixed(3);
    if (key === this._darkKey) return;
    this._darkKey = key;

    const SS = 0.5; // 遮罩纹理半分辨率缩放
    const ctx = this.darkTex.context;
    const K = cam.zoom;
    this.darkImg.setDisplaySize(VIEW_W / K, VIEW_H / K);
    // 纹理按 1/K 缩放显示、又被相机放大 K → 相机屏幕坐标与纹理坐标恒等；SS 折算纹理像素
    const s2 = (wx, wy) => [(wx - cam.scrollX) * K * SS, (wy - cam.scrollY) * K * SS];
    const L = r => r * K * SS; // 逻辑单位 → 纹理像素
    const flash = G.state.lampOn;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, VIEW_W * SS, VIEW_H * SS);
    ctx.fillStyle = 'rgba(4,2,1,0.94)';
    ctx.fillRect(0, 0, VIEW_W * SS, VIEW_H * SS);
    ctx.globalCompositeOperation = 'destination-out';

    const hole = (x, y, r, a, ys = 1) => {
      ctx.save(); ctx.translate(x, y); ctx.scale(1, ys);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    };

    // 井口自然光：锥形瓶光柱——按美术光柱实测重建（顶端井口中心648/半宽80，
    // 中段收窄，底部光池中心615/半宽170），侧边带弧度，顶端从画面外延伸确保照到最上面
    // 光柱中心随各段井筒走：以 U-A 实测校准（柱顶较井筒左移32 / 光池左移65），三段共用同一相对位
    const shaftX = this.seg.shaftX;
    const floorY = this.seg.groundY(shaftX) - 8;
    const mTopX = shaftX - 32, mTopW = 80, mBotX = shaftX - 65, mBotW = 170;
    const topWorldY = -60; // 顶端延伸到画面外，保证从最上面照下来
    const [tx, ty] = s2(mTopX, topWorldY);
    const [bx, by] = s2(mBotX, floorY);
    const wT = L(mTopW), wB = L(mBotW);
    const midY = (ty + by) / 2;
    ctx.save();
    const lg = ctx.createLinearGradient(0, ty, 0, by);
    lg.addColorStop(0, 'rgba(0,0,0,0.45)');
    lg.addColorStop(0.6, 'rgba(0,0,0,0.8)');
    lg.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.filter = `blur(${Math.round(L(16))}px)`; // 亮暗交界短距离渐变（边缘羽化）
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(tx - wT, ty);
    // 左右侧边：二次贝塞尔，中段向中心收窄（瓶身弧度）
    ctx.quadraticCurveTo((tx - wT + bx - wB) / 2 + L(30), midY, bx - wB, by);
    ctx.lineTo(bx + wB, by);
    ctx.quadraticCurveTo((tx + wT + bx + wB) / 2 - L(30), midY, tx + wT, ty);
    ctx.closePath(); ctx.fill();
    ctx.filter = 'none';
    // 井底光池
    hole(bx, by - L(30), L(230), 0.9, 0.5);
    ctx.restore();

    // 近身柔光：半径82逻辑单位（§11）；关灯时仅存弱轮廓
    // 油灯：提在朝向一侧；照明椭圆以灯焰为中心
    const dir = this.player.flipX ? -1 : 1;
    const lampWX = this.player.x + dir * 84, lampWY = this.player.y - 84;
    const [lx, ly] = s2(lampWX, lampWY);

    if (flash) {
      // 灯焰轻微摇曳，光区随之呼吸；短轴=暗渠净高270（半短轴135），长半轴300
      const t = this.time.now / 1000;
      const flicker = 1 + 0.05 * Math.sin(t * 7) + 0.03 * Math.sin(t * 13);
      hole(lx, ly, L(600) * flicker, 0.92, 0.9);
      hole(lx, ly, L(300) * flicker, 0.95, 0.9);    // 灯下暖亮核心
    }
    // 未点亮：不留任何光斑，井下全黑（弱环境底亮仅隐约可辨轮廓）

    ctx.globalCompositeOperation = 'source-over';
    this.darkTex.refresh();
  }

  syncLamp() { // 手中的油灯贴图：跟随朝向，点亮(火苗)/熄灭(无焰)切换贴图，不用透明度
    const s = G.state;
    if (!s.lampOwned) { if (this.lampImg) { this.lampImg.destroy(); this.lampImg = null; } return; }
    const dir = this.player.flipX ? -1 : 1, lit = s.lampOn;
    // 深度低于黑暗遮罩：灯体与玩家同样被黑幕罩住，只在井口自然光或灯焰光区里显形
    if (!this.lampImg) this.lampImg = this.add.image(0, 0, 'LAMP_R').setDepth(12);
    this.lampImg.setTexture(dir < 0 ? (lit ? 'LAMP_L' : 'LAMP_L_OFF')
                                    : (lit ? 'LAMP_R' : 'LAMP_R_OFF'))
      .setPosition(this.player.x + dir * 58, this.player.y - 62)
      .setDisplaySize(80, Math.round(80 * this.lampImg.height / this.lampImg.width));
  }

  // ============================================================
  // ?ground=1 地面线校准（修复后地面）：鼠标拖拽锚点编辑工作副本
  // （localStorage 持久防丢），P 打印 JSON 用于回填 GROUND_U_POST，X 恢复默认
  // ============================================================
  initGroundEditor() {
    const seg = this.segKey;
    if (!GROUND_U_PRE[seg] || !GROUND_U_POST[seg]) return;
    this.groundEditor = true;
    // 编辑对象：URL line=pre/post 指定（默认修复后），T 可在修复前/后两套线间切换
    const lm = location.search.match(/line=(pre|post)/);
    const initData = this.scene.settings.data;
    this.groundLine = (initData && initData.line) || (lm ? lm[1] : 'post');
    this.darkImg.setVisible(false); // 校准需要看清整张图

    const g = this.add.graphics().setDepth(90);
    const hint = this.add.text(VIEW_W / 2, 20, '', {
      fontFamily: FONT, fontSize: '20px', color: '#ffe08a', resolution: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(120).setStroke('#1a120b', 4);
    const coordT = this.add.text(VIEW_W / 2, 50, '', {
      fontFamily: FONT, fontSize: '20px', color: '#d8cdb2', resolution: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(120).setStroke('#1a120b', 4);

    let selected = -1, dragging = false;
    const calKey = () => seg + '_' + this.groundLine;   // 修复前/后两套线分开存取
    const baseLine = () => (this.groundLine === 'post' ? GROUND_U_POST[seg] : GROUND_U_PRE[seg]);
    const otherLine = () => (this.groundLine === 'post' ? GROUND_U_PRE[seg] : GROUND_U_POST[seg]);
    const line = () => GROUND_CAL[calKey()];
    const initCopy = () => { // 工作副本：沿用校准（若有），否则从对应默认线复制
      if (!Array.isArray(line()) || line().length < 2) {
        GROUND_CAL[calKey()] = baseLine().map(p => [p[0], p[1]]);
      }
    };
    const applyBg = () => { // 底图跟随编辑对象：修复前看淤积/破损图，修复后看干净/修复图
      const tex = this.groundLine === 'post'
        ? (this.seg.bgFixed || this.seg.bg)
        : (this.seg.bgSilt || this.seg.bg);
      if (this.textures.exists(tex)) this.bg.setTexture(tex);
    };
    const refresh = () => {
      window.__GROUND_EDIT = { seg, line: this.groundLine }; // 告诉 groundUAt 当前试哪条线
      initCopy();
      applyBg();
      hint.setText('地面线校准 · ' + seg + '（' + (this.groundLine === 'post' ? '修复后' : '修复前·淤积态') + '）—— 拖拽锚点 / 点线上插点 / Del 删点 / 方向键微调(Shift×10) / T 切换修复前后 / P 打印JSON / X 恢复默认 / 1 2 3 切段');
    };
    const print = () => {
      const data = line().map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
      console.log((this.groundLine === 'post' ? 'GROUND_U_POST.' : 'GROUND_U_PRE.') + seg + ' = ' + JSON.stringify(data));
    };
    const clampX = (i, x) => {
      const pts = line();
      const lo = i > 0 ? pts[i - 1][0] + 2 : 0;
      const hi = i < pts.length - 1 ? pts[i + 1][0] - 2 : W;
      return Phaser.Math.Clamp(x, lo, hi);
    };
    const redraw = () => {
      g.clear();
      for (const [x, y] of otherLine()) g.fillStyle(0x9a8a7a, 0.4).fillCircle(x, y, 3); // 另一套线参照
      g.lineStyle(4, 0x35d07f, 1).beginPath();
      line().forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
      g.strokePath();
      line().forEach(([x, y], i) => {
        g.fillStyle(i === selected ? 0xffe08a : 0x35d07f, 1).fillCircle(x, y, i === selected ? 9 : 6);
        if (i === selected) g.lineStyle(2, 0xc9973f, 1).strokeCircle(x, y, 14);
      });
      coordT.setText(selected >= 0
        ? `锚点${selected}: ${Math.round(line()[selected][0] * 10) / 10}, ${Math.round(line()[selected][1] * 10) / 10}`
        : '绿色线=正在编辑的地面线（角色脚底），灰点=另一套线参照');
    };
    const persist = () => { saveGroundCal(); print(); redraw(); };

    this.input.on('pointerdown', p => {
      const wx = p.worldX, wy = p.worldY, pts = line();
      for (let i = 0; i < pts.length; i++) {
        if (Phaser.Math.Distance.Between(wx, wy, pts[i][0], pts[i][1]) <= 20) {
          selected = i; dragging = true; redraw(); return;
        }
      }
      for (let i = 1; i < pts.length; i++) { // 点在折线附近 → 插入锚点
        const x0 = pts[i - 1][0], x1 = pts[i][0];
        if (wx < Math.min(x0, x1) - 8 || wx > Math.max(x0, x1) + 8) continue;
        const y = lineAt(pts, wx);
        if (Math.abs(wy - y) <= 24) {
          pts.splice(i, 0, [wx, y]);
          selected = i; dragging = true; persist(); return;
        }
      }
      selected = -1; redraw();
    });
    this.input.on('pointermove', p => {
      if (!dragging || selected < 0) return;
      const pts = line();
      pts[selected][0] = clampX(selected, p.worldX);
      pts[selected][1] = Phaser.Math.Clamp(p.worldY, 0, H);
      redraw();
    });
    this.input.on('pointerup', () => { if (dragging) { dragging = false; persist(); } });

    const moveSel = (dx, dy, step) => {
      if (selected < 0) return;
      const pts = line();
      pts[selected][0] = clampX(selected, pts[selected][0] + dx * step);
      pts[selected][1] = Phaser.Math.Clamp(pts[selected][1] + dy * step, 0, H);
      persist();
    };
    const kb = this.input.keyboard;
    kb.on('keydown-LEFT', e => moveSel(-1, 0, e.shiftKey ? 10 : 1));
    kb.on('keydown-RIGHT', e => moveSel(1, 0, e.shiftKey ? 10 : 1));
    kb.on('keydown-UP', e => moveSel(0, -1, e.shiftKey ? 10 : 1));
    kb.on('keydown-DOWN', e => moveSel(0, 1, e.shiftKey ? 10 : 1));
    const delSel = () => { if (selected >= 0 && line().length > 2) { line().splice(selected, 1); selected = -1; persist(); } };
    kb.on('keydown-DEL', delSel);
    kb.on('keydown-BACKSPACE', delSel);
    kb.on('keydown-P', print);
    kb.on('keydown-T', () => { // 切换编辑修复前/后两套线（底图与脚底试走线同步换）
      this.groundLine = this.groundLine === 'post' ? 'pre' : 'post';
      selected = -1; refresh(); redraw(); print();
      setGoal('地面线校准：' + seg + '（' + (this.groundLine === 'post' ? '修复后' : '修复前') + '）');
    });
    kb.on('keydown-X', () => { // 恢复默认：清除当前线的校准覆盖，工作副本回到默认参数
      delete GROUND_CAL[calKey()]; saveGroundCal();
      initCopy(); // 仅编辑用副本，不落盘
      selected = -1; redraw(); print();
    });
    kb.on('keydown-ONE', () => this.scene.restart({ seg: 'UA', line: this.groundLine }));
    kb.on('keydown-TWO', () => this.scene.restart({ seg: 'UB', line: this.groundLine }));
    kb.on('keydown-THREE', () => this.scene.restart({ seg: 'UC', line: this.groundLine }));
    refresh();
    redraw();
    console.log('[地面线校准] 当前 ' + seg + ' ' + (this.groundLine === 'post' ? '修复后' : '修复前') + '线：' + JSON.stringify(line()));
  }
}
