// ============================================================
// 时间织城 · 第二关 坎儿井
// 地表探索、绳梯与陶灯制作、井下清淤、修渠与复查
// 当前玩法说明：docs/游戏说明.md
// ============================================================

// 逻辑画布 3072×1024（§02）；渲染分辨率 1920×1080（FIT 缩放到窗口，保证文字清晰）
const W = 3072, H = 1024;
const VIEW_W = 1920, VIEW_H = 1080;
const ZOOM = VIEW_H / H;

// UI 字体：优先使用微软雅黑；不同系统名称不同，保留中文名和 UI 变体作为回退。
const FONT = '"Microsoft YaHei","微软雅黑","Microsoft YaHei UI",Arial,sans-serif';

// 美术资源版本号：替换 map-assets 内图片后递增，避免浏览器缓存旧图
const ASSET_V = 34;

// -------- 全局状态（§21 状态组子集） --------
const G = {
  state: {
    introDone: false,
    ladderProblemFound: false,
    materials: { A: false, B: false, C: false },
    ladderWorkshopDone: false,
    ladderAssembly: null,
    lampWorkshopDone: false,
    lampCraft: null,
    craftDone: false, laddersLeft: 0,
    lampOwned: false, lampOn: false,
    wells: [ // §07：W01三簇 / W02、W03各两簇
      { weeds: 3, cleared: false, ladder: false },
      { weeds: 2, cleared: false, ladder: false },
      { weeds: 2, cleared: false, ladder: false },
    ],
    // U-B 清淤（§13）：s0表层松沙0-2、r1/r2碎石、r3内石、s1残余淤积0-2
    ub: { s0: 0, r1: false, r2: false, r3: false, s1: 0, done: false },
    // U-C 修补（§14）：旧版 p/rot 保留兼容性；patch 保存独立工作台的中断进度。
    uc: { p: [null, null, null], rot: [0, 0, 0], patch: null, done: false },
    patchIntroSeen: false,  // §16 补口首入台词只播一次
    verified: false,        // T10 下游复查
    undergroundVisited: false,
    uaInspected: false,
    recordSaved: false, chapterComplete: false,
    lastWell: null, sceneId: 'Surface', // 存档定位（简化）
  },
  ui: null,
  goalText: '与守井人对话',
  hint: 'A/D 移动 · 空格 跳跃 · E 互动',
  restored: false,
};
const matsCount = () => ['A', 'B', 'C'].filter(k => G.state.materials[k]).length;

function setGoal(t) { G.goalText = t; if (G.ui) G.ui.setGoal(t); }
function setHint(t) { G.hint = t; if (G.ui) G.ui.setHint(t); }

// -------- 存档（§21 最小子集：里程碑提交 + localStorage） --------
const SaveService = {
  KEY: 'twc_l2_save', VER: 4,
  save() {
    Campaign.write(this.KEY, { v: this.VER, s: G.state, goal: G.goalText });
  },
  load() {
    try {
      const d = Campaign.read(this.KEY);
      if (d && d.v === this.VER && d.s && typeof d.s === 'object') return d;
    } catch (e) { /* 损坏存档不静默清空，视为无档 */ }
    return null;
  },
};
(function restore() {
  const d = SaveService.load();
  if (d) {
    Object.assign(G.state, d.s); G.restored = true; G.goalText = d.goal || G.goalText;
    // 旧版曾在首次下井时错误地写入油灯状态；没有完成制作就一律回收，避免旧存档跳过剧情。
    if (!G.state.lampWorkshopDone && (G.state.lampOwned || G.state.lampOn)) {
      G.state.lampOwned = false; G.state.lampOn = false; SaveService.save();
    }
  }
})();

// -------- 基线与点位 --------
// 折线取值：按美术实测锚点插值（锚点为逻辑坐标，来自对各图的图像分析）
const lineAt = (pts, x) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
};

// 地表：碰撞步行线 = 美术实测锚点折线。
const GROUND_S_ANCHORS = [[0, 537], [3072, 905.3]];
const surfaceGroundY = x => lineAt(GROUND_S_ANCHORS, x);

// 地下：清淤、修补前后使用对应的美术实测锚点。
const GROUND_U_PRE = {
  UA: [[0, 629], [503, 627.7], [581, 651.5], [743, 649.5], [814, 636.4], [3072, 639]],
  // UB 修复前：淤积沙堆段 1385—1734 隆起至约 570。
  UB: [[42,585],[636,590],[721,590],[891,591],[1103,597],[1284.3,598.6],[1385,600],[1433,572.4],[1530.9,569.7],[1600.2,583.4],[1662.1,602.8],[1734.3,631.7],[2036.4,638.6],[3059.8,631.7]],
  UC: [[42, 582], [595, 585.8], [679, 645], [720, 676.5], [827, 672], [878, 649], [933, 599], [2225, 626.8], [2291, 651], [2538, 657.9], [2630, 626.6], [3013, 631]],
};
const GROUND_U_POST = {
  UA: GROUND_U_PRE.UA.map(p => [p[0], p[1]]), // 上游地形不变。
  // UB 修复后 = 清淤后的干净水道步道（2026-10-03 与淤积态沙堆线分离，独立硬编码）
  UB: [[42,585],[636,590],[721,590],[891,591],[1103,597],[1273,600],[1443,601],[1612,603],[2037,609],[3013,609]],
  // UC 修复后：缺口段 677—981 已拉平至约 591—594。
  UC: [[42,582],[596,589],[677.4,591.7],[733.9,593.1],[805.6,593.1],[865,594.5],[980.8,594.5],[2162.6,620.7],[2245.3,623.4],[2291,651],[2538,657.9],[2601.2,627.6],[3013,631]],
};
// 清淤或修补完成后切换为对应的地面线。
const groundUAt = (seg, x) => {
  const post = (seg === 'UC' && G.state.uc.done) || (seg === 'UB' && G.state.ub.done);
  return lineAt(post ? GROUND_U_POST[seg] : GROUND_U_PRE[seg], x);
};

// 地下三段配置：坐标以当前草稿美术实测锚定，括注方案§02/§04目标值
// 井底不互通（2026-10-02 用户确认）：三段独立，只能经对应井口布梯进出，无跨段步行
const SEGMENTS = {
  UA: {
    bg: 'MAP_UA', groundY: x => groundUAt('UA', x),
    shaftX: 645,   // 井筒（方案：20%W / x=614；美术实测 21%）
    inspectX: 1600, // UA 水痕/水流检查点
    well: 0,
  },
  UB: {
    bg: 'MAP_UB', bgSilt: 'MAP_UB_SILT', groundY: x => groundUAt('UB', x),
    shaftX: 1054,  // 井筒（方案：35%W / x=1075）
    well: 1,
    siltX: 1450,   // 清淤作业区（方案：58%W / x=1782；美术实测淤积堆位于此）
  },
  UC: {
    bg: 'MAP_UC', bgFixed: 'MAP_UC_FIXED', groundY: x => groundUAt('UC', x),
    shaftX: 2415,  // 井筒（方案：80%W / x=2458）
    well: 2,
    patchX: 820,   // 旧渠缘缺口（方案：30%W / x=922；美术实测缺口位于此）
    checkX: 2722,  // 复查参照石（方案：88%W / x=2704）
  },
};

// 素材点位：以当前草稿美术实测锚定，括注方案§03目标坐标，底图重制后切换
const SURF = {
  npcX: 340,                                  // 守井人（方案：9%W / x=276）
  wells: [645, 1594, 2667],                   // 底图烘焙井圈实测x（方案：553/1597/2580）
  mats: { A: 190, B: 1850, C: 2790 },         // 旧绳索/横踏杆/绑扎物（方案：799/1782/2396）
};
// 井口贴图摆放：井圈与底图烘焙井圈对齐。
const WELL_SPRITE_CONF = [
  { tex: 'WELL_W1', x: 719, y: 659, w: 685 },
  { tex: 'WELL_W2', x: 1578, y: 881, w: 1263 },
  { tex: 'WELL_W3', x: 2302, y: 855, w: 876 },
];
// 井口对内仅按下标区分；对玩家一律用序数称呼（剧本不出现 W01 这类编号）
const WELL_NAMES = ['第一口井', '第二口井', '第三口井'];
const MAT_NAMES = { A: '旧绳索', B: '横踏杆', C: '固定绑扎物' };

// 对白（§16 首版文本 + §15 提示语）
const LINES = {
  intro: [
    { s: 'keeper', t: '你们是从小镇来的？最近那边的水也变少了？' },
    { s: 'aysu', t: '是。我们完成了镇上的纹脉任务，听说坎儿井的水脉断了，就过来看看。' },
    { s: 'keeper', t: '我只知道水到了下游就变小，具体断在哪里还没有查到。三口井的井口都被沙土和杂草盖住了。' },
    { s: 'aide', t: '那就从井口开始，一口一口检查。先清理第一口井。' },
    { s: 'keeper', t: '可以。井口清理干净之前不要下去，旧梯子也已经不能用了。' },
  ],
  w01check: [
    { s: 'aysu', t: '井口清出来了。下面有水汽，但看不清水路。' },
    { s: 'aide', t: '这里有旧梯子的磨痕，梯子已经没法用了。我们得先做一架新的。' },
    { s: 'keeper', t: '我这里有一些旧材料，但要先检查状态。找来的材料不一定都能直接用。' },
    { s: 'aysu', t: '先把材料带回来，再按井口留下的痕迹把梯子做好。' },
  ],
  ladderInvite: [
    { s: 'aide', t: '材料都找到了。先在台上摆好横档，把两边的绳子调平。' },
    { s: 'aysu', t: '你穿绳，我扶住横档。绑好以后，我们拿沙袋压一遍。' },
    { s: 'keeper', t: '每根横档的中间都压一下。哪里歪了、滑了，就把那一处重新弄牢。' },
  ],
  lampInvite: [
    { s: 'aysu', t: '绳梯可以用了，但井下还需要光。' },
    { s: 'keeper', t: '旧油灯裂了。棚里有陶土、小转盘和窑，你们可以自己做一盏。泥坯要先晾干，再入窑。' },
    { s: 'aide', t: '先把泥揉匀，再放上转盘做出灯身。转盘别太快，手要沿着轮廓慢慢走。' },
  ],
  noLadder: [
    { s: 'aysu', t: '这口井还不能下。先按顺序把前面的检查做完。' },
  ],
  report: [
    { s: 'keeper', t: '水回来了。先是细流，现在已经能接到水槽里。' },
    { s: 'aysu', t: '我们还得告诉小镇，水路已经通了。' },
    { s: 'aide', t: '也要把今天检查到的东西记下来。以后再堵，至少知道从哪里查起。' },
  ],
  idle: [
    { s: 'keeper', t: '先看清楚当前这口井的情况，再决定下一步。' },
  ],
  // idle 按进度分流：布梯台词只在制作完成后才说，避免剧情超前
  idleWell: [
    { s: 'keeper', t: '先把第一口井的井缘清出来，清完再检查井口。' },
  ],
  idleMats: [
    { s: 'keeper', t: '旧绳索、横踏杆和绑扎物都在地表，带回来以后还要检查和组装。' },
  ],
  idleDone: [
    { s: 'keeper', t: '记录已经保存了。水流还在，先别破坏刚修好的地方。' },
  ],
  siltFixed: [
    { s: 'aide', t: '水已经通过去了。回地面，再清理第三口井，看看下游还剩什么问题。' },
  ],
  patchIntro: [
    { s: 'aysu', t: '先别急着把石头塞进去。水痕说明上游这一侧一直在冲。' },
    { s: 'aide', t: '先看清缺口，再按受力顺序排石，最后用小股水试一遍。' },
  ],
  verified: [
    { s: 'aide', t: '这段水路连上了，把刚才处理过的地方记下来。' },
  ],
  hintSilt: [{ s: 'keeper', t: '中段仍有通水障碍，先去把淤积清了吧。' }],
  hintPatch: [{ s: 'keeper', t: '旧渠缘的缺口还没处理，补上再复查。' }],
  hintVerify: [{ s: 'keeper', t: '两处都处理好了，到下游确认结果再回来。' }],
  uaInspect: [
    { s: 'aysu', t: '这里还有水，流得很慢。井壁上的湿痕是连续的。' },
    { s: 'aide', t: '这段没有看到大裂口。水是从上游过来的，问题应该在更后面。' },
    { s: 'aysu', t: '记下来。我们回地面，清理第二口井，再看下一段。' },
  ],
  shaftClosed: [
    { s: 'aysu', t: '这口井没有布梯，上不去。' },
  ],
};

// -------- Boot：加载场景、人物与道具，生成交互标记 --------
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    HeroActor.preload(this);
    loadUISkin(this);
    this.load.image('npc', 'assets/characters/keeper/keeper_idle.png?v=1');
    const bar = this.add.graphics();
    this.add.text(VIEW_W / 2, VIEW_H / 2 - 40, '正在加载……', {
      fontFamily: FONT, fontSize: '24px', color: '#e8d9b0',
    }).setOrigin(0.5);
    this.load.on('progress', v => {
      bar.clear().fillStyle(0x2e6e63, 1).fillRect(240, VIEW_H / 2, (VIEW_W - 480) * v, 12)
        .lineStyle(2, 0xc9973f, 1).strokeRect(240, VIEW_H / 2, VIEW_W - 480, 12);
    });
    this.load.image('MAP_S', `map-assets/SCN_L2_S.png?v=${ASSET_V}`);
    this.load.image('LADDER_TABLE', `map-assets/LADDER_TABLE.png?v=${ASSET_V}`);
    this.load.image('LADDER_RUNG', `map-assets/LADDER_RUNG.png?v=${ASSET_V}`);
    this.load.image('LADDER_BAG', `map-assets/LADDER_BAG.png?v=${ASSET_V}`);
    this.load.image('POTTERY_TABLE', `map-assets/POTTERY_TABLE.png?v=${ASSET_V}`);
    this.load.image('POTTERY_KILN', `map-assets/POTTERY_KILN.png?v=${ASSET_V}`);
    this.load.image('POTTERY_FORMING_SOURCE', `map-assets/POTTERY_FORMING_V1.png?v=${ASSET_V}`);
    this.load.image('POTTERY_CLAY_NEUTRAL', `map-assets/POTTERY_CLAY_V2/POTTERY_CLAY_V2_NEUTRAL.png?v=${ASSET_V}`);
    this.load.image('POTTERY_CLAY_PRESS_CENTER', `map-assets/POTTERY_CLAY_V2/POTTERY_CLAY_V2_PRESS_CENTER.png?v=${ASSET_V}`);
    this.load.image('POTTERY_CLAY_PRESS_LEFT', `map-assets/POTTERY_CLAY_V2/POTTERY_CLAY_V2_PRESS_LEFT.png?v=${ASSET_V}`);
    this.load.image('POTTERY_CLAY_PRESS_RIGHT', `map-assets/POTTERY_CLAY_V2/POTTERY_CLAY_V2_PRESS_RIGHT.png?v=${ASSET_V}`);
    this.load.image('POTTERY_CLAY_FOLD_RIGHT', `map-assets/POTTERY_CLAY_V2/POTTERY_CLAY_V2_FOLD_RIGHT.png?v=${ASSET_V}`);
    this.load.image('POTTERY_CLAY_FOLD_LEFT', `map-assets/POTTERY_CLAY_V2/POTTERY_CLAY_V2_FOLD_LEFT.png?v=${ASSET_V}`);
    this.load.image('POTTERY_CLAY_BUBBLE', `map-assets/POTTERY_CLAY_V2/POTTERY_CLAY_V2_BUBBLE.png?v=${ASSET_V}`);
    this.load.image('POTTERY_CLAY_READY', `map-assets/POTTERY_CLAY_V2/POTTERY_CLAY_V2_READY.png?v=${ASSET_V}`);
    this.load.image('POTTERY_LAMP_SPOUT_RAW', `map-assets/POTTERY_LAMP_SPOUT_RAW.png?v=${ASSET_V}`);
    this.load.image('POTTERY_LAMP_HANDLE_RAW', `map-assets/POTTERY_LAMP_HANDLE_RAW.png?v=${ASSET_V}`);
    this.load.image('MAP_UA', `map-assets/SCN_L2_UA.png?v=${ASSET_V}`);
    this.load.image('MAP_UB', `map-assets/SCN_L2_UB.png?v=${ASSET_V}`);
    this.load.image('MAP_UB_SILT', `map-assets/SCN_L2_UB_SILT.png?v=${ASSET_V}`);
    this.load.image('MAP_UC', `map-assets/SCN_L2_UC.png?v=${ASSET_V}`);
    this.load.image('MAP_UC_GAP', `map-assets/SCN_L2_UC_GAP.png?v=${ASSET_V}`);
    this.load.image('MAP_UC_FIXED', `map-assets/SCN_L2_UC_FIXED.png?v=${ASSET_V}`);
    this.load.image('UC_STONE_BASE', `map-assets/UC_STONE_BASE.png?v=${ASSET_V}`);
    this.load.image('UC_STONE_WEDGE', `map-assets/UC_STONE_WEDGE.png?v=${ASSET_V}`);
    this.load.image('UC_STONE_CAP', `map-assets/UC_STONE_CAP.png?v=${ASSET_V}`);
    this.load.image('LAMP_L', `map-assets/ITM_L2_LAMP_L.png?v=${ASSET_V}`);
    this.load.image('LAMP_R', `map-assets/ITM_L2_LAMP_R.png?v=${ASSET_V}`);
    this.load.image('LAMP_L_OFF', `map-assets/ITM_L2_LAMP_L_OFF.png?v=${ASSET_V}`);
    this.load.image('LAMP_R_OFF', `map-assets/ITM_L2_LAMP_R_OFF.png?v=${ASSET_V}`);
    this.load.image('WELL_W1', `map-assets/ENV_L2_WELL_W01_WEED.png?v=${ASSET_V}`);
    this.load.image('WELL_W2', `map-assets/ENV_L2_WELL_W02_WEED.png?v=${ASSET_V}`);
    this.load.image('WELL_W3', `map-assets/ENV_L2_WELL_W03_WEED.png?v=${ASSET_V}`);
  }
  create() {
    HeroActor.prepare(this);
    prepareUISkin(this);
    // 使用透明素材中的实际物体区域，保留原始 PNG 与透明边缘。
    this.textures.get('LADDER_RUNG').add('craft', 0, 65, 230, 2040, 230);
    this.textures.get('LADDER_BAG').add('craft', 0, 118, 58, 1144, 1017);
    // 守井人原图 1024×1536；有效轮廓帧去除透明留白，使身高与靴底锚点准确。
    this.textures.get('npc').add('body', 0, 189, 95, 660, 1389);
    this.makeTextures();
    if (G.restored && G.state.sceneId === 'Tunnel' && SEGMENTS[G.state.lastSeg]) {
      this.scene.start('Tunnel', { seg: G.state.lastSeg });
    } else {
      this.scene.start('Surface');
    }
  }

  makeTextures() {
    const mk = (key, w, h, draw) => {
      const g = this.make.graphics({ add: false });
      draw(g); g.generateTexture(key, w, h); g.destroy();
    };
    // 材料点标记（金色菱形，图标独立不烘焙，§18）
    mk('diamond', 26, 26, g => {
      g.fillStyle(0xc9973f, 1).fillTriangle(13, 1, 25, 13, 13, 25).fillTriangle(1, 13, 13, 1, 13, 25);
      g.fillStyle(0xf7ecd4, 1).fillTriangle(13, 7, 19, 13, 13, 19).fillTriangle(7, 13, 13, 7, 13, 19);
    });
    // 草屑/扬尘粒子
    mk('dust', 12, 12, g => g.fillStyle(0xd8b98a, 1).fillCircle(6, 6, 6));
    mk('grassbit', 10, 10, g => g.fillStyle(0x9a8a4a, 1).fillCircle(5, 5, 5));
  }
}
