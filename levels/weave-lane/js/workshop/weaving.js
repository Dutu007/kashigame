// 织绸：第 1 轮阿木提示范（自动演示，可跳过），第 2、3 轮玩家跟做。
// 每轮完成，绸面按 patternPlan 多织一截；完成后与蓝本对比，收入「我的纹样册」。
let demoTimer=null;
function setupWeaving(){
 $('workshopTitle').textContent='把线织成绸';
 $('workshopKicker').textContent='老织坊 · 织机操作';
 if(state.woven){weaveState.demo=false;weaveState.round=3}
 demoTimer=null;
 $('demoSkip').hidden=!weaveState.demo;
 renderWeaving();
 if(weaveState.demo)runDemo();
}
function runDemo(){
 $('weaveActions').querySelectorAll('button').forEach(b=>b.disabled=true);
 $('demoHint').textContent='示范中：看阿木提的手——';
 const steps=['steady','shuttle','tighten'];
 let i=0;
 demoTimer=setInterval(()=>{
  const action=steps[i];
  markDemoButton(action);
  drawShuttle(i);
  i++;
  if(i>=steps.length){
   clearInterval(demoTimer);demoTimer=null;
   setTimeout(()=>{
    weaveState.demo=false;weaveState.round=1;weaveState.step=0;
    $('weaveActions').querySelectorAll('button').forEach(b=>b.disabled=false);
    $('demoSkip').hidden=true;
    $('demoHint').textContent='';
    $('weaveProgress').innerHTML='第 2 / 3 轮<br><small>该你了：稳线 → 穿梭 → 收紧</small>';
    renderWeaving();
   },700);
  }
 },1100);
}
function skipDemo(){
 if(!weaveState.demo)return;
 if(demoTimer){clearInterval(demoTimer);demoTimer=null}
 weaveState.demo=false;weaveState.round=1;weaveState.step=0;
 $('weaveActions').querySelectorAll('button').forEach(b=>b.disabled=false);
 $('demoSkip').hidden=true;$('demoHint').textContent='';
 renderWeaving();
}
function markDemoButton(action){
 const names={steady:'稳线',shuttle:'穿梭',tighten:'收紧'};
 $('weaveProgress').innerHTML='第 1 / 3 轮 · 示范<br><small>阿木提：'+names[action]+'——</small>';
}
function drawShuttle(step){
 const canvas=$('weaveCanvas'),ctx=canvas.getContext('2d');
 renderWeaving();
 const y=[120,185,250][step]||120;
 const t=step%2===0?1:-1;
 ctx.fillStyle='#e8c56a';
 ctx.beginPath();
 ctx.moveTo(360+t*180,y);ctx.lineTo(360+t*220,y-8);ctx.lineTo(360+t*220,y+8);ctx.closePath();ctx.fill();
}
function renderWeaving(){
 const names=['稳线','穿梭','收紧'];
 // 已织成的轮次直接按方案渲染绸面；当前轮画经线+半透纬线
 const canvas=$('weaveCanvas'),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
 const doneRows=weaveState.demo?0:weaveState.round;
 const rowH=H/3;
 // 未织部分：经线
 ctx.clearRect(0,0,W,H);
 ctx.fillStyle='#d5ad79';ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#704630';ctx.lineWidth=4;
 for(let x=90;x<650;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
 // 已织部分：从上往下按进度铺玩家的纹样
 if(doneRows>0){
  const silk=patternAssets.silk||(patternAssets.silk=document.createElement('canvas'));
  silk.width=480;silk.height=320;
  renderSilk(silk,regionSilkOpts());
  ctx.drawImage(silk,0,0,480,320,78,0,584,rowH*doneRows);
 }
 if(weaveState.step>=1&&!weaveState.demo){
  const y=rowH*doneRows+rowH*.5;
  ctx.fillStyle=activeVat==='main'?'#b95c55':activeVat==='halo'?'#dec46c':'#648ca8';
  ctx.globalAlpha=weaveState.step>=2?.92:.45;ctx.fillRect(78,y-9,584,18);ctx.globalAlpha=1;
 }
 $('weaveProgress').innerHTML=weaveState.demo?'第 1 / 3 轮 · 示范<br><small>阿木提先做一遍</small>':
  '第 '+Math.min(weaveState.round+1,3)+' / 3 轮<br><small>'+(weaveState.step?'完成 '+weaveState.step+' / 3：'+names[weaveState.step-1]:'等待动作')+'</small>';
}
function weaveStep(action){
 if(weaveState.demo){$('demoHint').textContent='看阿木提先做一遍——或者点「跳过示范」。';return}
 const expected=['steady','shuttle','tighten'][weaveState.step];
 if(action!==expected){
  const btn=$('weaveActions').querySelector('[data-weave="'+action+'"]');
  btn&&btn.classList.add('wrong');setTimeout(()=>btn&&btn.classList.remove('wrong'),350);
  $('weaveProgress').innerHTML='第 '+Math.min(weaveState.round+1,3)+' / 3 轮<br><small>'+(action==='steady'?'先稳住经线再动手。':action==='shuttle'?'这一步要先穿梭，别急着收紧。':'还没穿梭，不能收紧。')+'</small>';
  return}
 weaveState.step++;
 if(weaveState.step===3){
  weaveState.round++;weaveState.step=0;
  if(weaveState.round===3){state.woven=true;closeWorkshop();openCompare();return}
 }
 renderWeaving();
}
// 玩家在染谱预览中决定的真实区域配色；织造/对比全程读这一份
function regionSilkOpts(){
 const p=state.patternPlan;
 if(p&&p.regionColors)return {regionColors:p.regionColors,tplId:p.blueprint};
 return {};
}
function openCompare(){
 if(state.silkCollected)return;
 state.busy=true;keys.clear();
 if(!state.patternPlan)state.patternPlan=defaultPlan(blueprintById('p01'));
 const ov=$('compareOverlay');
 const mineOpts=regionSilkOpts();
 const bp=blueprintById(state.patternPlan.blueprint),pal=bp.palette;
 // 蓝本与玩家成绸共用挂绸展示，蓝本显式使用其原始色板。
 const tpl=regionTemplate(state.patternPlan.blueprint);
 const basePalette={0:pal.base,1:pal.main,2:darken(pal.main,.35),3:lighten(pal.main,.2),
  4:pal.main,5:pal.main,6:pal.main,7:pal.main,8:pal.turquoise,9:pal.turquoise,10:pal.turquoise,
  11:darken(pal.turquoise,.3),12:pal.turquoise,13:pal.turquoise,14:pal.turquoise,15:pal.turquoise,16:pal.main,17:pal.main};
 const originColors=Object.fromEntries(tpl.regions.map(r=>[r.id,basePalette[r.legacyId??r.id]||pal.base]));
 const renderOrigin=()=>renderHanging($('silkOrigin'),originColors,tpl.id);
 const renderMine=()=>renderHanging($('silkMine'),mineOpts.regionColors||originColors,tpl.id);
 const paint=()=>{renderMine();renderOrigin();};
 if(regionAssetCache[tpl.id]?.ready)paint();
 else loadRegionAssets(tpl.id).then(()=>{if(!ov.hidden)paint();})
  .catch(()=>showToast('成绸素材加载失败，请返回目录后重试。'));
 const savedPlan=state.patternPlan;
 const extra=savedPlan.extraTie;
 const changed=[];
 if(JSON.stringify(savedPlan.warp)!==JSON.stringify(blueprintById(savedPlan.blueprint).warp))changed.push('留白');
 if(savedPlan.regionColors&&Object.keys(savedPlan.regionColors).length)changed.push('配色');
 if(extra)changed.push('私章结');
 $('compareNote').textContent=changed.length?'你改了：'+changed.join('、')+' —— 像，是规矩；不一样，是你的手。':'和蓝本一丝不差，也是本事。下一块，试着让它是你的。';
 ov.hidden=false;
 LevelOneProgress.save();
}
function workThumbnail(tplId,colors){
 try{
  const big=document.createElement('canvas');
  renderHanging(big,colors,tplId);
  const thumb=document.createElement('canvas');thumb.width=240;thumb.height=330;
  const tx=thumb.getContext('2d');tx.fillStyle='#f3e6c8';tx.fillRect(0,0,240,330);
  tx.drawImage(big,0,0,640,880,0,0,240,330);
  return thumb.toDataURL('image/jpeg',0.82);
 }catch(e){return '';}
}
function collectSilk(){
 if(!state.woven||state.silkCollected)return;
 const p=state.patternPlan,bp=p?p.blueprint:'p01';
 const tplId=bp;
 const entry={blueprint:bp,warp:p.warp?p.warp.slice():[],
  colors:Object.assign({},vatColors),depth:{base:vatState.base.depth,main:vatState.main.depth,halo:vatState.halo.depth},
  extraTie:p.extraTie};
 if(p.regionColors){
  entry.regionColors=Object.assign({},p.regionColors);
  entry.regionTouched=Object.assign({},p.regionTouched||{});
  entry.workId='w_'+tplId+'_'+Date.now();
  entry.templateId=tplId;
  entry.workName=p.workName||(regionTemplate(tplId).defaultName);
  entry.dataVersion=REGION_DATA_VERSION;
  entry.thumbnail=workThumbnail(tplId,p.regionColors);
  saveWork(entry);
  clearDraft();
 }
 state.collection.push(entry);
 state.silkCollected=true;
 LevelOneProgress.save();
 $('compareOverlay').hidden=true;
 showToast('「我的纹样册」+1 · '+(entry.workName||'杏花卷草'),'gold');
 showDialogue(AMUTI_DYE_DONE,render);
}
