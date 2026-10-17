// 三缸染线：先配缸（三缸颜色自选，即玩家"自己选颜色"），再浸染。
// 区间内早取=色浅晕小，晚取=色深晕大；越界失手只退回本段。浸染中切缸走确认弹层。
const COLOR_NAMES={'#b8433a':'正红','#e2b54b':'明黄','#3f9ea0':'湖蓝','#2e5f8f':'宝蓝','#c76a94':'玫红','#d97b3f':'橙','#3a3632':'玄黑','#f3e6c8':'米白'};
let mixLocked=false,paletteRole=null;
function setupDye(){
 $('workshopTitle').textContent='染回织梦';
 $('workshopKicker').textContent='染坊庭院 · 三口染缸';
 if(!vatColors)vatColors=Object.assign({},blueprintById((state.patternPlan||defaultPlan(blueprintById('p01'))).blueprint).palette);
 mixLocked=VATS.some(v=>vatState[v.key].done||vatState[v.key].fill>0);
 activeVat=(VATS.find(v=>!vatState[v.key].done)||VATS[0]).key;
 renderDye();
}
function renderDye(){
 $('mixView').hidden=mixLocked;
 $('dipView').hidden=!mixLocked;
 if(!mixLocked){
  $('vatMix').innerHTML=VATS.map(v=>
   '<div class="mix-row"><span class="mix-swatch" data-role="'+v.key+'" style="background:'+vatColors[v.key]+'" title="换颜色"></span>'+
   '<div class="mix-copy"><b>'+v.title+'</b><small>'+(COLOR_NAMES[vatColors[v.key]]||'自定')+' · 点色样可换</small></div></div>').join('');
  renderPattern($('dyePreview'),'dyed',{colors:{base:vatColors.base,main:vatColors.main,turquoise:vatColors.halo}});
  $('dyeHint').textContent='三口缸各管一层：底色染底子，主纹染主花，晕色染卷草。换色时白坯会马上变色——配好了再开染。';
  return}
 const vat=VATS.find(v=>v.key===activeVat),st=vatState[activeVat];
 $('vatTabs').innerHTML=VATS.map(v=>'<button type="button" data-vat="'+v.key+'" class="'+(activeVat===v.key?'active':'')+'" '+(vatState[v.key].done?'disabled':'')+'>'+(vatState[v.key].done?'✓ ':'')+v.title+'</button>').join('');
 $('dipStatus').textContent=st.done?vat.title+' 已完成':(vat.dips>1?'第 '+(st.stage+1)+' 次浸染 · '+vat.labels[st.stage]+'：'+vat.desc:vat.desc);
 const zone=vat.zones[Math.min(st.stage,vat.zones.length-1)];
 $('dipZone').style.left=(zone[0]*100)+'%';$('dipZone').style.width=((zone[1]-zone[0])*100)+'%';
 $('dipZone').innerHTML='<span>'+vat.labels[Math.min(st.stage,vat.labels.length-1)]+'</span>';
 $('dipTrack').className='dip-track '+activeVat;
 $('dipFill').style.width=(st.fill*100)+'%';
 $('dipStart').disabled=!!st.done||!!dipTimer;
 $('dipStart').textContent=st.done?'已完成':(dipPaused&&st.fill>0?'继续浸':'浸入');
 $('dipStop').disabled=!dipTimer;
 $('applyDye').disabled=!VATS.every(v=>vatState[v.key].done);
 renderPattern($('dyePreview'),'dyed');
 const pool=$('dyePool');
 pool.className='dye-pool pool-'+activeVat;
 pool.classList.toggle('glow',activeVat==='halo'&&st.fill>0&&st.fill<1);
 $('dyePoolHint').textContent=dipTimer?'经线正在吸色…':(st.done?'已染好':'');
 $('dyeHint').textContent='区间内早取色浅、晚取色深——白坯上看得见。过了区间这缸就发闷了，退回重浸。';
}
function showPalette(role){
 paletteRole=role;
 $('paletteTitle').textContent=VATS.find(v=>v.key===role).title+' · 选颜色';
 $('paletteGrid').innerHTML=COLOR_CARD.map(c=>'<button type="button" data-color="'+c+'" style="background:'+c+'" title="'+(COLOR_NAMES[c]||c)+'"></button>').join('');
 $('paletteModal').hidden=false;
}
function pickColor(c){
 if(!paletteRole)return;
 vatColors[paletteRole]=c;
 $('paletteModal').hidden=true;paletteRole=null;
 renderDye();
}
function mixDefault(){
 vatColors=Object.assign({},blueprintById((state.patternPlan||defaultPlan(blueprintById('p01'))).blueprint).palette);
 renderDye();showToast('已还原为蓝本配色。');
}
function mixStart(){
 mixLocked=true;renderDye();
 showToast('开始染线——看着白坯，到想要的深浅就取出。');
}
function selectVatTab(key){
 if(key===activeVat||vatState[key].done)return;
 if(dipTimer){
  const cur=VATS.find(v=>v.key===activeVat);
  showConfirm('线还浸在'+cur.title+'里——现在取出，还是先收手？','取出','收手',
   ()=>{stopDip(false);switchVat(key)},
   ()=>{pauseDip();switchVat(key)});
  return}
 switchVat(key);
}
function switchVat(key){activeVat=key;dipPaused=dipPaused&&vatState[key].fill>0;renderDye()}
function pauseDip(){
 if(!dipTimer)return;
 clearInterval(dipTimer);dipTimer=null;dipPaused=true;
 renderDye();
}
function startDip(){
 const st=vatState[activeVat];
 if(st.done||dipTimer)return;
 dipPaused=false;
 dipTimer=setInterval(()=>{st.fill=Math.min(1,st.fill+.016);renderDye();if(st.fill>=1)stopDip(true)},60);
 renderDye();
}
function stopDip(over){
 if(!dipTimer)return;
 clearInterval(dipTimer);dipTimer=null;
 const vat=VATS.find(v=>v.key===activeVat),st=vatState[activeVat];
 const zone=vat.zones[Math.min(st.stage,vat.zones.length-1)];
 if(st.fill>=zone[0]&&st.fill<=zone[1]){
  st.depth=st.fill;st.stage++;st.fill=0;
  if(st.stage>=vat.dips){st.done=true;showToast(vat.title+' 完成','gold')}
  else showToast(vat.labels[st.stage-1]+'已固定，颜色'+(st.depth<.45?'偏浅':'偏深')+'，继续第 '+st.stage+' 次浸染。');
 }else{
  showToast(st.fill<zone[0]?'取线太早，颜色还没进够——退回这一段，重新浸。':'取线太晚，这缸颜色发闷了——退回这一段，再来。');
  st.fill=0;
 }
 renderDye();
}
function completeDye(){
 if(!VATS.every(v=>vatState[v.key].done))return;
 // 染完色即得完整织布：三缸流程同样在染线收尾后直接送上晾晒架，不再上机织造
 state.dyedWarp=true;
 state.woven=true;
 weaveState.demo=false;weaveState.round=3;weaveState.step=0;
 closeWorkshop();
 showToast('染线完成——获得完整织布','gold');
 openCompare();
}
