// ============================================================
// Ambient 环境微动效系统
//  - 统一风力：所有可动元素受同一阵微风影响，风向一致
//  - 材质差异：每元素有独立的响应速度、幅度、相位，错峰运动
//  - 局部变形：只动提取出的图层（枝叶/布幔/树影），建筑地面门窗不动
//  - 空气细节：少量微尘 + 偶发落叶；极慢速光照长周期变化
//  - 性能：局部网格预生成48帧，循环帧插值播放；阴影合成，粒子单画布
// ============================================================
const Ambient = (() => {
 const WORLD_W = 1672, WORLD_H = 941;
 const A = 'assets/scenes/02_weave_dream_lane/ambient/';

 // 六张地图：保留街道示范配置，其余由素材构建脚本生成。
 // bbox 为图层在世界坐标中的包围盒；origin 为变形轴心（世界坐标）
 // amp=最大水平位移(世界px) rot/skew=最大角度 resp=响应速率(1/s) phase=独立颤动相位
 const CONFIG = {
  1: {
   layers: [
    { id: 'leaves_left', src: A+'leaves_left.png',
      bbox: [193, 42, 276, 144], origin: [233, 55],
      amp: 2.8, rot: .20, skew: .35, resp: 3.8, phase: .0, flutter: .6, flutterPer: 5.6 },
    { id: 'leaves_middle', src: A+'leaves_middle.png',
      bbox: [271, 52, 355, 187], origin: [312, 62],
      amp: 3.6, rot: .28, skew: .45, resp: 3.2, phase: 1.9, flutter: .45, flutterPer: 6.9 },
    { id: 'leaves_right', src: A+'leaves_right.png',
      bbox: [354, 46, 450, 207], origin: [397, 55],
      amp: 3.0, rot: .22, skew: .4, resp: 3.5, phase: 3.0, flutter: .55, flutterPer: 5.1 },
    { id: 'awning', src: A+'awning.png',
      bbox: [985, 312, 1257, 413], origin: [1120, 327],
      amp: 3.0, rot: .14, skew: .8, resp: 2.4, phase: 1.0, flutter: .35, flutterPer: 4.4 },
    // 地面树影：仅颜色遮罩随同一阵微风移动，石砖纹理保持固定。
    { id: 'shadow_dark', src: A+'shadow_dark.png',
      bbox: [468, 603, 1172, 842], origin: [820, 722],
      amp: 0, resp: 3.1, phase: .5, driftPer: 41, driftAmp: 0, driftSign: 1 },
    { id: 'shadow_light', src: A+'shadow_light.png',
      bbox: [468, 603, 1172, 842], origin: [820, 722],
      amp: 0, resp: 3.1, phase: .5, driftPer: 41, driftAmp: 0, driftSign: -1 },
   ],
   // 微尘活动区（受光地面）
   dust: { rect: [330, 560, 1320, 800], count: 22 },
   // 落叶生成区（树冠边缘）
   leafFall: { xRange: [250, 720], y: 30, minGap: 8, maxGap: 20 },
  }
 };
 if (typeof AMBIENT_MAPS !== 'undefined') Object.assign(CONFIG, AMBIENT_MAPS);

 let root = null, cfg = null, els = [], fx = null;
 let clock = 0, started = false, budget = 0, generation = 0;
 const FRAME_COUNT = 48, CYCLE_SECONDS = 12;
 let playhead = 0, strength = 1, forceMotion = false, paused = false;
 const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
 let reduced = motionQuery.matches, sceneNumber = 0;
 motionQuery.addEventListener('change', e => {
  reduced = e.matches;
  setScene(sceneNumber);
 });

 // ---------- 统一风力模型 ----------
 // 多段不可公度周期正弦叠加；慢包络让风力成阵（增强→减弱），避免机械重复
 function windAt(t) {
  const breeze = .42*Math.sin(2*Math.PI*t/7.3)
               + .27*Math.sin(2*Math.PI*t/12.7 + 1.3)
               + .18*Math.sin(2*Math.PI*t/21.3 + 2.1)
               + .09*Math.sin(2*Math.PI*t/33.9 + 4.2);
  const envelope = .62 + .26*Math.sin(2*Math.PI*t/47 + .6) + .14*Math.sin(2*Math.PI*t/73 + 2.4);
  return Math.tanh(1.35*breeze*envelope); // 约 -1..1
 }

 // ---------- 空气细节：微尘 & 落叶 ----------
 function makeDust(d) {
  const [x0, y0, x1, y1] = d.rect;
  const list = [];
  for (let i = 0; i < d.count; i++) {
   list.push({
    x: x0 + Math.random()*(x1-x0), y: y0 + Math.random()*(y1-y0),
    r: .7 + Math.random()*1.5,
    rise: .6 + Math.random()*1.1, drift: .4 + Math.random()*.9,
    a: .05 + Math.random()*.11, ph: Math.random()*6.28, tw: 2 + Math.random()*3.5
   });
  }
  return list;
 }
 const LEAF_COLORS = ['#c98a3a', '#9aa24a', '#b46a34', '#d9b04a', '#a87a3c'];
 function makeFallingLeaf(cfg) {
  const [xa, xb] = cfg.leafFall.xRange;
  const gentle = cfg.leafFall.gentle === true;
  return {
   x: xa + Math.random()*(xb-xa), y: cfg.leafFall.y + Math.random()*30,
   vy: (gentle ? 22 : 13) + Math.random()*9, swayAmp: 8 + Math.random()*9, swayPer: 2.2 + Math.random()*1.6,
   rot: Math.random()*360, vr: (Math.random()-.5)*50,
   len: 4.5 + Math.random()*2.5, color: LEAF_COLORS[(Math.random()*LEAF_COLORS.length)|0],
   age: 0, life: (gentle ? 20 : 11) + Math.random()*5
  };
 }

 // ---------- 场景构建 ----------
 function setScene(n) {
  sceneNumber = n;
  generation++;
  if (!root) return;
  root.innerHTML = '';
  delete root.dataset.ready;
  delete root.dataset.motionEnabled;
  els = []; fx = null; budget = 0;
  cfg = CONFIG[n] || null;
  if (!cfg || (reduced && !forceMotion)) return;
  root.dataset.motionEnabled = 'true';
  root.style.visibility = 'hidden';
  const sceneToken=generation;
  const clean=document.createElement('img');
  clean.className='ambient-clean-background';clean.alt='';
  const reveal=()=>{
   if(sceneToken===generation && clean.complete && clean.naturalWidth && els.every(it=>it.ready)) {
    root.style.visibility='visible';root.dataset.ready='true';
   }
  };
  clean.onload=reveal;
  clean.onerror=()=>console.error('环境补景加载失败：',n);
  clean.src=AMBIENT_BACKGROUNDS[n]+'?ambient=22';
  root.appendChild(clean);

  for (const L of cfg.layers) {
   const moving = true;
   const el = document.createElement(moving ? 'canvas' : 'div');
   el.className = 'ambient-layer';
   el.dataset.element = L.id;
   const [x0, y0, x1, y1] = L.bbox;
   el.style.left = (x0/WORLD_W*100).toFixed(3) + '%';
   el.style.top = (y0/WORLD_H*100).toFixed(3) + '%';
   el.style.width = ((x1-x0)/WORLD_W*100).toFixed(3) + '%';
   el.style.height = ((y1-y0)/WORLD_H*100).toFixed(3) + '%';
   if (!moving) el.style.backgroundImage = `url("${L.src}")`;
   const ox = ((L.origin[0]-x0)/(x1-x0)*100).toFixed(2);
   const oy = ((L.origin[1]-y0)/(y1-y0)*100).toFixed(2);
   el.style.transformOrigin = ox + '% ' + oy + '%';
   root.appendChild(el);
   const it = { L, el, v: 0, w: x1-x0, h: y1-y0, ready: !moving, frames: [] };
   els.push(it);
   if (moving) {
    el.width = it.w; el.height = it.h;
    it.ctx = el.getContext('2d');
    it.image = new Image();
    if (L.kind === 'lightfield') {
     it.base=new Image();
     it.original = new Image(); it.edge = new Image();
     it.buffer = document.createElement('canvas');it.buffer.width=it.w;it.buffer.height=it.h;
     it.mask = document.createElement('canvas');it.mask.width=it.w;it.mask.height=it.h;
    }
    const token = generation;
    const loaded = () => {
     if (token !== generation || ![it.image,it.base,it.original,it.edge].filter(Boolean).every(img=>img.complete&&img.naturalWidth)) return;
     it.ready = true;
     el.dataset.ready = 'true';
     drawLayer(it, playhead, loopWind(playhead, L));
     reveal();
    };
    it.image.onload = loaded;
    if(it.base)it.base.onload=loaded;
    if(it.original) {
     it.original.onload=loaded;it.edge.onload=loaded;
     it.original.onerror=it.edge.onerror=()=>console.error('环境光影加载失败：',L.id);
     it.original.src=L.original+'?ambient=22';it.edge.src=L.edge+'?ambient=22';
    }
    it.image.onerror = () => console.error('环境图层加载失败：', L.id);
    it.image.src = L.src+'?ambient=22';
    if(it.base) {it.base.onerror=it.image.onerror;it.base.src=L.base+'?ambient=22';}
   }
  }

  // 粒子画布（微尘 + 落叶）
  const canvas = document.createElement('canvas');
  canvas.width = WORLD_W; canvas.height = WORLD_H;
  canvas.className = 'ambient-fx';
  root.appendChild(canvas);
  fx = {
   canvas, ctx: canvas.getContext('2d'),
   dust: makeDust(cfg.dust),
   leaves: [], nextLeaf: cfg.leafFall?.gentle ? 1.5 + Math.random()*1.5 : 4 + Math.random()*5
  };
 }

 function mount(container, n) {
  if (started) return;
  started = true;
  root = document.createElement('div');
  root.id = 'ambient'; root.setAttribute('aria-hidden', 'true');
  container.appendChild(root);
  setScene(n);
 }

 // ---------- 每帧更新 ----------
 function update(dt) {
  if (!root || !cfg || paused || (reduced && !forceMotion) || document.hidden) return;
  // 工作台全屏打开时画面被遮挡，暂停环境计算
  const ws = document.getElementById('patternWorkshop');
  if (ws && !ws.hidden) return;
  dt = Math.max(0, Math.min(dt, .05));
  budget += dt;
  if (budget < 1/30) return;
  dt = budget; budget = 0;
  clock += dt;
  // Slow tempo variation in normal play; clear demo uses a repeatable 12s loop.
  playhead += dt * (strength > 1 ? 1 : .94 + .06*Math.sin(clock/43));
  const t = playhead;
  const w = loopWind(t);
  // Spread frame baking across updates to avoid blocking walking on scene load.
  let buildBudget = 4;

  for (const it of els) {
   const L = it.L;
   // 同一阵风驱动；织物响应更迟，局部颤动节奏与枝叶错开。
   if (it.ctx) {
    if (it.ready) {
     if (L.kind === 'lightfield') {
      drawLightfield(it,t,w);
      continue;
     }
     while (it.frames.length < FRAME_COUNT && buildBudget > 0) {
      const time = it.frames.length/FRAME_COUNT*CYCLE_SECONDS;
      it.frames.push(makeMesh(it,time,loopWind(time,L)));buildBudget--;
     }
     drawLayer(it,t,loopWind(t,L));
    }
    continue;
   }

   // Colour-only dapple masks track the same breeze as the leaf clusters.
   const dx = w*9*strength + 2*Math.sin(2*Math.PI*clock/1200);
   it.el.style.opacity = (.82 + w*.15).toFixed(3);
   const dxPct = (dx/it.w*100).toFixed(3);
   it.el.style.transform =
    `translate3d(${dxPct}%,${(w*.24*strength).toFixed(3)}%,0)`;
  }

  drawFx(t, dt, w);
 }

 function loopWind(t, L = {}) {
  const angle = 2*Math.PI*t/CYCLE_SECONDS;
  if (L.motion === 'gentleBreeze') {
   // A shared slow gust with a small delay along each branch.
   const lag = (L.phase || 0)*.035;
   return .72*Math.sin(angle-lag)+.18*Math.sin(2*angle+.6-lag);
  }
  const cloth = L.kind === 'awning' || L.id === 'awning' || L.kind === 'hanging';
  const foliage = ['canopy','branch','plant'].includes(L.kind) || /^leaves_/.test(L.id || '');
  if (foliage) {
   // Two one-sided bends per loop: centre -> right -> centre.
   const bend = (1-Math.cos(2*angle))*.5;
   return .80*bend*(.94+.06*Math.cos(4*angle+(L.phase||0)*.2));
  }
  const lag = (L.resp ? Math.min(.22,.5/L.resp) : 0) + (cloth ? .55 : 0);
  const phase = (L.phase || 0)*.2;
  // Shared 12s gust, plus different material response: leaves 6s, cloth 4s.
  return .80*Math.sin(angle-lag)
       + .14*Math.sin((cloth ? 3 : 2)*angle-lag+phase)
       + .045*Math.sin((cloth ? 2 : 3)*angle+phase);
 }

 function setPlayback(options = {}) {
  strength = options.clear ? 1.2 : 1;
  forceMotion = options.forceMotion === true;
  setScene(sceneNumber);
 }

 function getPlayback() {
  return {frame:Math.floor((playhead/CYCLE_SECONDS%1)*FRAME_COUNT)+1,
   frameCount:FRAME_COUNT,seconds:CYCLE_SECONDS,
   active:!!cfg && !paused && (!reduced || forceMotion),paused,fallingLeaves:fx?.leaves.length || 0,
   cachedFrames:els.reduce((sum,it)=>sum+it.frames.length,0),
   totalFrames:els.filter(it=>it.ctx&&it.L.kind!=='lightfield').length*FRAME_COUNT};
 }

 // Small textured mesh; anchors stay fixed, free edges deform independently.
 function localBreeze(t,gx,gy) {
  const angle=2*Math.PI*t/CYCLE_SECONDS;
  // Smooth spatial phases: neighbouring leaves form small clusters rather
  // than following one translation. Integer harmonics keep the loop seamless.
  const phase=gx*.097+gy*.071+1.3*Math.sin(gx*.037-gy*.043);
  const response=.5+.5*Math.sin(2*angle+phase);
  const secondary=Math.sin(3*angle-phase*.73);
  return {pulse:response*response,vertical:secondary,
   x:Math.sin(2*angle+phase)+.35*Math.sin(3*angle-phase),
   y:Math.cos(2*angle-phase*.8)+.3*secondary};
 }

 function lightMesh(it,t,wind) {
  const {w,h,L}=it,cols=Math.ceil(w/55),rows=Math.ceil(h/38),points=[];
  for(let j=0;j<=rows;j++) {
   const row=[];
   for(let i=0;i<=cols;i++) {
    const x=i*w/cols,y=j*h/rows;
    const local=localBreeze(t,x+L.bbox[0],y+L.bbox[1]);
    const edge=Math.min(1,x/24,y/24,(w-x)/24,(h-y)/24);
    const gentle=L.motion==='gentleBreeze';
    row.push({x,y,dx:x+edge*(gentle ? wind*4+local.x*1.2 : local.x*5+wind*.7)*strength,
     dy:y+edge*(gentle ? wind*.65+local.y*.7 : local.y*3+wind*.3)*strength});
   }
   points.push(row);
  }
  return points;
 }

 // Repaired backing is drawn in place, so no duplicate stationary silhouette
 // remains underneath and no wall/ground pixels move with the object.
 function makeMesh(it, t, v = 0) {
  const {w,h,L}=it;
  if(L.id.startsWith('shadow')) return lightMesh(it,t,v);
  const cloth = L.kind === 'awning' || L.id === 'awning' || L.kind === 'hanging';
  const canopy = L.kind === 'canopy';
  const foliage = !cloth;
  const cols = foliage ? Math.max(6,Math.min(22,Math.ceil(w/23))) : 12;
  const rows = foliage ? Math.max(8,Math.min(20,Math.ceil(h/23))) : 8;
  const points = [];
  for (let j=0;j<=rows;j++) {
   const row = [];
   for (let i=0;i<=cols;i++) {
    const x=i*w/cols, y=j*h/rows;
    let weight;
    if (foliage) {
     if (L.branchAnchor) {
      const [ax,ay]=L.branchAnchor;
      const gx=x+L.bbox[0],gy=y+L.bbox[1];
      const distance=L.tipRadiusX
       ? Math.hypot((gx-ax)/L.tipRadiusX,(gy-ay)/L.tipRadiusY)
       : Math.hypot(gx-ax,gy-ay);
      const start=L.tipStart||.58;
      const flex=L.tipRadiusX
       ? Math.max(0,Math.min(1,(distance-start)/(1-start)))
       : Math.max(0,Math.min(1,(distance-L.tipRadius*start)/(L.tipRadius*(1-start))));
      weight=L.motion === 'gentleBreeze' ? flex*flex*(3-2*flex) : flex*flex;
     } else {
     // Flexibility follows distance from the branch junction, including
     // lateral tips. A low side tip is not a thick branch merely by height.
     const rootY=h*.85;
     const height=Math.max(0,Math.min(1,(rootY-y)/rootY));
     const lateral=Math.abs(x-w*.5)/(w*.5);
     const distance=Math.hypot(lateral,(rootY-y)/rootY);
     const junction=Math.max(0,Math.min(1,(distance-.26)/.28));
     const outer=Math.max(0,Math.min(1,distance));
     // Small, gradual extra flexibility at the outside, not an edge kick.
     weight=Math.min(1,Math.max(height*height,.80*lateral*lateral))*junction*(.94+.06*outer);
     // Keep the trunk and thick inner branches still; only the outer tip band
     // receives the wind deformation.
     weight=Math.pow(Math.max(0,(weight-.46)/.54),2);
     }
    } else if (L.kind === 'hanging') {
     const fixedTop=L.anchorY||16;
     weight = Math.pow(Math.max(0,(y-fixedTop)/(h-fixedTop)),1.25);
    } else if (L.seam) {
     const seam = L.seam;
     let top = seam[0][1];
     for (let s=1;s<seam.length;s++) {
      if(x>=seam[s-1][0]) {
       const f=Math.max(0,Math.min(1,(x-seam[s-1][0])/(seam[s][0]-seam[s-1][0])));
       top=seam[s-1][1]+f*(seam[s][1]-seam[s-1][1]);
      }
     }
     const u=Math.max(0,Math.min(1,(x-seam[0][0])/(seam[seam.length-1][0]-seam[0][0])));
     weight=Math.max(0,Math.min(1,(y-top)/Math.max(20,h-top-10)))*Math.sin(Math.PI*u);
    } else if (cloth) {
     const u = Math.max(0,Math.min(1,(x-14)/244));
     const seam = 14 + 35*Math.sin(Math.PI*u);
     weight = Math.max(0,Math.min(1,(y-seam)/36))*Math.sin(Math.PI*u);
    } else {
     weight = Math.pow(Math.max(0,(y-14)/(h-14)),1.25);
    }
    const angle = 2*Math.PI*t/CYCLE_SECONDS;
    const bend = cloth ? 1 : (1-Math.cos(2*angle))*.5;
    // Fine flutter belongs to tips; thick lower branches get only slow bend.
    const tipFlex=foliage ? Math.max(0,Math.min(1,(weight-.15)/.7)) : 1;
    const ripple = Math.sin((cloth ? 3 : 2)*angle + x*.025 + y*.019 + L.phase)*(canopy?2.0:.7)*bend*tipFlex;
    const amp = Math.max(L.amp, L.kind==='plant' ? 3.4 : 7.5);
    const motionStrength = strength*(foliage ? .60 : 1);
    const local=localBreeze(t,x+L.bbox[0],y+L.bbox[1]);
    const leafShift=bend*amp*(.07+.55*local.pulse);
    const dx = weight*(foliage ? leafShift : v*amp+ripple)*motionStrength;
    const lifted = L.id.startsWith('door_');
    const dy = weight*(foliage ? bend*local.vertical*Math.min(2.2,amp*.14) : lifted ? -Math.abs(v)*14+Math.sin(3*angle+x*.022+L.phase)*4.5 : v*2.6+Math.sin(3*angle+x*.022+L.phase))*motionStrength;
    if (cloth) {
     // The attachment stays still while waves travel across the free fabric.
     const phase=(L.phase||0)*.13;
     const gust=.72*Math.sin(angle-.45)+.18*Math.sin(2*angle+.15);
     const wave=Math.sin(3*angle-x*.028-y*.018+phase);
     const cross=Math.sin(2*angle+x*.018-y*.021+phase);
     const clothAmp=L.clothAmp || (L.kind==='hanging' ? 10 : 8);
     const shiftX=weight*clothAmp*(gust+wave*.28)*strength;
     const shiftY=weight*(cross*clothAmp*.38-Math.abs(gust)*clothAmp*.20)*strength;
     row.push({x,y,dx:x+shiftX,dy:y+shiftY});
    } else if (L.motion === 'gentleBreeze') {
     // Broad leaf clusters follow the wind together; finer leaf motion stays
     // gentle and continuous even while the gust changes direction.
     const phase=(x+L.bbox[0])*.018+(y+L.bbox[1])*.012+(L.phase||0)*.13;
     const flutter=Math.sin(3*angle+phase)*.28+Math.sin(5*angle-phase)*.12;
     const leafAmp=L.amp;
     const shiftX=weight*leafAmp*(v*.55+local.x*.52+flutter*.3)*strength;
     const shiftY=weight*leafAmp*(local.y*.30+Math.sin(2*angle+phase)*.12)*strength;
     row.push({x,y,dx:x+shiftX,dy:y+shiftY});
    } else {
     row.push({x,y,dx:x+dx,dy:y+dy});
    }
   }
   points.push(row);
  }
  return points;
 }

 function drawLayer(it,t,v=0) {
  if(it.L.kind==='lightfield') {drawLightfield(it,t,v);return;}
  const {ctx,w,h}=it;
  const position=(t/CYCLE_SECONDS%1)*FRAME_COUNT,index=Math.floor(position),next=(index+1)%FRAME_COUNT;
  const a=it.frames[index],b=it.frames[next],blend=position-index;
  // Interpolate geometry, never cross-fade two differently placed pictures.
  // Only one transparent sprite is drawn over the cleaned static scenery.
  const points=a&&b ? a.map((row,j)=>row.map((p,i)=>({x:p.x,y:p.y,
   dx:p.dx+(b[j][i].dx-p.dx)*blend,dy:p.dy+(b[j][i].dy-p.dy)*blend}))) : makeMesh(it,t,v);
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
  ctx.clearRect(0,0,w,h);
  it.el.dataset.frame=String(index+1);
  const rows=points.length-1,cols=points[0].length-1;
  for (let j=0;j<rows;j++) for(let i=0;i<cols;i++) {
   const a=points[j][i],b=points[j][i+1],c=points[j+1][i],d=points[j+1][i+1];
   triangle(ctx,it.image,a,b,c);
   triangle(ctx,it.image,d,c,b);
  }
  ctx.setTransform(1,0,0,1,0,0);
 }

 // Separate existing illumination from fixed stone texture, move only the
 // transmission map, and feather the rebuilt illumination into the original.
 function drawLightfield(it,t,wind) {
  const {ctx,w,h,L}=it;
  const mc=it.mask.getContext('2d'),bc=it.buffer.getContext('2d');
  mc.globalCompositeOperation='source-over';mc.fillStyle='#b5b5b5';mc.fillRect(0,0,w,h);
  const points=lightMesh(it,t,wind);
  for(let j=0;j<points.length-1;j++) for(let i=0;i<points[0].length-1;i++) {
   const a=points[j][i],b=points[j][i+1],c=points[j+1][i],d=points[j+1][i+1];
   triangle(mc,it.image,a,b,c);triangle(mc,it.image,d,c,b);
  }
  mc.setTransform(1,0,0,1,0,0);
  bc.globalCompositeOperation='source-over';bc.clearRect(0,0,w,h);bc.drawImage(it.base,0,0);
  bc.globalCompositeOperation='multiply';bc.drawImage(it.mask,0,0);
  bc.globalCompositeOperation='destination-in';bc.drawImage(it.edge,0,0);
  bc.globalCompositeOperation='source-over';
  ctx.globalAlpha=1;ctx.clearRect(0,0,w,h);ctx.drawImage(it.original,0,0);ctx.drawImage(it.buffer,0,0);
  it.el.dataset.frame=String(Math.floor((t/CYCLE_SECONDS%1)*FRAME_COUNT)+1);
 }

 function triangle(ctx,img,a,b,c) {
  const sx=b.x-a.x, sy=b.y-a.y, tx=c.x-a.x, ty=c.y-a.y;
  const det=sx*ty-sy*tx;
  const ux=b.dx-a.dx, uy=b.dy-a.dy, vx=c.dx-a.dx, vy=c.dy-a.dy;
  const m0=(ux*ty-vx*sy)/det, m1=(uy*ty-vy*sy)/det;
  const m2=(vx*sx-ux*tx)/det, m3=(vy*sx-uy*tx)/det;
  ctx.save();
  const cx=(a.dx+b.dx+c.dx)/3,cy=(a.dy+b.dy+c.dy)/3;
  const expand=p=>{const len=Math.hypot(p.dx-cx,p.dy-cy)||1;return [p.dx+(p.dx-cx)/len*.25,p.dy+(p.dy-cy)/len*.25]};
  ctx.beginPath();ctx.moveTo(...expand(a));ctx.lineTo(...expand(b));ctx.lineTo(...expand(c));ctx.closePath();ctx.clip();
  ctx.setTransform(m0,m1,m2,m3,a.dx-m0*a.x-m2*a.y,a.dy-m1*a.x-m3*a.y);
  // Each triangle samples only its own texture rectangle, avoiding repeated
  // full-canopy draws for the finer leaf mesh.
  const left=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))-1);
  const top=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))-1);
  const right=Math.min(img.width,Math.ceil(Math.max(a.x,b.x,c.x))+1);
  const bottom=Math.min(img.height,Math.ceil(Math.max(a.y,b.y,c.y))+1);
  ctx.drawImage(img,left,top,right-left,bottom-top,left,top,right-left,bottom-top);
  ctx.restore();
 }

 function drawFx(t, dt, w) {
  const { ctx } = fx;
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);

  // 微尘：随风缓慢漂移、轻轻上浮、透明度呼吸
  const [rx0, ry0, rx1, ry1] = cfg.dust.rect;
  ctx.fillStyle = '#ffecbe';
  for (const m of fx.dust) {
   m.x += (w*.9*m.drift + .25*m.drift)*dt*12;
   m.y -= m.rise*dt*5;
   if (m.y < ry0 - 8) { m.y = ry1; m.x = rx0 + Math.random()*(rx1-rx0); }
   if (m.x > rx1 + 8) m.x = rx0;
   const a = m.a*(.6 + .4*Math.sin(2*Math.PI*t/m.tw + m.ph));
   ctx.globalAlpha = Math.max(0, a);
   ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill();
  }

  // 偶发落叶
  fx.nextLeaf -= dt;
  if (cfg.leafFall && fx.nextLeaf <= 0 && fx.leaves.length < (cfg.leafFall.maxLeaves || 2)) {
   fx.leaves.push(makeFallingLeaf(cfg));
   fx.nextLeaf = cfg.leafFall.minGap + Math.random()*(cfg.leafFall.maxGap-cfg.leafFall.minGap);
  }
  for (let i = fx.leaves.length-1; i >= 0; i--) {
   const l = fx.leaves[i];
   l.age += dt;
   l.x += (w*16 + 7 + l.swayAmp*Math.sin(2*Math.PI*t/l.swayPer))*dt;
   l.y += l.vy*dt; l.rot += l.vr*dt;
   const fade = Math.min(1,l.age/.6)*Math.min(1,Math.max(0,(l.life-l.age)/2));
   if (fade <= 0) { fx.leaves.splice(i, 1); continue; }
   ctx.globalAlpha = .78*fade;
   ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot*Math.PI/180);
   ctx.fillStyle = l.color;
   const turn=.35+.65*Math.abs(Math.sin(l.age*2.3+l.rot*.017));
   ctx.beginPath();ctx.moveTo(-l.len,0);
   ctx.quadraticCurveTo(0,-l.len*.85*turn,l.len,0);
   ctx.quadraticCurveTo(0,l.len*.62*turn,-l.len,0);ctx.fill();
   ctx.strokeStyle='#70532c';ctx.lineWidth=.55;
   ctx.beginPath();ctx.moveTo(-l.len*.8,0);ctx.lineTo(l.len*.8,0);ctx.stroke();
   ctx.restore();
  }
  ctx.globalAlpha = 1;
 }

  return { mount, setScene, update, setPlayback, getPlayback,
   setPaused(value) { paused = !!value; } };
})();
// main.js historically checks window.Ambient before updating the world loop.
// Keep the lexical binding above, but publish the API explicitly for browsers.
window.Ambient = Ambient;
