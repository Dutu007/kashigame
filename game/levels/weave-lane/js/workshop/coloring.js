// 染谱预览：固定纹样、逐区域自由配色。
// 编辑画布、成品预览、染线演出、织造成品共用同一份区域颜色数据。
const DRAFT_PREFIX='cs';
let cs=null; // 当前编辑会话
// touched 只保存 true：撤销回未操作状态时删除键，避免门控把 false 键算作"操作过"
function trueKeys(o){const n={};for(const k in o)if(o[k])n[k]=true;return n;}
function touchedCount(){return Object.keys(cs?cs.touched:{}).length;}

function openColoring(){
 $('workshopTitle').textContent='染谱预览';
 $('workshopKicker').textContent='染坊 · 线束配色';
 ['albumView','threadingView','puzzleView','weavingView','dyeView'].forEach(id=>$(id).hidden=true);
 $('coloringView').hidden=false;
 const _shell=document.querySelector('.workshop-shell');if(_shell)_shell.scrollTop=0;
 const tplId=state.patternPlan?state.patternPlan.blueprint:'p01';
 const draft=loadDraft();
 cs={
  tplId, rec:null,
  committed:{}, touched:{},
  selected:null,
  symmetryOn:false, kindOn:false,
  history:[], future:[],
  anims:{}, raf:0,
  hoverId:null, showLines:true,
  scale:1, fit:1,
  workName:regionTemplate(tplId).defaultName,
  hintHidden:false, helpOn:false,
  closing:false
 };
 workshopCloseHook=coloringCloseHook;
 if(draft&&draft.templateId===tplId){
  cs.committed=Object.assign({},draft.colors||{});
  cs.touched=trueKeys(draft.touched||{});
  cs.symmetryOn=draft.symmetryOn!==false;
  cs.kindOn=!!draft.kindOn;
  cs.workName=draft.workName||cs.workName;
  cs.hintHidden=touchedCount()>0;
 }else if(state.patternPlan&&state.patternPlan.regionColors){
  cs.committed=Object.assign({},state.patternPlan.regionColors);
  cs.touched=trueKeys(state.patternPlan.regionTouched||{});
  cs.workName=state.patternPlan.workName||cs.workName;
  cs.hintHidden=touchedCount()>0;
 }
 buildInspiration();
 buildDishes();
 syncToggleUI();
 $('workNameInput').value=cs.workName;
 $('coloringHint').hidden=cs.hintHidden;
 updateUndoRedo();
 updateSoundButton();
 const session=cs;
 loadRegionAssets(tplId).then(rec=>{
  if(cs!==session)return;
  cs.rec=rec;
  fitStage();
  bindColoringOnce();
  scheduleFrame();
 }).catch(err=>{if(cs===session)showToast('染谱素材加载失败，请重新进入染坊');console.error(err);});
}

// ---------- UI 构建 ----------
function buildInspiration(){
 const box=$('inspireCards');
 box.innerHTML=INSPIRATION_CARDS.map((c,i)=>'<div class="inspire-card"><small>灵感 '+['一','二','三','四'][i]+' · '+c.name+'</small><div>'+
  c.colors.map(h=>'<i style="background:'+h+'" title="'+(dyeName(h)||'')+'"></i>').join('')+'</div></div>').join('');
}
function dyeName(hex){const c=DYE_COLORS.find(d=>d.hex.toLowerCase()===hex.toLowerCase());return c?c.name:'';}
function buildDishes(){
 const grid=$('dyeDishGrid');
 grid.innerHTML='';
 DYE_COLORS.forEach((d,i)=>{
  const b=document.createElement('button');
  b.type='button';b.className='dye-dish'+(d.base?' cream':'');b.dataset.hex=d.hex;
  b.title=d.name;
  b.innerHTML='<span class="dye-liquid" style="background:'+d.hex+'"></span><em>'+d.name+'</em>';
  b.onclick=()=>selectColor(d.hex,b);
  grid.appendChild(b);
 });
}
function selectColor(hex,btn){
 cs.selected=hex;
 document.querySelectorAll('.dye-dish').forEach(b=>b.classList.toggle('selected',b.dataset.hex===hex));
 $('currentSwatch').style.background=hex;
 $('currentName').textContent=dyeName(hex)||'未选色';
}
function syncToggleUI(){
 $('tgSym').checked=cs.symmetryOn;
 $('tgKind').checked=cs.kindOn;
}
function updateUndoRedo(){
 $('btnUndo').disabled=!cs.history.length;
 $('btnRedo').disabled=!cs.future.length;
 $('btnPreview').disabled=touchedCount()===0;
}
function updateSoundButton(){
 const b=$('soundToggle');
 b.textContent=SoundFX.muted()?'🔇':'🔊';
 b.title=SoundFX.muted()?'开启音效':'关闭音效';
}

// ---------- 命中 / 悬停 / 点击 ----------
function eventToMap(e){
 const cv=$('coloringCanvas'),r=cv.getBoundingClientRect();
 return {x:(e.clientX-r.left)/r.width*REGION_SIZE,y:(e.clientY-r.top)/r.height*REGION_SIZE,inRect:e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom};
}
function hitRegion(x,y){
 if(!cs||!cs.rec)return null;
 const S=REGION_SIZE;
 if(x<0||y<0||x>=S||y>=S)return null;
 const ix=Math.floor(x),iy=Math.floor(y);
 const id=cs.rec.hit[iy*S+ix];
 return cs.rec.t.regions.some(r=>r.id===id)?id:null;
}
let _bound=false;
function bindColoringOnce(){
 if(_bound)return;_bound=true;
 const stage=$('coloringStage'),cv=$('coloringCanvas');
 let down=null;
 stage.addEventListener('pointerdown',e=>{
  if(!cs)return;
  if(e.target.closest&&e.target.closest('button'))return;
  down={x:e.clientX,y:e.clientY,sl:stage.scrollLeft,st:stage.scrollTop,drag:false};
  try{stage.setPointerCapture&&stage.setPointerCapture(e.pointerId);}catch(err){}
 });
 stage.addEventListener('pointermove',e=>{
  if(!cs){down=null;return;}
  const dot=$('coloringCursor');
  if(down){
   const dx=e.clientX-down.x,dy=e.clientY-down.y;
   if(Math.hypot(dx,dy)>6)down.drag=true;
   if(down.drag){stage.scrollLeft=down.sl-dx;stage.scrollTop=down.st-dy;}
  }else{
   const p=eventToMap(e);
   if(p.inRect&&cs.rec){
    const id=hitRegion(p.x,p.y);
    if(id!==cs.hoverId){cs.hoverId=id;scheduleFrame();}
    const r=cv.getBoundingClientRect();
    dot.style.left=(e.clientX-stage.getBoundingClientRect().left)+'px';
    dot.style.top=(e.clientY-stage.getBoundingClientRect().top)+'px';
    dot.style.background=cs.selected||'rgba(255,255,255,.4)';
    dot.style.opacity=1;
    cv.style.cursor=id==null?'default':'crosshair';
   }else{
    if(cs.hoverId!==null){cs.hoverId=null;scheduleFrame();}
    dot.style.opacity=0;cv.style.cursor='default';
   }
  }
 });
 const end=e=>{
  if(!cs){down=null;return;}
  if(!down)return;const wasDown=down;down=null;
  if(!wasDown.drag){
   const p=eventToMap(e);
   if(p.inRect){
    const id=hitRegion(p.x,p.y);
    if(id!=null)applyColor(id,p.x,p.y);
   }
  }
 };
 stage.addEventListener('pointerup',end);
 stage.addEventListener('pointercancel',()=>{down=null;});
 stage.addEventListener('pointerleave',()=>{if(cs&&!down){cs.hoverId=null;scheduleFrame();$('coloringCursor').style.opacity=0;}});
 stage.addEventListener('wheel',e=>{e.preventDefault();zoomBy(e.deltaY<0?1.12:1/1.12);},{passive:false});
 $('czIn').onclick=()=>zoomBy(1.18);
 $('czOut').onclick=()=>zoomBy(1/1.18);
 $('czFit').onclick=()=>{cs.scale=1;applyScale();};
 window.addEventListener('resize',()=>{if(cs&&!$('coloringView').hidden)fitStage();});
 $('btnUndo').onclick=undoColor;
 $('btnRedo').onclick=redoColor;
 $('tgSym').onchange=e=>{cs.symmetryOn=e.target.checked;autosave();};
 $('tgKind').onchange=e=>{cs.kindOn=e.target.checked;autosave();};
 $('btnReset').onclick=()=>showConfirm('清空当前所有配色，重新开始吗？','清空','取消',()=>{
  cs.committed={};cs.touched={};cs.history=[];cs.future=[];cs.anims={};
  updateUndoRedo();scheduleFrame();autosave();showToast('染谱已重置');
 });
 $('btnPreview').onclick=openHangingPreview;
 $('soundToggle').onclick=()=>{SoundFX.setMuted(!SoundFX.muted());updateSoundButton();};
 $('inspireToggle').onclick=()=>{$('inspirePane').classList.toggle('collapsed');requestAnimationFrame(()=>fitStage());};
 $('coloringHelp').onclick=()=>{cs.helpOn=!cs.helpOn;$('coloringHint').hidden=!cs.helpOn;
  $('coloringHint').innerHTML=cs.helpOn?'先选一种颜色，再点击想染的纹样。<small>右侧选色；下方可开关对称联动、同类一起染，可撤销、缩放与重置。</small>':'';};
 // 成品预览
 $('hangingBack').onclick=()=>$('hangingOverlay').hidden=true;
 $('hangingConfirm').onclick=confirmColors;
 // 染线演出
 $('performSkip').onclick=()=>finishPerformance(true);
}

// ---------- 缩放 ----------
function fitStage(){
 const stage=$('coloringStage');
 const pad=10;
 cs.fit=Math.min((stage.clientWidth-pad)/REGION_SIZE,(stage.clientHeight-pad)/REGION_SIZE);
 applyScale();
}
function applyScale(){
 const cv=$('coloringCanvas');
 const k=cs.fit*cs.scale;
 cv.style.width=Math.round(REGION_SIZE*k)+'px';
 cv.style.height=Math.round(REGION_SIZE*k)+'px';
}
function zoomBy(f){
 if(!cs)return;
 cs.scale=Math.max(1,Math.min(3.4,cs.scale*f));
 applyScale();
}

// ---------- 染色操作 ----------
function hash01(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);}
// 截取某区域"当前这一刻"的显色画面（动画中途换色时作为平滑起点，避免整块闪回旧色）
function captureAnimFrame(rid,a){
 const rec=cs.rec,S=REGION_SIZE,b=rec.bbox[rid];
 if(!b||a.reduced)return null;
 const now=performance.now();
 const mask=_nc(S,S),mc=mask.getContext('2d');
 const ease=v=>v*v*(3-2*v);
 for(const s of a.strips){
  const elapsed=now-a.t0-(a.delay||0)*1000;
  const grow=Math.max(0,Math.min(1,elapsed/(a.dur*0.72)-s.delay));
  const q=Math.min(1,s.q0+ease(grow)*(1-s.q0));
  if(q<=0)continue;
  const top=a.oy-q*(a.oy-b.y0+26)-s.jit*q*12;
  const bot=a.oy+q*(b.y1-a.oy+26)+s.jit*q*12;
  mc.fillStyle='#fff';mc.fillRect(s.x,top,s.w,Math.max(0,bot-top));
 }
 mc.globalCompositeOperation='destination-in';mc.drawImage(rec.img['r'+rid],0,0);
 paintRegionFull(rec,rid,a.toHex);
 const pc=rec.s1.getContext('2d');
 pc.globalCompositeOperation='destination-in';pc.drawImage(mask,0,0);pc.globalCompositeOperation='source-over';
 const out=_nc(S,S);out.getContext('2d').drawImage(rec.s1,0,0);
 return out;
}
function makeAnim(rid,toHex,mx,my){
 const rec=cs.rec,b=rec.bbox[rid],S=REGION_SIZE;
 const reduced=!!(SoundFX.reduced&&SoundFX.reduced());
 const old=cs.anims[rid];
 const strips=[];
 const sw=8;
 for(let x=b.x0;x<=b.x1;x+=sw){
  const cxm=x+sw/2,j=(hash01(rid*13+x*3)-0.5)*2;
  const hDelay=Math.abs(cxm-mx)/S*0.34+j*0.05;
  let q0=0;
  if(old){const i=Math.floor((x-b.x0)/sw);q0=old.strips[i]?stripQ(old,old.strips[i]):0;}
  strips.push({x,w:sw+1,delay:Math.max(0,0.05+hDelay),jit:j,q0});
 }
 // 旧动画进行中：以当前视觉快照为底（无缝）；否则用已提交的旧色平涂；都没有则从米白显现
 let fromHex=cs.committed[rid]||null,fromSnap=null;
 if(old){
  if(old.reduced){fromHex=old.toHex||cs.committed[rid]||null;}
  else{fromSnap=captureAnimFrame(rid,old);fromHex=fromSnap?null:(old.toHex||cs.committed[rid]||null);}
 }
 return {fromHex,fromSnap,toHex,t0:performance.now(),dur:reduced?240:880,
  delay:0,reduced,strips,oy:Math.max(b.y0,Math.min(b.y1,my)),ox:mx};
}
function stripQ(a,s){
 const elapsed=performance.now()-a.t0-(a.delay||0)*1000;
 const tt=elapsed/(a.dur*0.72);
 if(a.reduced)return Math.max(s.q0,Math.min(1,elapsed/a.dur));
 const g=Math.max(0,Math.min(1,tt-s.delay));
 const e=g*g*(3-2*g);
 return Math.max(s.q0,Math.min(1,s.q0+e*(1-s.q0)));
}
function applyColor(rid,mx,my){
 if(!cs.rec)return;
 if(!cs.selected){showToast('先在右侧选一种染液颜色');return;}
 const affected=expandRegions(cs.tplId,rid,cs.symmetryOn,cs.kindOn);
 const before={},after={};
 let changed=false;
 for(const r of affected){
  // 以"当前应呈现的颜色"为准：动画进行中取在途动画的目标色，而不是尚未更新的已提交色
  const pending=cs.anims[r]?cs.anims[r].toHex:(cs.committed[r]??null);
  before[r]={c:pending,t:!!(cs.anims[r]||cs.touched[r])};
  after[r]={c:cs.selected,t:true};
  if(pending!==cs.selected)changed=true;
 }
 if(!changed)return; // 重复同色（含动画在途时重复点同一颜色）：不堆叠、不入历史、不响音
 for(const r of affected){
  cs.anims[r]=makeAnim(r,cs.selected,mx,my);
  cs.touched[r]=true;
 }
 cs.history.push({affected,before,after});
 cs.future=[];
 updateUndoRedo();
 $('coloringHint').hidden=true;cs.helpOn=false;
 SoundFX.dye(cs.selected);
 scheduleFrame();
 autosave();
}
function animSettled(){
 const now=performance.now();
 for(const rid in cs.anims){
  const a=cs.anims[rid];
  const tt=(now-a.t0-(a.delay||0))/a.dur;
  if(tt<1.05)return false;
 }
 return true;
}
function finalizeAnims(){
 let any=false;
 for(const rid in cs.anims){
  const a=cs.anims[rid];
  cs.committed[Number(rid)]=a.toHex;any=true;
 }
 cs.anims={};
 if(any){scheduleFrame();autosave();}
}
let _rafOn=false;
function scheduleFrame(){
 if(_rafOn||!cs||!cs.rec)return;_rafOn=true;
 const loop=()=>{
  if(!cs||!cs.rec){_rafOn=false;return;}
  renderEditingFrame(cs.rec,{committed:cs.committed,anims:cs.anims,hoverId:cs.hoverId,showLines:cs.showLines},$('coloringCanvas'));
  let running=false;
  const now=performance.now();
  for(const rid in cs.anims){const a=cs.anims[rid];if((now-a.t0-(a.delay||0))/a.dur<1.05)running=true;}
  if(running){requestAnimationFrame(loop);}
  else{_rafOn=false;finalizeAnims();}
 };
 requestAnimationFrame(loop);
}
// 撤销/重做：最终状态立即生效，仅在画面上做一次柔和淡入；
// 淡出动画带 token，收尾只清理自己，绝不影响期间用户新开的染色动画。
let fadeTokenSeq=0;
function fadeTo(snapshot){
 if(!cs.rec)return;
 const token=++fadeTokenSeq,t0=performance.now();
 for(const r in snapshot){
  const rid=Number(r),to=snapshot[r].c;
  const oldHex=cs.committed[rid]||null;
  if(to==null)delete cs.committed[rid];else cs.committed[rid]=to;
  if(snapshot[r].t)cs.touched[rid]=true;else delete cs.touched[rid];
  const b=cs.rec.bbox[rid];
  cs.anims[rid]={fromHex:oldHex,toHex:to||CREAM_HEX,t0,dur:240,delay:0,reduced:true,fadeToken:token,
   strips:[{x:b.x0,w:b.x1-b.x0+1,delay:0,jit:0,q0:0}],oy:b.y0,ox:627};
 }
 scheduleFrame();
 setTimeout(()=>{
  if(!cs)return;
  for(const k of Object.keys(cs.anims)){if(cs.anims[k].fadeToken===token)delete cs.anims[k];}
  scheduleFrame();autosave();
 },280);
}
function undoColor(){
 if(!cs.history.length)return;
 const e=cs.history.pop();cs.future.push(e);
 fadeTo(e.before);updateUndoRedo();
}
function redoColor(){
 if(!cs.future.length)return;
 const e=cs.future.pop();cs.history.push(e);
 const snap={};Object.keys(e.after).forEach(r=>snap[r]=e.after[r]);
 fadeTo(snap);updateUndoRedo();
}

// ---------- 草稿 ----------
let _saveTimer=0;
function autosave(){
 if(!cs)return;
 clearTimeout(_saveTimer);
 _saveTimer=setTimeout(()=>{
  if(!cs)return;
  const ok=saveDraft({templateId:cs.tplId,colors:draftColors(),touched:cs.touched,
   symmetryOn:cs.symmetryOn,kindOn:cs.kindOn,workName:cs.workName,confirmed:!!(state.patternPlan&&state.patternPlan.regionColors)});
  if(!ok)showToast('草稿保存失败：当前配色仍保留在画面中，请尽快完成或截图');
 },400);
}
function draftColors(){
 const colors=Object.assign({},cs.committed);
 for(const rid in cs.anims)colors[rid]=cs.anims[rid].toHex;
 return colors;
}
function saveDraftNow(){
 if(!cs)return true;
 return saveDraft({templateId:cs.tplId,colors:draftColors(),touched:cs.touched,
  symmetryOn:cs.symmetryOn,kindOn:cs.kindOn,workName:cs.workName,confirmed:!!(state.patternPlan&&state.patternPlan.regionColors)});
}

// ---------- 成品预览 ----------
function openHangingPreview(){
 if(!cs.rec||touchedCount()===0)return;
 for(const rid in cs.anims){const a=cs.anims[rid];cs.committed[Number(rid)]=a.toHex;}
 cs.anims={};scheduleFrame();
 cs.workName=$('workNameInput').value||regionTemplate(cs.tplId).defaultName;
 renderHanging($('hangingCanvas'),cs.committed,cs.tplId);
 $('hangingOverlay').hidden=false;
}
function confirmColors(){
 const untouched=regionTemplate(cs.tplId).regions.filter(r=>r.id!==0&&!cs.touched[r.id]);
 const doConfirm=()=>{
  $('hangingOverlay').hidden=true;
  cs.workName=$('workNameInput').value||regionTemplate(cs.tplId).defaultName;
  state.patternPlan=state.patternPlan||{blueprint:cs.tplId};
  state.patternPlan.regionColors=Object.assign({},cs.committed);
  state.patternPlan.regionTouched=Object.assign({},cs.touched);
  state.patternPlan.workName=cs.workName;
  saveDraftNow();
  startDyePerformance();
 };
 if(untouched.length)showConfirm('其余区域将保留米白，确认完成吗？','确认完成','再看看',doConfirm);
 else doConfirm();
}

// ---------- 染线演出（自动、可跳过）----------
let _wash=null;
function startDyePerformance(){
 const overlay=$('dyePerform');overlay.hidden=false;
 $('performText').textContent='染线中……颜色正沿丝线渗进经线';
 const cv=$('performCanvas');
 const tpl=regionTemplate(cs.tplId);
 // 全部已染区域分批错峰显现
 const semanticGroups=[[1,2,3],[4,5],[8,9,10],[6,7],[11,12,13,14,15],[16,17],[0]];
 const groups=semanticGroups.map(g=>tpl.regions.filter(r=>g.includes(r.legacyId??r.id)).map(r=>r.id));
 const perf={committed:{},anims:{},hoverId:null,showLines:false};
 let t0=performance.now()+250;
 for(let gi=0;gi<groups.length;gi++){
  for(const rid of groups[gi]){
   const hex=cs.committed[rid];
   if(hex==null)continue;
   const b=cs.rec.bbox[rid];
   const a=makeAnim(rid,hex,tpl.axis,b?b.y0+40:400);
   a.t0=t0;a.delay=gi*0.22;a.dur=1500;a.fromHex=null;a.strips.forEach(s=>{s.delay*=0.7;});
   perf.anims[rid]=a;
  }
 }
 _wash=SoundFX.dyeWash();
 let on=true;
 const render=()=>{
  if(!on)return;
  renderEditingFrame(cs.rec,perf,cv);
  const now=performance.now();let running=false;
  for(const rid in perf.anims){const a=perf.anims[rid];if((now-a.t0-a.delay*1000)/a.dur<1.02)running=true;}
  if(running)requestAnimationFrame(render);
  else{for(const rid in perf.anims)perf.committed[Number(rid)]=perf.anims[rid].toHex;
   renderEditingFrame(cs.rec,perf,cv);setTimeout(()=>finishPerformance(false),350);}
 };
 requestAnimationFrame(render);
 cs._perfStop=()=>{on=false;};
}
function finishPerformance(skipped){
 if(!cs)return; // 演出自然结束与“跳过”可能竞态，只允许收尾一次
 if(cs._perfStop){cs._perfStop();cs._perfStop=null;}
 if(_wash){_wash.stop();_wash=null;}
 $('dyePerform').hidden=true;
 // 染完色即得完整织布：不再回织房上机织造，染线演出收尾后直接把成绸送上晾晒架
 state.dyedWarp=true;
 state.woven=true;
 weaveState.demo=false;weaveState.round=3;weaveState.step=0;
 workshopCloseHook=null;
 cs.closing=true;
 clearDraft();
 closeWorkshop();
 state.busy=false;
 cs=null;
 render();
 showToast('染线完成——获得完整织布','gold');
 openCompare();
}

// ---------- 退出 ----------
function coloringCloseHook(){
 if(cs&&!cs.closing){const ok=saveDraftNow();cs=null;if(!ok)showToast('草稿保存失败：本次配色未能保留，请重新进入染坊');}
}
