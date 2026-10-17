// ============================================================
// 引导系统「一束阳光」：无侧栏时，在去织房 / 染院两段寻路上，
// 让一束暖黄阳光从棚架 / 叶隙斜射打在该进的坊门、该走的穿越点上。
// 只读 state，不改玩法逻辑；对话 / 工作台 / 演出 / 转场期间自动隐藏。
// ============================================================
(function(){
 const NS='http://www.w3.org/2000/svg';
 function el(n,a){const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);return e}

 /* ---- 目标点：坐标与光束参数均在真实场景背景上逐像素标定 ----
    arch=[门中心x,门顶y,门槛y,半宽,形状]；beam=[顶端x偏移,光束高,地面端半宽] */
 const T={
  weaveDoor:{x:960,y:720,kind:'door',arch:[950,418,702,100,'rect'],beam:[-42,329,66]},
  dyeDoor:{x:170,y:692,kind:'door',arch:[172,472,706,58,'round'],beam:[59,336,55]},
  p01out:{x:1420,y:700,kind:'portal',beam:[-64,364,62]},
  p10back:{x:370,y:678,kind:'portal',beam:[49,336,55]},
  p12out:{x:1400,y:628,kind:'portal',beam:[-60,336,58]},
  p21back:{x:112,y:743,kind:'portal',beam:[60,350,53]},
  p32down:{x:850,y:890,kind:'portal',beam:[-42,392,60]},
  p52out:{x:1013,y:900,kind:'portal',beam:[-126,434,64]}
 };

 /* ---- 阶段判定：对齐 state.js 状态机 ---- */
 function guideStage(){
  if(!state.quest)return 0;
  if(!state.patternPlan)return 1;
  if(!state.boundWarp)return 2;
  if(!state.dyedWarp)return 3;
  if(!state.chapterComplete)return 4;
  return 5;
 }

 /* ---- GUIDES[阶段][场景] = 目标 key；无定义即该场景不打光 ----
    ②③：入口亮织房门，逛错场景亮返程口；④：入口巷口→巷道末端→染院门；
    ①对话、⑤回忆、织房内（NPC 指引）、染缸工作台全程无光。 */
 const GUIDES=[
  {},
  {0:'weaveDoor',1:'p10back',2:'p21back',3:'p32down',5:'p52out'},
  {0:'weaveDoor',1:'p10back',2:'p21back',3:'p32down',5:'p52out'},
  {0:'p01out',1:'p12out',2:'dyeDoor',3:'p32down'},
  {},
  {}
 ];

 const DEFS_HTML=
  '<filter id="gSoftGlow" x="-40%" y="-40%" width="180%" height="180%">'+
   '<feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
  '<filter id="gBigGlow" x="-60%" y="-60%" width="220%" height="220%">'+
   '<feGaussianBlur stdDeviation="13" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
  '<radialGradient id="gSunPatch" cx="50%" cy="50%" r="50%">'+
   '<stop offset="0%" stop-color="#fff8d8" stop-opacity="1"/><stop offset="38%" stop-color="#ffedae" stop-opacity=".68"/>'+
   '<stop offset="74%" stop-color="#ffe39c" stop-opacity=".2"/><stop offset="100%" stop-color="#ffdd92" stop-opacity="0"/></radialGradient>'+
  '<radialGradient id="gGroundGrad" cx="50%" cy="52%" r="50%">'+
   '<stop offset="0%" stop-color="#fff3c2" stop-opacity=".72"/><stop offset="40%" stop-color="#ffe9aa" stop-opacity=".3"/>'+
   '<stop offset="74%" stop-color="#ffe094" stop-opacity=".1"/><stop offset="100%" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>'+
  '<linearGradient id="gBeamGrad" x1="0" y1="0" x2="0" y2="1">'+
   '<stop offset="0%" stop-color="#ffefbd" stop-opacity="0"/><stop offset="38%" stop-color="#ffefbd" stop-opacity=".1"/>'+
   '<stop offset="70%" stop-color="#ffe9a6" stop-opacity=".16"/><stop offset="100%" stop-color="#ffe39a" stop-opacity=".32"/></linearGradient>'+
  '<filter id="gBeamBlur" x="-80%" y="-20%" width="260%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>'+
  '<radialGradient id="gDoorGrad" cx="50%" cy="92%" r="75%">'+
   '<stop offset="0" stop-color="#fff0b6" stop-opacity=".5"/><stop offset=".55" stop-color="#ffe7a2" stop-opacity=".16"/>'+
   '<stop offset="1" stop-color="#ffe7a2" stop-opacity=".02"/></radialGradient>';

 let gTarget=null;

 /* 坊门门洞几何（换算到以触发点为原点） */
 function archGeom(t){
  const [ax,top,base,hw,shape]=t.arch,dx=ax-t.x,dyT=top-t.y,dyB=base-t.y;
  const d=shape==='rect'
   ? 'M'+(dx-hw)+' '+dyB+' L'+(dx-hw)+' '+dyT+' L'+(dx+hw)+' '+dyT+' L'+(dx+hw)+' '+dyB
   : 'M'+(dx-hw)+' '+dyB+' L'+(dx-hw)+' '+(dyT+hw)+' A'+hw+' '+hw+' 0 0 0 '+(dx+hw)+' '+(dyT+hw)+' L'+(dx+hw)+' '+dyB;
  return d;
 }

 function starNode(r,shape){
  if(shape==='s'){
   const c=(r*.26).toFixed(2);
   return el('path',{class:'g-star',d:'M0 '+-r+' L'+c+' '+(-c)+' L'+r+' 0 L'+c+' '+c+
    ' L0 '+r+' L'+(-c)+' '+c+' L'+(-r)+' 0 L'+(-c)+' '+(-c)+' Z',fill:'#ffffff',filter:'url(#gBigGlow)'});
  }
  return el('circle',{class:'g-star',cx:0,cy:0,r:(r*.45).toFixed(2),fill:'#fcfcff',filter:'url(#gSoftGlow)'});
 }

 /* 一束阳光标记（正式版固定醒目档） */
 function targetMark(t){
  const g=el('g',{transform:'translate('+t.x+' '+t.y+')'});
  const bm=t.beam,dx=bm[0],bh=bm[1],bw=bm[2]*1.08,tw=bw*.44;

  /* 光束（screen 只提亮）：梯形光带 + 空中星点 */
  const shaft=el('g');shaft.style.mixBlendMode='screen';
  shaft.appendChild(el('path',{class:'g-shaft',
   d:'M'+(-bw)+' 2 L'+(dx-tw)+' '+(-bh)+' L'+(dx+tw)+' '+(-bh)+' L'+bw+' 2 Z',
   fill:'url(#gBeamGrad)',filter:'url(#gBeamBlur)'}));
  const air=[[.13,-.5,1,'s'],[.25,.6,.85,'d'],[.36,-.3,.9,'s'],[.47,.4,.78,'d'],
   [.58,.2,.82,'s'],[.69,-.6,.72,'d'],[.8,.5,.68,'s'],[.9,-.2,.62,'d'],
   [.18,.25,.72,'d'],[.41,-.62,.8,'s'],[.63,.55,.7,'d'],[.85,-.48,.66,'s']];
  air.forEach((a,i)=>{
   const tt=a[0],halfW=bw+(tw-bw)*tt;
   const ax2=+(dx*tt+a[1]*halfW*.8).toFixed(1),ay2=+(-bh*tt).toFixed(1);
   const node=starNode(+(3.8*a[2]).toFixed(2),a[3]),wrap=el('g',{transform:'translate('+ax2+' '+ay2+')'});
   wrap.appendChild(node);
   node.style.animationDuration=(2.5+(i%3)*.32).toFixed(2)+'s';
   node.style.animationDelay=(-i*.29).toFixed(2)+'s';
   shaft.appendChild(wrap);
  });
  g.appendChild(shaft);

  /* 地面亮区：圆润暖黄团 + 叶隙碎光 + 闪烁星星 */
  const ground=el('g');ground.style.mixBlendMode='screen';
  const gx=bw*.98,gy=bw*.23;
  ground.appendChild(el('ellipse',{class:'g-ground',rx:gx*1.06,ry:gy,fill:'url(#gGroundGrad)',filter:'url(#gSoftGlow)'}));
  ground.appendChild(el('ellipse',{class:'g-ground',rx:gx*.5,ry:gy*.62,fill:'url(#gSunPatch)',filter:'url(#gSoftGlow)'}));
  const frags=[[-.2,-.12,.4,.52],[.24,.1,.36,.48],[.06,.3,.38,.44]];
  frags.forEach((f,i)=>{
   const fe2=el('ellipse',{class:'g-frag',cx:+(f[0]*gx).toFixed(1),cy:+(f[1]*gy).toFixed(1),
    rx:+(f[2]*gx).toFixed(1),ry:+(f[3]*gy).toFixed(1),fill:'url(#gSunPatch)',filter:'url(#gSoftGlow)'});
   fe2.style.animationDelay=(-i*.7).toFixed(2)+'s';
   ground.appendChild(fe2);
  });
  const stars=[[-.52,-.18,.92,'d'],[.46,-.36,1.15,'s'],[.1,.08,.95,'s'],
   [-.26,.38,.9,'d'],[.56,.24,.82,'d'],[-.6,.14,1.05,'s'],
   [.26,-.52,.8,'d'],[-.1,-.46,1,'s'],[.02,.56,.82,'d'],[.34,.42,.72,'d'],
   [-.76,-.28,.78,'s'],[.76,-.08,.82,'s'],[-.38,-.56,.72,'d'],
   [.58,-.58,.74,'d'],[-.46,.58,.8,'s'],[.14,-.18,.68,'d']];
  stars.forEach((st,i)=>{
   const r=+(4.2*st[2]).toFixed(2),cx=+(st[0]*gx*.92).toFixed(1),cy=+(st[1]*gy*.8).toFixed(1);
   const node=starNode(r,st[3]),wrap=el('g',{transform:'translate('+cx+' '+cy+')'});
   wrap.appendChild(node);
   node.style.animationDuration=(1.8+(i%4)*.27).toFixed(2)+'s';
   node.style.animationDelay=(-i*.25).toFixed(2)+'s';
   ground.appendChild(wrap);
  });
  g.appendChild(ground);

  /* 坊门：门内暖光，不勾边 */
  if(t.kind==='door')g.appendChild(el('path',{class:'g-door',d:archGeom(t)+' Z',fill:'url(#gDoorGrad)',filter:'url(#gBeamBlur)'}));
  return g;
 }

 /* 自适应刷新：不依赖外部 render 时机（转场结束 busy 复位后游戏不再 render，
    若只挂 render，穿场景后的光会永远不出现）。轮询状态 key，变化才重建 DOM。 */
 let lastKey='';
 function guideTick(){
  if(!gTarget)return;
  const stage=guideStage(),hidden=!!(state.busy||state.dialogueOpen);
  const key=stage+'|'+state.scene+'|'+(hidden?'h':'v');
  if(key===lastKey)return;
  lastKey=key;
  while(gTarget.firstChild)gTarget.removeChild(gTarget.firstChild);
  if(hidden)return;                 // 对话 / 工作台 / 演出 / 转场：隐藏
  const tk=GUIDES[stage][state.scene];
  if(!tk)return;
  gTarget.appendChild(targetMark(T[tk]));
 }

 function initGuide(){
  const board=$('board');if(!board)return;
  const svg=el('svg',{id:'guideLayer',viewBox:'0 0 1672 941',preserveAspectRatio:'none','aria-hidden':'true'});
  svg.innerHTML=DEFS_HTML;
  gTarget=el('g');svg.appendChild(gTarget);
  board.appendChild(svg);
  /* 挂到现有 render 之后：render 时立即同步（响应更快），不改编队逻辑 */
  const prevRender=window.render;
  window.render=function(){prevRender();guideTick()};
  guideTick();
  /* 兜底轮询：覆盖转场 busy 复位后无 render 的时序 */
  setInterval(guideTick,180);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initGuide);
 else initGuide();
})();
