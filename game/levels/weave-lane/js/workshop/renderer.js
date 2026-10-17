// 纹样渲染器：白坯 / 显色 / 成绸 三态复用。
// 白坯=刚织好的无色纹样（离线去色 pattern_blank.png，褐色织纹在本白坯布上）；
// 显色/成绸=mask 层按缸色染色，扎束段染色后显现为留白毛边带。
// 颜色派生：底色缸→base+light(提亮)，主纹缸→coral+navy(加深)，晕色缸→turquoise+gold(提亮)。
// 纹样工作素材目录（白坯、分层蒙版）。分层蒙版为旧版三缸渲染管线使用，
// 新版逐区域配色管线优先使用内嵌的 REGION_ASSET_DATA / region 蒙版。
const PATTERN_DIR='assets/patterns';
const PATTERN_LAYERS=['base','light','coral','turquoise','gold','navy','shadow'];
const MASK_URL=layer=>`assets/patterns/workshop/masks/mask_${layer}.png`;
const GRAY_PATTERN_URL='assets/patterns/workshop/pattern_blank.png';
const patternAssets={masks:{},loaded:false,grayImg:null,tmp:null};
function refreshWorkshopPreviews(){
 if(typeof $!=='function'||document.getElementById('patternWorkshop').hidden)return;
 const t=document.getElementById('workshopTitle').textContent;
 if(t==='纹样册')showAlbumDetail(albumSelected);
 else if(t==='辨纹扎线')renderThreading();
 else if(t==='把纹样拼回去')redrawPuzzleStrips();
 else if(t==='染回织梦')renderDye();
 else if(t==='把线织成绸')renderWeaving();
}
function loadGrayPattern(){
 if(patternAssets.grayImg||typeof Image==='undefined')return;
 const img=new Image();
 img.onload=refreshWorkshopPreviews;
 patternAssets.grayImg=img;img.src=GRAY_PATTERN_URL;
}
function grayReady(){const i=patternAssets.grayImg;return !!(i&&i.complete&&i.naturalWidth)}
function loadPatternAssets(){
 if(patternAssets.loaded||typeof Image==='undefined')return;
 let n=0;
 PATTERN_LAYERS.forEach(layer=>{const img=new Image();
  img.onload=()=>{if(++n===PATTERN_LAYERS.length)refreshWorkshopPreviews()};
  img.src=MASK_URL(layer);patternAssets.masks[layer]=img});
 loadGrayPattern();
 patternAssets.loaded=true;
}
function masksReady(){const m=patternAssets.masks;return PATTERN_LAYERS.every(l=>m[l]&&m[l].complete&&m[l].naturalWidth)}
// 等待 mask 素材就绪（新版流程跳过了染缸界面，蓝本渲染前需要主动等一次）
let _masksReadyPromise=null;
function ensureMasksReady(){
 if(typeof Image==='undefined')return Promise.resolve();
 if(masksReady())return Promise.resolve();
 loadPatternAssets();
 if(_masksReadyPromise)return _masksReadyPromise;
 _masksReadyPromise=new Promise(res=>{
  const t=setInterval(()=>{if(masksReady()){clearInterval(t);res()}},60);
  setTimeout(()=>{clearInterval(t);res();},5000);
 });
 return _masksReadyPromise;
}
function hexRgb(c){const n=parseInt(c.slice(1),16);return [n>>16&255,n>>8&255,n&255]}
function rgbHex(r,g,b){return '#'+((1<<24)+(Math.round(r)<<16)+(Math.round(g)<<8)+(Math.round(b))).toString(16).slice(1)}
function mixColors(a,b,t){const A=hexRgb(a),B=hexRgb(b);return rgbHex(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t)}
function lighten(c,t){return mixColors(c,'#ffffff',t)}
function darken(c,t){return mixColors(c,'#241a12',t)}
function depthColor(c,depth){const t=(depth-.55)*.55;return t>=0?darken(c,Math.min(.5,t)):lighten(c,Math.min(.5,-t))}
// 当前应使用的三缸颜色：优先 opts 强制（配缸预览/对比），否则按染缸进度
function dyeColors(opts){
 const bp=blueprintById(state.patternPlan?state.patternPlan.blueprint:'p01'),pal=bp.palette;
 if(opts&&opts.colors)return opts.colors;
 const has=k=>vatState[k].done||vatState[k].fill>0;
 const c={};
 if(has('base'))c.base=depthColor(vatColors.base,vatState.base.depth||.55);
 if(has('main'))c.main=depthColor(vatColors.main,vatState.main.depth||.55);
 if(has('halo'))c.turquoise=depthColor(vatColors.halo,vatState.halo.depth||.55);
 if(!Object.keys(c).length)return null;
 c.pal=pal;return c;
}
function tintLayer(ctx,mask,color,alpha){
 if(!mask||!mask.naturalWidth)return;
 const oc=patternAssets.tmp||(patternAssets.tmp=document.createElement('canvas'));
 if(oc.width!==mask.naturalWidth||oc.height!==mask.naturalHeight){oc.width=mask.naturalWidth;oc.height=mask.naturalHeight}
 const og=oc.getContext('2d');
 og.globalCompositeOperation='source-over';og.clearRect(0,0,oc.width,oc.height);
 og.fillStyle=color;og.fillRect(0,0,oc.width,oc.height);
 og.globalCompositeOperation='destination-in';og.drawImage(mask,0,0);
 ctx.globalAlpha=alpha;ctx.drawImage(oc,0,0,ctx.canvas.width,ctx.canvas.height);ctx.globalAlpha=1;
}
function jaggedBand(ctx,x0,x1,y0,y1,teeth,seed){
 const step=(x1-x0)/teeth;
 ctx.beginPath();ctx.moveTo(x0,y0);
 for(let i=0;i<=teeth;i++)ctx.lineTo(x0+step*i,y0+((seed*(i+3))%7-3)*.8);
 for(let i=teeth;i>=0;i--)ctx.lineTo(x0+step*i,y1+((seed*(i+5))%7-3)*.8);
 ctx.closePath();ctx.fill();
}
// 主渲染：mode 'blank' 白坯 | 'dyed' 显色 | 'woven' 成绸
function renderPattern(target,mode,opts){
 opts=opts||{};
 const ctx=target.getContext('2d'),W=target.width,H=target.height;
 ctx.clearRect(0,0,W,H);
 const plan=state.patternPlan||defaultPlan(blueprintById('p01'));
 const bp=blueprintById(plan.blueprint),pal=bp.palette;
 loadPatternAssets();
 const col=dyeColors(opts);
 const ready=masksReady();
 const ground=(mode==='blank'||!col)?(mode==='blank'?'#f5edd8':pal.base):(col.base||pal.base);
 ctx.fillStyle=ground;ctx.fillRect(0,0,W,H);
 if(mode==='blank'){ // 白坯：刚织好的无色纹样（褐色织纹 + 本白坯布）
  if(grayReady())ctx.drawImage(patternAssets.grayImg,0,0,W,H);
  else if(ready){const L=patternAssets.masks;PATTERN_LAYERS.forEach(l=>tintLayer(ctx,L[l],'#8a6a4f',l==='base'?.12:.22))}
 }else if(ready){
  const L=patternAssets.masks;
  if(col){
   const live=k=>activeVat===k&&!vatState[k].done&&vatState[k].fill>0?vatState[k].fill*.9:1;
   tintLayer(ctx,L.base,ground,1);
   tintLayer(ctx,L.light,lighten(ground,.4),1);
   if(col.main){tintLayer(ctx,L.coral,col.main,live('main'));tintLayer(ctx,L.navy,darken(col.main,.45),live('main'))}
   if(col.turquoise){tintLayer(ctx,L.turquoise,col.turquoise,live('halo'));tintLayer(ctx,L.gold,lighten(col.turquoise,.32),live('halo'))}
   tintLayer(ctx,L.shadow,'#3c281e',.10);
  }
 }
 // 扎束留白只在染色后显现：白坯上扎结只是线结，不产生白色带
 if(mode!=='blank'){
  for(let i=0;i<7;i++){
   if(!plan.warp[i])continue;
   ctx.fillStyle='#f6efdb';
   jaggedBand(ctx,0,W,H*i/7,H*(i+1)/7,6,7+i);
  }
  if(plan.extraTie){ // 私章结：右下角一小段留白记号
   ctx.fillStyle='#f6efdb';
   jaggedBand(ctx,W*.70,W*.86,H-16,H,3,3);
  }
 }
 if(mode==='woven'){
  ctx.fillStyle='rgba(90,60,40,.05)';
  for(let y=0;y<H;y+=5)ctx.fillRect(0,y,W,2);
  ctx.fillStyle='rgba(90,60,40,.22)';ctx.fillRect(0,0,W,5);ctx.fillRect(0,H-5,W,5);
 }
}
// 成绸渲染：dyed 方图 → 三列镜像平铺（艾德莱斯绸的对称排）
function renderSilk(target,opts){
 opts=opts||{};
 const ctx=target.getContext('2d'),W=target.width,H=target.height;
 const sq=patternAssets.sq||(patternAssets.sq=document.createElement('canvas'));
 sq.width=Math.min(720,W);sq.height=sq.width;
 if(opts.regionColors){
  renderRegionCloth(sq,opts.regionColors,{tplId:opts.tplId,w:sq.width,h:sq.height});
 }else{
  renderPattern(sq,'dyed',opts);
 }
 ctx.clearRect(0,0,W,H);
 const cw=W/3;
 [0,1,2].forEach(i=>{
  ctx.save();
  if(i===1){ctx.translate(cw,0)}              // 中列正向
  else{ctx.translate(cw*(i+1),0);ctx.scale(-1,1)} // 左右列绕各自中心镜像
  ctx.drawImage(sq,0,0,sq.width,sq.height,0,0,cw,H);
  ctx.restore();
 });
 ctx.fillStyle='rgba(90,60,40,.06)';
 for(let y=0;y<H;y+=5)ctx.fillRect(0,y,W,2);
}

// ===== 染谱预览：逐区域自由配色渲染管线 =====
function _nc(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
const regionAssetCache={};
// 命中编号：优先用离线内嵌的压缩编号数据（file:// 双击直开也安全，不触发跨域像素限制）；
// 极端环境下退回编号图 + getImageData（仅 http(s) 下可用）。
async function decodeRegionHit(t){
 if(typeof REGION_HIT_B64==='string'&&typeof DecompressionStream!=='undefined'&&typeof atob==='function'){
  const bin=Uint8Array.from(atob(REGION_HIT_B64),ch=>ch.charCodeAt(0));
  const ds=new DecompressionStream('deflate');
  // 必须先挂读取端再写入，否则部分浏览器下关闭写入端后管道会挂起
  const outP=new Response(ds.readable).arrayBuffer();
  const w=ds.writable.getWriter();
  await w.write(bin);await w.close();
  const ab=await outP;
  const hit=new Uint8Array(ab);
  if(hit.length===t.size*t.size)return hit;
 }
 const cv=_nc(t.size,t.size),cx=cv.getContext('2d');
 cx.imageSmoothingEnabled=false;
 const img=await new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=t.map;});
 if(!img)throw new Error('region map unavailable');
 cx.drawImage(img,0,0,t.size,t.size);
 const md=cx.getImageData(0,0,t.size,t.size).data,hit=new Uint8Array(t.size*t.size);
 for(let i=0,j=0;i<md.length;i+=4,j++)hit[j]=md[i];
 return hit;
}
function loadRegionAssets(tplId){
 const t=regionTemplate(tplId);
 if(regionAssetCache[tplId])return regionAssetCache[tplId].promise;
 const rec=regionAssetCache[tplId]={t,ready:false};
 // 优先使用离线内嵌 data URI（file:// 双击直开画布也不被污染，可导出缩略图）
 const E=(typeof REGION_ASSET_DATA!=='undefined')?REGION_ASSET_DATA:null;
 const list=[['blank',E?E.blank:t.blank],['factor',E?E.factor:'assets/patterns/workshop/silk_factor.png'],['noise',E?E.noise:'assets/patterns/workshop/noise_tile.png'],['lines',E?E.lines:t.lines]];
 for(const {id:i} of t.regions)list.push(['r'+i,E?E['r'+i]:t.maskDir+'region_'+String(i).padStart(2,'0')+'.png']);
 rec.promise=(async()=>{
  // 无 DOM 的测试环境：直接返回未就绪 rec，由调用方自行打桩
  if(typeof Image==='undefined'){rec.img={};rec.hit=new Uint8Array(t.size*t.size);rec.bbox={};rec.tintCache={};rec.edgeCache={};rec.edgeXY={};rec.s1=null;rec.s2=null;rec.factor=null;rec.faint=null;return rec;}
  const imgs={};
  await Promise.all(list.map(([k,url])=>new Promise(res=>{
   const im=new Image();
   im.onload=()=>{imgs[k]=im;res()};
   im.onerror=()=>{imgs[k]=null;res()};
   im.src=url;
  })));
  if(!imgs.blank||!imgs.factor||!imgs.noise||!imgs.lines)throw new Error('染谱基础素材加载失败');
  for(const {id:i} of t.regions)if(!imgs['r'+i])throw new Error('区域蒙版 r'+i+' 加载失败');
  rec.img=imgs;
  rec.factor=imgs.factor;
  rec.noisePattern=_nc(97,97).getContext('2d').createPattern(imgs.noise,'repeat');
  rec.hit=await decodeRegionHit(t);
  // 每区域包围盒（由编号数据一次扫描）
  rec.bbox={};
  const S=t.size;
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
   const id=rec.hit[y*S+x];let b=rec.bbox[id];
   if(!b)rec.bbox[id]={x0:x,y0:y,x1:x,y1:y};
   else{if(x<b.x0)b.x0=x;if(x>b.x1)b.x1=x;if(y<b.y0)b.y0=y;if(y>b.y1)b.y1=y;}
  }
  rec.tintCache={};rec.edgeCache={};rec.edgeXY={};
  rec.s1=_nc(S,S);rec.s2=_nc(S,S);rec.faint=null;
  rec.ready=true;
  return rec;
 })();
 rec.promise.catch&&rec.promise.catch(err=>{rec.error=err&&err.message?err.message:String(err);});
 return rec.promise;
}
// 全幅区域染色：纯色 × 材质因子 × 区域软蒙版（结果画在 rec.s1）
function paintRegionFull(rec,rid,hex){
 const S=rec.t.size,ctx=rec.s1.getContext('2d');
 ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.filter='none';
 ctx.clearRect(0,0,S,S);ctx.fillStyle=hex;ctx.fillRect(0,0,S,S);
 ctx.globalCompositeOperation='multiply';ctx.drawImage(rec.factor,0,0);
 if(rec.noisePattern){ctx.fillStyle=rec.noisePattern;ctx.fillRect(0,0,S,S);}
 ctx.globalCompositeOperation='destination-in';ctx.drawImage(rec.img['r'+rid],0,0);
 ctx.globalCompositeOperation='source-over';
 return rec.s1;
}
function getRegionTint(rec,rid,hex){
 const key=rid+'@'+hex;
 if(rec.tintCache[key])return rec.tintCache[key];
 Object.keys(rec.tintCache).forEach(k=>{if(k.startsWith(rid+'@'))delete rec.tintCache[k];});
 const S=rec.t.size,b=rec.bbox[rid],pad=2;
 const bx=Math.max(0,b.x0-pad),by=Math.max(0,b.y0-pad),
       bw=Math.min(S-1,b.x1+pad)-bx+1,bh=Math.min(S-1,b.y1+pad)-by+1;
 // 静态色块只处理本区域包围盒，避免每次为小纹样重复合成整幅画布。
 const out=_nc(bw,bh),ctx=out.getContext('2d');
 ctx.fillStyle=hex;ctx.fillRect(0,0,bw,bh);
 ctx.globalCompositeOperation='multiply';
 ctx.drawImage(rec.factor,bx,by,bw,bh,0,0,bw,bh);
 if(rec.noisePattern){
  ctx.save();ctx.translate(-bx,-by);ctx.fillStyle=rec.noisePattern;
  ctx.fillRect(bx,by,bw,bh);ctx.restore();
 }
 ctx.globalCompositeOperation='destination-in';
 ctx.drawImage(rec.img['r'+rid],bx,by,bw,bh,0,0,bw,bh);
 ctx.globalCompositeOperation='source-over';
 rec.tintCache[key]={canvas:out,bx,by};
 return rec.tintCache[key];
}
// 区域悬停反馈：内部轻提亮 + 内缘奶白亮边 + 外缘极细暖褐轮廓（深区浅区都可辨）
function getRegionEdge(rec,rid){
 if(rec.edgeCache[rid])return rec.edgeCache[rid];
 const S=rec.t.size,b=rec.bbox[rid],pad=8;
 const bx=Math.max(0,b.x0-pad),by=Math.max(0,b.y0-pad),
       x2=Math.min(S,b.x1+pad),y2=Math.min(S,b.y1+pad),bw=x2-bx+1,bh=y2-by+1;
 const ring=_nc(bw,bh),c=ring.getContext('2d');
 const mask=rec.img['r'+rid];
 // ① 区域内部极轻提亮，让深底区域也有明确反馈（mask 本身带 alpha，直接薄铺一层）
 c.globalAlpha=0.18;c.drawImage(mask,-bx,-by);c.globalAlpha=1;
 // ② 外缘奶白柔光（深色区域相邻边界上可辨）
 const halo=_nc(bw,bh),g=halo.getContext('2d');
 g.filter='blur(4px)';g.drawImage(mask,-bx,-by);g.filter='none';
 g.globalCompositeOperation='destination-out';g.drawImage(mask,-bx,-by);
 g.globalCompositeOperation='source-in';g.fillStyle='rgba(255,246,216,0.8)';g.fillRect(0,0,bw,bh);
 c.drawImage(halo,0,0);
 // ③ 外缘一圈极细暖褐轮廓（米白留白区也能辨认范围）
 const hair=_nc(bw,bh),h=hair.getContext('2d');
 h.filter='blur(2.4px)';h.drawImage(mask,-bx,-by);h.filter='none';
 h.globalCompositeOperation='destination-out';h.drawImage(mask,-bx,-by);
 h.globalCompositeOperation='source-in';h.fillStyle='rgba(110,76,46,0.7)';h.fillRect(0,0,bw,bh);
 c.drawImage(hair,0,0);
 rec.edgeCache[rid]=ring;rec.edgeXY[rid]={bx,by};
 // Hover feedback stays within the same compartment as the dye itself.
 c.globalCompositeOperation='destination-in';c.drawImage(mask,-bx,-by);
 c.globalCompositeOperation='source-over';
 return ring;
}
function drawFaintLines(ctx,rec,alpha){
 const S=rec.t.size;
 if(!rec.faint){
  const f=_nc(S,S),c=f.getContext('2d');
  c.filter='blur(1.3px)';for(const r of rec.t.drawOrder)c.drawImage(rec.img['r'+r],0,0);
  c.filter='none';c.globalCompositeOperation='destination-out';
  for(const r of rec.t.drawOrder)c.drawImage(rec.img['r'+r],0,0);
  c.globalCompositeOperation='source-in';c.fillStyle='#7a5a3a';c.fillRect(0,0,S,S);
  c.globalCompositeOperation='source-over';rec.faint=f;
 }
 ctx.globalAlpha=alpha;ctx.drawImage(rec.faint,0,0);ctx.globalAlpha=1;
}
// 当前区域配色 → 方图（编辑/挂布/织造共用同一份颜色数据）
function renderRegionCloth(target,colors,opts){
 opts=opts||{};
 const tpl=regionTemplate(opts.tplId||(state.patternPlan&&state.patternPlan.blueprint)||'p01');
 const rec=regionAssetCache[tpl.id];
 const W=opts.w||target.width||tpl.size,H=opts.h||target.height||tpl.size;
 const c=_nc(tpl.size,tpl.size),x=c.getContext('2d');
 const blankImg=(rec&&rec.ready&&rec.img.blank)||patternAssets.grayImg;
 if(blankImg)x.drawImage(blankImg,0,0,tpl.size,tpl.size);
 if(rec&&rec.ready){
  for(const rid of tpl.drawOrder){
   const hex=colors[rid];if(hex==null)continue;
   const ti=getRegionTint(rec,rid,hex);
   x.drawImage(ti.canvas,ti.bx,ti.by);
  }
  // 黑线压顶：轮廓线不被色块覆盖（涂色本模式）
  if(rec.img.lines)x.drawImage(rec.img.lines,0,0,tpl.size,tpl.size);
 }
 target.width=W;target.height=H;
 const tx=target.getContext('2d');tx.clearRect(0,0,W,H);
 tx.imageSmoothingQuality='high';
 tx.drawImage(c,0,0,W,H);
 return c;
}
// 编辑画布整帧：已显色 + 染色动画 + 悬停亮边
function renderEditingFrame(rec,state2,target){
 const S=rec.t.size,t=rec.t;
 const c=_nc(S,S),x=c.getContext('2d');
 x.drawImage(rec.img.blank,0,0,S,S);
 const anims=state2.anims;
 for(const rid of t.drawOrder){
  if(anims[rid])continue;
  const hex=state2.committed[rid];if(hex==null)continue;
  const ti=getRegionTint(rec,rid,hex);x.drawImage(ti.canvas,ti.bx,ti.by);
 }
 // 动画区：旧色铺底 + 新色沿丝显现
 const now=performance.now();
 const drawAnimBase=(rid,a)=>{
  if(a.fromSnap){x.drawImage(a.fromSnap,0,0);}
  else if(a.fromHex){const ti=getRegionTint(rec,rid,a.fromHex);x.drawImage(ti.canvas,ti.bx,ti.by);}
 };
 for(const rid in anims){
  const a=anims[rid],b=rec.bbox[rid];
  const elapsed=now-a.t0-(a.delay||0)*1000;
  if(elapsed<0){drawAnimBase(rid,a);continue;}
  drawAnimBase(rid,a);
  const t01=Math.min(1,elapsed/a.dur);
  let alpha=1;
  if(a.reduced){alpha=t01;}
  if(alpha>0.01){
   const rev=rec.s2,rc=rev.getContext('2d');
   rc.globalCompositeOperation='source-over';rc.globalAlpha=1;rc.filter='none';
   rc.clearRect(0,0,S,S);
   if(a.reduced){
    rc.fillStyle='#fff';rc.fillRect(b.x0,b.y0,b.x1-b.x0+1,b.y1-b.y0+1);
   }else{
    const ease=v=>v*v*(3-2*v);
    for(const s of a.strips){
     const grow=Math.max(0,Math.min(1,elapsed/(a.dur*0.72)-s.delay));
     const q=Math.min(1,s.q0+ease(grow)*(1-s.q0));
     if(q<=0)continue;
     const top=a.oy-q*(a.oy-b.y0+26)-s.jit*q*12;
     const bot=a.oy+q*(b.y1-a.oy+26)+s.jit*q*12;
     rc.fillStyle='#fff';rc.fillRect(s.x,top,s.w,Math.max(0,bot-top));
    }
   }
   rc.globalCompositeOperation='destination-in';rc.drawImage(rec.img['r'+rid],0,0);
   // 新色 × 显现蒙版
   paintRegionFull(rec,rid,a.toHex);
   const pc=rec.s1.getContext('2d');
   pc.globalCompositeOperation='destination-in';pc.drawImage(rev,0,0);
   pc.globalCompositeOperation='source-over';
   x.globalAlpha=a.reduced?t01:1;
   x.drawImage(rec.s1,0,0);
   x.globalAlpha=1;
  }
 }
 // 黑线压顶：色块/动画之上恢复黑色轮廓（涂色本模式）
 if(state2.hoverId!=null&&!anims[state2.hoverId]){
  const ring=getRegionEdge(rec,state2.hoverId),p=rec.edgeXY[state2.hoverId];
  x.drawImage(ring,p.bx,p.by);
 }
 if(rec.img.lines)x.drawImage(rec.img.lines,0,0,S,S);
 target.width=S;target.height=S;
 const tx=target.getContext('2d');tx.clearRect(0,0,S,S);tx.drawImage(c,0,0);
}
// 悬挂挂布成品（程序化褶皱/丝光/投影/木杆/流苏；占位美术，可替换为正式素材）
function renderHanging(target,colors,tplId){
 return renderFinishedHanging(target,colors,tplId);
}
