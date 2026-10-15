// ============================================================
// 地表场景（S）：移动/跳跃/交互 + 清井 + 寻物 + 制作 + 布梯下井
// 玩法对应 §05 任务流程 T01—T06、§07 玩法A、§08 玩法B、§09 制作
// ============================================================

class SurfaceScene extends Phaser.Scene {
  constructor() { super('Surface'); }
  init(data) {
    this.spawnWell = (data && data.spawnWell != null) ? data.spawnWell : null;
    if (this.spawnWell == null && G.restored && G.state.lastWell != null) this.spawnWell = G.state.lastWell;
  }

  create() {
    G.state.sceneId = 'Surface';
    this.fading = false; this.vy = 0; this.onGround = true;
    this.lampImg = null; // 场景重启后旧引用已销毁
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H).setZoom(ZOOM).fadeIn(350, 0, 0, 0);

    this.add.image(0, 0, 'MAP_S').setOrigin(0, 0).setDisplaySize(W, H).setDepth(0);

    // ---- 三口井：贴图与底图烘焙土堆对齐（§17 未清理状态层） ----
    this.wellImgs = WELL_SPRITE_CONF.map(c => {
      const i = WELL_SPRITE_CONF.indexOf(c);
      const img = this.add.image(c.x, c.y, c.tex).setOrigin(0.5, 1).setDepth(5)
        .setVisible(!G.state.wells[i].cleared);
      img.setDisplaySize(c.w, c.w * img.height / img.width);
      return img;
    });

    // （布梯后不再显示绳梯贴图：布设即下井，转场画面由后续视频替代）

    // ---- 守井人保留矩形；主角复用第一关的动画素材 ----
    this.npc = this.add.image(SURF.npcX, surfaceGroundY(SURF.npcX) + 6, 'npc')
      .setOrigin(0.5, 1).setDepth(10);
    this.add.text(SURF.npcX, surfaceGroundY(SURF.npcX) - 206, '守井人', {
      fontFamily: FONT, fontSize: '20px', color: '#f7ecd4', resolution: 2,
    }).setOrigin(0.5).setDepth(11).setStroke('#1a120b', 4);

    const sx = this.spawnWell != null ? SURF.wells[this.spawnWell] + 64 : 460; // 与守井人留出完整角色宽度
    this.player = HeroActor.create(this, sx, surfaceGroundY(sx), this.spawnWell != null && sx > W / 2 ? -1 : 1);
    cam.stopFollow(); // 相机改为 update 内手动平滑驱动

    // ---- 材料点标记（发现缺梯后显示） ----
    this.markers = {};
    for (const k of ['A', 'B', 'C']) {
      const m = this.add.image(SURF.mats[k], surfaceGroundY(SURF.mats[k]) - 300, 'diamond')
        .setDepth(6).setVisible(G.state.ladderProblemFound && !G.state.materials[k]);
      this.tweens.add({ targets: m, y: '-=14', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.markers[k] = m;
    }

    // ---- 粒子（草屑/扬尘） ----
    this.dust = this.add.particles(0, 0, 'dust', {
      speed: { min: 40, max: 170 }, angle: { min: 200, max: 340 },
      gravityY: 320, lifespan: { min: 300, max: 700 },
      scale: { start: 1.1, end: 0 }, alpha: { start: 0.9, end: 0 }, emitting: false,
    }).setDepth(9);
    this.grass = this.add.particles(0, 0, 'grassbit', {
      speed: { min: 60, max: 200 }, angle: { min: 210, max: 330 },
      gravityY: 420, lifespan: { min: 350, max: 800 },
      scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 }, emitting: false,
    }).setDepth(9);

    // ---- 交互提示牌（世界空间，宽度随文本自适应） ----
    this.prompt = this.add.container(0, 0).setDepth(60).setVisible(false);
    this.promptPanel = skinFrame(this, 'notice', -240, -40, 480, 80, { cuts: [0.25, 0.14, 0.3, 0.3] }).setDepth(60);
    this.promptText = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '25px', color: '#4a2f1a', resolution: 2,
    }).setOrigin(0, 0.5).setDepth(61);
    this.prompt.add([this.promptPanel, this.promptText]);
    this._lastLabel = null;

    // ---- 输入 ----
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E');
    this.input.keyboard.addCapture('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E');

    if (!G.ui) this.scene.launch('UI');
    this.time.delayedCall(400, () => {
      setGoal(this.goalText()); setHint('A/D 移动 · 空格 跳跃 · E 互动');
      if (!G.state.introDone && !this.spawnWell && G.ui) {
        G.ui.toast.show('时间织城 · 第二关 坎儿井', '先去找守井人，了解小镇缺水的原因');
      }
    });
  }

  // -------- 任务目标（§05：任务提示只追踪当前障碍） --------
  goalText() {
    const s = G.state;
    if (!s.introDone) return '与守井人对话，接受实践任务';
    if (!s.wells[0].cleared) return '清理第一口井的井缘';
    if (!s.ladderProblemFound) return '按 E 检查第一口井';
    if (!s.ladderWorkshopDone && matsCount() < 3) {
      return `寻找制作材料：旧绳索${s.materials.A ? 1 : 0}/1 · 横踏杆${s.materials.B ? 1 : 0}/1 · 绑扎物${s.materials.C ? 1 : 0}/1`;
    }
    if (!s.ladderWorkshopDone) return '返回守井人处制作绳梯';
    if (!s.lampWorkshopDone) return '在守井人棚屋制作土陶小油灯';
    if (!s.wells[0].ladder) return '在第一口井布设绳梯下井';
    if (!s.uaInspected) return '下井检查上游暗渠的水痕和水流';
    if (!s.wells[1].cleared) return '清理第二口井的井缘';
    if (!s.wells[1].ladder) return '在第二口井布设绳梯下井';
    if (!s.ub.done) return '下井清理中段暗渠的堵塞';
    if (!s.wells[2].cleared) return '清理第三口井的井缘';
    if (!s.wells[2].ladder) return '在第三口井布设绳梯下井';
    if (!s.uc.done) return '下井修复下游暗渠的坍塌段';
    if (!s.verified) return '到下游暗渠复查通水';
    if (!s.recordSaved) return '回守井人处保存维护记录';
    return '章节完成 · 可自由探索';
  }

  get locked() {
    const d = G.ui && G.ui.dialogue;
    return this.fading || !!(G.ui && G.ui.modalOpen) || !!d && (d.isOpen || this.time.now - d.closedAt < 180);
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const k = this.keys, jd = c => Phaser.Input.Keyboard.JustDown(c);
    const p = this.player;
    const previousX = p.x;
    let direction = 0;
    const moveSpeed = 220;

    if (!this.locked) {
      let dir = 0;
      if (k.A.isDown || k.LEFT.isDown) dir -= 1;
      if (k.D.isDown || k.RIGHT.isDown) dir += 1;
      if (dir) {
        p.x = Phaser.Math.Clamp(p.x + dir * moveSpeed * dt, 60, W - 60);
        direction = dir;
      }
      if (this.onGround && jd(k.SPACE)) { this.vy = -780; this.onGround = false; } // 跳跃仅空格
    }

    if (!this.onGround) { this.vy += 1900 * dt; p.y += this.vy * dt; }
    const gy = surfaceGroundY(p.x);
    if (this.onGround) {
      p.y = gy; // 贴地行走：y 跟随地形折线
    } else if (p.y >= gy && this.vy >= 0) {
      p.y = gy; this.vy = 0; this.onGround = true;
    }

    HeroActor.update(p, direction, p.x !== previousX, this.onGround, moveSpeed);

    // 相机手动平滑跟随（水平为主，垂直整幅可见无需滚动）
    const cam = this.cameras.main;
    const kMove = Math.min(1, dt * 6);
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX + (p.x - VIEW_W / (2 * cam.zoom) - cam.scrollX) * kMove, 0, W - VIEW_W / cam.zoom);
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY + (p.y - 160 - VIEW_H / (2 * cam.zoom) - cam.scrollY) * kMove, 0, H - VIEW_H / cam.zoom);

    // 最近可交互对象
    const it = this.nearestInteractable();
    if (it && !this.locked) {
      this.prompt.setVisible(true);
      this.setPromptLabel(it.label());
      const px = Phaser.Math.Clamp(it.x, 240, W - 240);
      this.prompt.setPosition(px, surfaceGroundY(it.x) - 250);
      if (jd(this.keys.E)) it.on();
    } else {
      this.prompt.setVisible(false);
    }

    // 携带的土陶油灯（制作后获得；朝向决定提在哪一侧，点亮/熄灭切换火苗/无焰贴图）
    const st = G.state;
    if (st.lampOwned) {
      if (!this.lampImg) this.lampImg = this.add.image(p.x, p.y - 60, 'LAMP_R').setDepth(12);
      const ldir = p.facing, lit = st.lampOn;
      this.lampImg.setTexture(ldir < 0 ? (lit ? 'LAMP_L' : 'LAMP_L_OFF')
                                        : (lit ? 'LAMP_R' : 'LAMP_R_OFF'))
        .setPosition(p.x + ldir * 58, p.y - 60)
        .setDisplaySize(68, Math.round(68 * this.lampImg.height / this.lampImg.width));
    }
  }

  setPromptLabel(label) { // 提示牌宽度随文本自适应
    if (label === this._lastLabel) return;
    this._lastLabel = label;
    this.promptText.setText(label);
    const w = Math.ceil(this.promptText.width) + 148;
    this.promptPanel.setPosition(-w / 2, -40).resize(w, 80);
    this.promptText.setPosition(-w / 2 + 76, 0);
  }

  nearestInteractable() {
    const s = G.state;
    const list = [
      { kind: 'keeper', x: SURF.npcX, r: 130, label: () => 'E：与守井人对话', on: () => this.talkKeeper() },
      // 井口按剧情阶段解锁：未解锁的井不显示提示也不可交互（§07 顺序）
      ...SURF.wells.map((x, i) => ({
        kind: 'well', x, r: 150, label: () => this.wellLabel(i), on: () => this.wellOn(i),
      })).filter((_w, i) => this.wellAvailable(i)),
      // 只有检查过 W01 后，材料点才成为可调查对象
      ...(s.ladderProblemFound ? ['A', 'B', 'C'].filter(k => !s.materials[k]).map(k => ({
        kind: 'material', x: SURF.mats[k], r: 120,
        label: () => `E：收取${MAT_NAMES[k]}`, on: () => this.matOn(k),
      })) : []),
    ].filter(it => Math.abs(this.player.x - it.x) <= it.r);

    // 井口按剧情解锁后，材料点与井口/守井人的提示不再冲突，直接按距离就近提示
    list.sort((a, b) => Math.abs(this.player.x - a.x) - Math.abs(this.player.x - b.x));
    return list[0] || null;
  }

  // 井口可交互的剧情条件（§05/§07 固定顺序）；不满足时该井完全隐去交互
  wellAvailable(i) {
    const s = G.state;
    if (i === 0) {
      if (!s.introDone) return false;               // 开场对话前不开放
      if (s.ladderProblemFound && !s.craftDone) return false; // 寻材料/制作阶段无需再看井口
      return true;
    }
    if (i === 1) return s.uaInspected;              // 检查过上游暗渠才开放第二口井
    if (i === 2) return s.ub.done;                  // 疏通中段才开放第三口井
    return false;
  }

  wellLabel(i) {
    const st = G.state.wells[i];
    if (st.weeds > 0) return 'E：清理井缘';
    if (i === 0 && !G.state.ladderProblemFound) return 'E：检查井口';
    if (st.ladder) return 'E：沿梯下井';
    if (G.state.craftDone && this.canDescendWell(i)) return 'E：布设绳梯下井';
    return 'E：查看井口';
  }

  canDescendWell(i) {
    const s = G.state;
    if (!s.craftDone || s.laddersLeft <= 0) return false;
    if (i === 0) return true;
    if (i === 1) return s.uaInspected;
    if (i === 2) return s.ub.done;
    return false;
  }

  burst(x, y, grass) {
    this.dust.explode(10, x, y);
    if (grass) this.grass.explode(8, x, y);
  }

  // ---- 交互实现 ----
  wellOn(i) {
    const s = G.state, st = s.wells[i];
    const wx = SURF.wells[i], wy = surfaceGroundY(wx) - 160;
    if (st.weeds > 0) {
      // 单次交互：杂草整体消失，露出原背景井口
      st.weeds = 0; st.cleared = true;
      this.burst(wx, wy, true);
      this.wellImgs[i].setVisible(false);
      G.ui.toast.show('井缘已清理', WELL_NAMES[i] + ' 状态：已清理');
      setGoal(this.goalText());
      SaveService.save();
    } else if (i === 0 && !s.ladderProblemFound) {
      G.ui.dialogue.open(LINES.w01check, () => {
        s.ladderProblemFound = true;
        for (const k of ['A', 'B', 'C']) this.markers[k].setVisible(true);
        G.ui.toast.show('任务更新', '寻找制作绳梯的三种材料');
        setGoal(this.goalText());
        SaveService.save();
      });
    } else if (st.ladder) {
      this.descend(i);
    } else if (this.canDescendWell(i)) {
      // 布设即下井：不做动画与绳梯贴图，转场画面后续由视频替代
      st.ladder = true; s.laddersLeft--;
      this.descend(i);
    } else {
      G.ui.dialogue.open(LINES.noLadder);
    }
  }

  matOn(k) {
    const s = G.state;
    if (!s.introDone || !s.ladderProblemFound) {
      G.ui.toast.show('材料点', '先询问守井人'); // §03：未接任务时的防误拾提示
      return;
    }
    if (s.materials[k]) return;
    s.materials[k] = true;
    this.markers[k].setVisible(false);
    this.burst(SURF.mats[k], surfaceGroundY(SURF.mats[k]) - 120, false);
    G.ui.toast.show('获得材料', `${MAT_NAMES[k]} ×1份（${matsCount()}/3）`);
    if (matsCount() === 3) G.ui.toast.show('任务更新', '材料齐全，返回守井人处制作梯具');
    setGoal(this.goalText());
    SaveService.save();
  }

  talkKeeper() {
    const s = G.state;
    if (!s.introDone) {
      G.ui.dialogue.open(LINES.intro, () => {
        s.introDone = true;
        G.ui.toast.show('任务更新', '先清理第一口井的井缘');
        setGoal(this.goalText());
        SaveService.save();
      });
    } else if (s.ladderProblemFound && matsCount() === 3 && !s.ladderWorkshopDone) {
      G.ui.dialogue.open(LINES.ladderInvite, () => {
        if (G.ui && G.ui.openWorkshop) G.ui.openWorkshop('ladder', () => {
          s.ladderWorkshopDone = true;
          s.laddersLeft = 3;
          G.ui.toast.show('绳梯完成', '三架绳梯已准备好，接下来制作土陶小油灯');
          setGoal(this.goalText());
          SaveService.save();
        });
      });
    } else if (s.ladderWorkshopDone && !s.lampWorkshopDone) {
      G.ui.dialogue.open(LINES.lampInvite, () => {
        if (G.ui && G.ui.openWorkshop) G.ui.openWorkshop('lamp', () => {
          s.lampWorkshopDone = true;
          s.craftDone = true;
          s.laddersLeft = 3;
          s.lampOwned = true;
          s.lampOn = false;
          G.ui.toast.show('下井准备完成', '获得 3 架绳梯 · 已获得土陶小油灯（下井后按 F 点亮）');
          setGoal(this.goalText());
          SaveService.save();
        });
      });
    } else if (s.undergroundVisited && !s.recordSaved) {
      // §15 完成条件：清淤 AND 修补 AND 复查，缺哪项说哪项
      if (!s.ub.done) G.ui.dialogue.open(LINES.hintSilt);
      else if (!s.uc.done) G.ui.dialogue.open(LINES.hintPatch);
      else if (!s.verified) G.ui.dialogue.open(LINES.hintVerify);
      else {
        G.ui.dialogue.open(LINES.report, () => {
          s.recordSaved = true; s.chapterComplete = true;
          G.ui.toast.show('章节完成', '本段维护记录已保存');
          setGoal(this.goalText());
          SaveService.save();
          ChapterBridge.complete('karez');
        });
      }
    } else if (s.recordSaved) {
      G.ui.dialogue.open(LINES.idleDone);
    } else if (s.craftDone) {
      G.ui.dialogue.open(LINES.idle);
    } else if (s.ladderProblemFound) {
      G.ui.dialogue.open(LINES.idleMats);
    } else {
      G.ui.dialogue.open(LINES.idleWell);
    }
  }

  descend(i) { // §10 固定转场：0.35s淡出 → 切场景 → 0.35s淡入
    // 首次布梯和重复沿梯下井都更新刷新后的返回位置。
    G.state.lastWell = i;
    SaveService.save();
    this.fading = true;
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.time.delayedCall(380, () => this.scene.start('Tunnel', { seg: ['UA', 'UB', 'UC'][i] }));
  }
}
