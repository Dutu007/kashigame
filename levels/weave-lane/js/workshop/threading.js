// 辨纹扎线：正方形棋盘上铺淡化的杏花卷草拓样，所有节点都落在纹样真实线条上。
// 教学结构（分组示范）：
//  · 同一轮（一组纹样）的点一次性全部显示，后续轮次的点先隐藏；连完这组，下一组点整体淡入。
//  · 每轮先由电脑“完整走线示范”一遍：金色光点从起点沿正确路线连续前进（回主茎/转向处稍停），
//    走完停留约 1 秒看清形状，随后示范线淡出、保留全部点位、线头回到起点，再交给玩家从头连。
//  · 示范不计入玩家进度；右侧「再看一遍示范」可重播，播完恢复玩家已连的线段。
//  · 玩家已完成轮次的点与线暗青保留，整幅图案随轮次逐渐成形。
// 三级提示（方位→描轮廓→点亮下一点）与连错 3 次「这轮照着走」保留；装饰干扰点始终可见可点。
const THREAD_ROUND_NAMES=['外轮廓走向','中间纹路接入','末端回折位置'];
const THREAD_ROUND_HINTS=[
 '从花顶尖「起」绕主花红色花瓣外沿一整圈，最后还要绕回到出发的花顶尖（起、终是同一个点）。',
 '从底部菱形「起」顺主茎向上，先接出一片托叶、回茎再接另一片（先左先右都对），然后进花心蓝色水滴到「终」。',
 '从左小花顶尖「起」下茎，顺着卷草小钩绕进大涡再回折出来，横过主茎，把右侧双涡和小花走到「终」。'];
// 左栏三张局部拓样在蓝本正方形图中的垂直定位（%），分别对准三轮要走的纹样段
const THREAD_CLUE_POS=[30,60,84];
// 每轮路线按“边的累计数”切成语义小段：cuts[i]=第 i 段结束时累计连边数；names=小段目标（用于进度文案/提示/停顿）
const THREAD_SEGMENTS=[
 // R1 外轮廓（闭合环，16 边）：左瓣上沿→左瓣下沿→右瓣下沿→右瓣上沿回顶
 {cuts:[4,8,12,16],
  names:['沿左瓣上沿绕到最左点','沿左瓣下沿绕到花底','沿右瓣下沿绕到最右点','沿右瓣上沿回到花顶尖']},
 // R2 中间纹路（13 边）：主茎上行→第一片托叶回茎→另一片托叶回茎→进花心水滴
 // 托叶先后（先左/先右）是两条等价合法走法，段名不写死左右，提示跟随玩家实际走法
 {cuts:[4,7,10,13],
  names:['从底部菱形顺主茎向上','接出第一片托叶、回到主茎','接出另一片托叶、回到主茎','进花心的蓝色水滴到终点']},
 // R3 末端回折（26 边）：左小花下茎→左卷草大小涡→回折跨主茎→右双涡（两小段）→右小花收尾
 {cuts:[4,9,13,17,21,26],
  names:['从左小花顶尖顺茎而下','绕进左侧卷草小钩与大涡','回折出来、横过主茎','绕右侧第一个涡','绕右侧第二个涡','顺右小花上收到终点']}
];
const HINT_BUTTON_LABELS=['查看提示','提示① 已给方位，再点描出轮廓','提示② 已描轮廓，再点点亮下一点','收起提示'];
// 示范动画节奏（毫秒）
const THREAD_DEMO={lead:450,edge:95,node:55,turn:240,hold:1000,fade:420};

function threadSeq(round){return threadVariants[round][0]}
// 玩家当前仍匹配的那条合法走法（R2 可能是“先左”或“先右”两条之一），高亮与提示都以它为准，不误判另一种正确走法
function threadLive(round){
 const variants=threadVariants[round];
 if(!threadState.path.length)return variants[0];
 const live=variants.filter(s=>threadState.path.every((n,i)=>s[i]===n));
 return live[0]||variants[0];
}
// 当前小段的全部派生信息：路线、段名、段内进度、线头/下一点在 seq 中的下标
function threadSegInfo(round){
 const seq=threadLive(round);
 const seg=THREAD_SEGMENTS[round];
 const steps=Math.max(0,threadState.path.length-1);          // 已连边数
 let idx=0;while(idx<seg.cuts.length-1&&steps>=seg.cuts[idx])idx++;
 const start=idx?seg.cuts[idx-1]:0;
 const end=seg.cuts[idx];
 return {seq,seg,idx,start,end,steps,
  doneInSeg:Math.max(0,steps-start),totalInSeg:end-start,
  headIndex:Math.max(0,threadState.path.length-1),           // 金色线头（线的当前前端）
  nextIndex:threadState.path.length                          // 下一个该连的点（初始就是起点）
 };
}
// 由线头与下一点坐标，自动生成“下一点在你哪边”的方位词
function threadDirWord(from,to){
 const dx=to[0]-from[0],dy=to[1]-from[1],ax=Math.abs(dx),ay=Math.abs(dy);
 const v=ay<3?'':(dy<0?'上':'下'),h=ax<3?'':(dx<0?'左':'右');
 if(!v&&!h)return '这里';
 if(ay>ax*1.6)return '正'+v+'方';
 if(ax>ay*1.6)return '正'+h+'方';
 return h+v+'方';
}
// 每个节点分别被哪些轮次的路线使用（用于区分：当前轮点 / 已完成锁定点 / 未来轮点 / 装饰干扰点）
let threadNodeUseCache=null;
function threadNodeUse(){
 if(threadNodeUseCache)return threadNodeUseCache;
 const m=new Map();
 for(let r=0;r<threadRounds.length;r++)threadSeq(r).forEach(n=>{
  if(!m.has(n))m.set(n,[]);
  const a=m.get(n);if(!a.includes(r))a.push(r);
 });
 threadNodeUseCache=m;return m;
}
function threadLockedSet(round){
 // 仅锁定“已完成轮次用过、且当前及后续轮次不再经过”的点；跨轮枢纽点后续还要穿过，保持可点。
 const future=new Set();
 for(let r=round;r<threadRounds.length;r++)threadSeq(r).forEach(n=>future.add(n));
 const set=new Set();
 for(let r=0;r<round;r++)threadSeq(r).forEach(n=>{if(!future.has(n))set.add(n)});
 return set;
}

// ---- 电脑完整走线示范（异步动画，可中断/重播）----
// 用 setInterval 步进而非 requestAnimationFrame：页面在后台/被节流时 rAF 会降到约 1fps，
// 定时器仍能按时推进，保证示范在任何情况下都能在设定时长内走完。
let demoIV=null,demoWait=null,demoTO=null,demoAbort=false;
let threadFadedRound=-1;   // 已做过“点位淡入”的轮次（每轮首次渲染时淡入一次）
function demoSleep(ms){return new Promise(res=>{demoWait=res;demoTO=setTimeout(()=>{demoWait=null;res();},ms);});}
function abortThreadDemo(){
 demoAbort=true;
 if(demoIV){clearInterval(demoIV);demoIV=null;}
 if(demoTO){clearTimeout(demoTO);demoTO=null;}
 if(demoWait){const r=demoWait;demoWait=null;r();}
 threadState.demoPlaying=false;
}
function demoXY(seq,edge,t,W,H){
 const P=n=>[threadNodes[n][0]/100*W,threadNodes[n][1]/100*H];
 if(edge>=seq.length-1)return P(seq[seq.length-1]);
 const a=P(seq[edge]),b=P(seq[edge+1]);
 return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
}
// 画示范进行到 (edge 条整边 + 当前边插值 t) 的画面：已完成轮暗青 + 金色示范线 + 移动光点
function paintDemoFrame(round,seq,edge,t,alpha){
 const canvas=$('threadCanvas'),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
 ctx.clearRect(0,0,W,H);
 for(let r=0;r<round;r++)drawSeq(ctx,threadSeq(r),'#3c7a72',5,.8);
 const P=n=>[threadNodes[n][0]/100*W,threadNodes[n][1]/100*H];
 ctx.save();ctx.globalAlpha=alpha;
 ctx.strokeStyle='#efb64b';ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';
 ctx.shadowColor='#ffd873';ctx.shadowBlur=10;
 ctx.beginPath();
 let p=P(seq[0]);ctx.moveTo(p[0],p[1]);
 for(let k=1;k<=edge;k++){p=P(seq[k]);ctx.lineTo(p[0],p[1]);}
 let glow=demoXY(seq,edge,t,W,H);
 if(edge<seq.length-1&&t>0){const a=P(seq[edge]),b=P(seq[edge+1]);ctx.lineTo(glow[0],glow[1]);}
 ctx.stroke();
 const g=ctx.createRadialGradient(glow[0],glow[1],1,glow[0],glow[1],16);
 g.addColorStop(0,'#fff6d6');g.addColorStop(.45,'#f5c745');g.addColorStop(1,'rgba(245,199,69,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(glow[0],glow[1],16,0,Math.PI*2);ctx.fill();
 ctx.shadowBlur=0;ctx.fillStyle='#ffe9a6';ctx.beginPath();ctx.arc(glow[0],glow[1],5.5,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
function demoAnimEdge(round,seq,edge){
 return new Promise(res=>{
  const dur=THREAD_DEMO.edge,t0=performance.now();
  const iv=setInterval(()=>{
   if(demoAbort){clearInterval(iv);return res();}
   let t=Math.min(1,(performance.now()-t0)/dur);t=t*t*(3-2*t);
   paintDemoFrame(round,seq,edge,t,1);
   if(t>=1){clearInterval(iv);res();}
  },25);
  demoIV=iv;
 });
}
function demoFadeOut(round,seq){
 return new Promise(res=>{
  const t0=performance.now();
  const iv=setInterval(()=>{
   if(demoAbort){clearInterval(iv);return res();}
   const a=1-Math.min(1,(performance.now()-t0)/THREAD_DEMO.fade);
   paintDemoFrame(round,seq,seq.length-1,1,a);
   if(a<=0){clearInterval(iv);res();}
  },25);
  demoIV=iv;
 });
}
// 完整走线示范。isReplay=false：每轮首次自动示范，播完线头回起点、玩家从头连；
// isReplay=true：「再看一遍」，播完恢复玩家原有 path。
async function runRoundDemo(round,isReplay){
 if(threadState.demoPlaying||round>=threadRounds.length)return;
 const resume=isReplay?threadState.path.slice():null;
 demoAbort=false;
 threadState.demoPlaying=true;
 threadState.hintLevel=0;
 renderThreading();
 $('threadHelp').textContent=isReplay
  ?'再看一遍这组纹样的走线，看完你已经连好的线段都会保留。'
  :'先看丝线怎样走，再试着接出这段纹样。';
 const seq=threadLive(round);
 paintDemoFrame(round,seq,0,0,1);
 await demoSleep(THREAD_DEMO.lead);if(demoAbort)return;
 const cuts=THREAD_SEGMENTS[round].cuts;
 for(let edge=0;edge<seq.length-1;edge++){
  await demoAnimEdge(round,seq,edge);if(demoAbort)return;
  const arrived=edge+1;
  if(arrived<seq.length-1&&cuts.includes(arrived))await demoSleep(THREAD_DEMO.turn);  // 回主茎/转向处稍停
  else await demoSleep(THREAD_DEMO.node);
  if(demoAbort)return;
 }
 paintDemoFrame(round,seq,seq.length-1,1,1);   // 完整图案停留
 await demoSleep(THREAD_DEMO.hold);if(demoAbort)return;
 await demoFadeOut(round,seq);if(demoAbort)return;
 threadState.demoPlaying=false;
 threadState.demoRound=round;
 if(isReplay&&resume){
  threadState.path=resume;
  $('threadHelp').textContent='示范结束——从金色线头按住往前拖即可，你之前连好的线段都保留着。';
 }else{
  threadState.path=[];
  $('threadHelp').textContent='轮到你了——按住金色「起」点不松手，顺着刚才的走线拖过一个个点，直到「终」点（单击节点也能逐点连）。';
 }
 renderThreading();
}
// 每轮进入时，若该轮还没自动示范过且玩家尚无进度，则自动完整示范一遍
function maybeAutoDemo(){
 const r=threadState.round;
 if(r>=threadRounds.length)return;
 if(threadState.demoRound===r)return;
 if(threadState.path.length>0){threadState.demoRound=r;return;}
 runRoundDemo(r,false);
}

function setupThreading(){
 $('workshopTitle').textContent='辨纹扎线';
 $('workshopKicker').textContent='老织坊 · 纹样工作台';
 abortThreadDemo(); demoAbort=false; threadState.demoPlaying=false;
 workshopCloseHook=abortThreadDemo;
 threadFadedRound=-1;threadNodeUseCache=null;
 if(threadState.round>=3){showPuzzleView();return}
 $('threadingView').hidden=false;
 const bp=blueprintById(state.patternPlan?state.patternPlan.blueprint:'p01');
 // 左栏：三张真实拓样（蓝本局部放大）+ 当前轮高亮
 const board=$('threadBoard');
 board.style.setProperty('--trace',"url('"+new URL(bp.big,document.baseURI).href+"')");
 $('cluePane').innerHTML='<h3>左侧 · 线索拓样</h3><p>'+bp.num+' '+bp.name+' —— '+bp.meaning+'</p>'+
  THREAD_ROUND_NAMES.map((nm,i)=>'<div class="clue-card clue-thumb'+(i===threadState.round?' current-clue':'')+
   '" style="background-image:url(\''+bp.big+'\');background-position:50% '+THREAD_CLUE_POS[i]+'%"><small>'+(i+1)+' '+nm+'</small></div>').join('')+
  '<div class="pattern-library">'+BLUEPRINTS.map(b=>'<span'+(b.id===bp.id?' style="border-color:#a0522d;font-weight:700"':'')+'>'+b.num+(b.id===bp.id?' 当前':' 后续')+'</span>').join('')+'</div>';
 // 所有节点都创建为按钮（当前轮/干扰点可点，未来轮点由样式隐藏并禁用）；位置即纹样线条上的百分比
 board.querySelectorAll('.thread-node').forEach(n=>n.remove());
 threadNodes.forEach((pos,i)=>{const b=document.createElement('button');
  b.type='button';b.className='thread-node';b.dataset.node=i;b.setAttribute('aria-label','扎线点 '+(i+1));
  b.style.left=pos[0]+'%';b.style.top=pos[1]+'%';
  b.onclick=()=>selectThreadNode(i);board.appendChild(b)});
 bindThreadDrag();
 const hb=$('hintBtn');if(hb)hb.onclick=cycleHint;
 const rb=$('replayBtn');if(rb)rb.onclick=()=>{if(!threadState.demoPlaying&&threadState.round<3)runRoundDemo(threadState.round,true)};
 $('guideBtn').hidden=true;
 renderThreading();
 maybeAutoDemo();   // 本轮首次进入：自动完整示范
}

function drawSeq(ctx,seq,color,width,alpha){
 ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
 ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
 seq.forEach((node,index)=>{const pos=threadNodes[node],x=pos[0]/100*ctx.canvas.width,y=pos[1]/100*ctx.canvas.height;
  if(!index)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke();ctx.restore();
}
// 画一段虚线路径（提示用），seq 下标从 from 到 to
function drawGuidePath(ctx,seq,from,to,color,width,alpha){
 ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash([9,8]);
 ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
 for(let k=from;k<=to;k++){const pos=threadNodes[seq[k]],x=pos[0]/100*ctx.canvas.width,y=pos[1]/100*ctx.canvas.height;
  if(k===from)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
 ctx.stroke();ctx.restore();
}

function renderThreading(){
 const round=threadState.round,info=threadSegInfo(round),seq=info.seq,seg=info.seg;
 const locked=threadLockedSet(round),use=threadNodeUse();
 const startNode=seq[0],endNode=seq[seq.length-1],headNode=seq[info.headIndex],nextNode=seq[info.nextIndex];
 const demoing=threadState.demoPlaying;
 const fadeIn=threadFadedRound!==round;            // 本轮第一次渲染：当前组点位整体淡入
 const inPath=i=>threadState.path.includes(i);
 $('threadBoard').querySelectorAll('.thread-node').forEach(b=>{
  const i=Number(b.dataset.node);
  let cls='thread-node',disabled=false;
  if(locked.has(i)){cls+=' locked';disabled=true;}
  else if(seq.includes(i)){
   // 当前这一组（本轮）的点一次性全部显示
   if(inPath(i))cls+=' done';
   if(i===headNode&&!demoing)cls+=' is-head';
   else if(i===endNode&&!inPath(i)&&i!==headNode)cls+=' is-end';
   if(threadState.hintLevel===3&&i===nextNode&&!inPath(i))cls+=' hint-next';
   if(fadeIn)cls+=' node-in';
  }else{
   // 后续轮次纹样的点、以及不属于任何纹样的装饰干扰点，一律隐藏，避免误认成要连的图案
   cls+=' future';disabled=true;
  }
  b.className=cls;b.disabled=disabled;
 });
 threadFadedRound=round;
 const canvas=$('threadCanvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
 if(!demoing){
  // 已完成轮的线暗青保留（纹样逐组成形）；当前轮已连为青色实线
  for(let r=0;r<round;r++)drawSeq(ctx,threadSeq(r),'#3c7a72',5,.8);
  drawSeq(ctx,threadState.path,'#2f8f8c',7,1);
  if(threadState.hintLevel>=2)drawGuidePath(ctx,seq,info.headIndex,info.end,'#e8b94d',5,.7);  // 提示②/③描轮廓
  // 起 / 终文字
  const label=(node,text,color)=>{const pos=threadNodes[node];
   ctx.save();ctx.fillStyle=color;ctx.font='700 17px system-ui';ctx.textAlign='center';
   ctx.fillText(text,pos[0]/100*ctx.canvas.width,pos[1]/100*ctx.canvas.height-16);ctx.restore()};
  label(startNode,endNode===startNode?'起 · 终':'起','#b07d1e');
  if(endNode!==startNode)label(endNode,'终','#1f6b55');
 }
 const meter=$('roundMeter').children;
 for(let i=0;i<meter.length;i++){meter[i].classList.toggle('done',i<round);meter[i].classList.toggle('current',i===round)}
 // 右栏：当前小段目标 + 本段进度（整组点已全显，小段仅作文字/提示引导）
 const totalEdges=seq.length-1;
 $('threadPreview').innerHTML='第 '+(round+1)+' 轮 · '+THREAD_ROUND_NAMES[round]+
  '<br><b style="color:#8a531f">当前目标：'+seg.names[info.idx]+'</b>'+
  '<br>本段进度：'+info.doneInSeg+' / '+info.totalInSeg+
  '<br><small>整轮 '+info.steps+' / '+totalEdges+' 段　'+THREAD_ROUND_HINTS[round]+'</small>';
 renderPattern($('blankPreview'),'blank');
 // 按钮显隐：示范进行中隐藏提示/重播/照着走
 $('guideBtn').hidden=threadState.attempts<3||demoing;
 const hb=$('hintBtn');
 if(hb){hb.hidden=demoing||round>=3;hb.textContent=HINT_BUTTON_LABELS[threadState.hintLevel];}
 const rb=$('replayBtn');
 if(rb)rb.hidden=demoing||round>=3;
 const ub=$('threadUndo');if(ub)ub.disabled=demoing||threadState.path.length===0;
}

// ---- 按住拖过节点自动连线（鼠标/触摸统一 pointer；单击节点仍可逐点连）----
let threadDragActive=false,threadLastX=0,threadLastY=0;
// 闭合环（起·终同点）的最后一步要回到起点，该点虽已在 path 中仍允许再连
function threadAllowRepeat(index){
 const round=threadState.round;if(round>=threadRounds.length)return false;
 const seq=threadLive(round);
 return index===seq[0]&&seq[seq.length-1]===seq[0]&&threadState.path.length===seq.length-1;
}
// 取指针线段 (x0,y0)→(x1,y1) 热区（节点半径+15px 容差，快速滑过也不漏）经过的可连节点，按拖动方向排序
function threadPointerNodes(x0,y0,x1,y1){
 const board=$('threadBoard');const dx=x1-x0,dy=y1-y0,L2=dx*dx+dy*dy;
 const hits=[];
 board.querySelectorAll('.thread-node').forEach(b=>{
  if(b.disabled||b.classList.contains('future')||b.classList.contains('locked'))return;
  const nodeIndex=Number(b.dataset.node);
  if(b.classList.contains('done')&&!threadAllowRepeat(nodeIndex))return;
  const r=b.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let t=0;if(L2>0){t=((cx-x0)*dx+(cy-y0)*dy)/L2;t=Math.max(0,Math.min(1,t));}
  const px=x0+t*dx,py=y0+t*dy,d=Math.hypot(cx-px,cy-py);
  if(d<=r.width*0.5+15)hits.push({i:nodeIndex,proj:(cx-x0)*dx+(cy-y0)*dy});
 });
 return hits.sort((a,b)=>a.proj-b.proj).map(h=>h.i);
}
// isTap=按下瞬间命中节点：错误点保留报错反馈；拖拽途中滑过错误点则静默忽略、不计数
function threadDragTry(index,isTap){
 if(threadState.path.includes(index)&&!threadAllowRepeat(index))return;
 if(isTap){selectThreadNode(index);return;}
 const round=threadState.round;
 const trial=[...threadState.path,index];
 if(threadVariants[round].some(s=>trial.every((n,k)=>s[k]===n)))selectThreadNode(index);
}
function bindThreadDrag(){
 const board=$('threadBoard');
 board.style.touchAction='none';
 board.onpointerdown=e=>{
  if(threadState.demoPlaying)return;
  threadDragActive=true;threadLastX=e.clientX;threadLastY=e.clientY;
  try{board.setPointerCapture(e.pointerId)}catch(_){}
  threadPointerNodes(e.clientX,e.clientY,e.clientX,e.clientY).forEach(i=>threadDragTry(i,true));
 };
 board.onpointermove=e=>{
  if(!threadDragActive||threadState.demoPlaying)return;
  threadPointerNodes(threadLastX,threadLastY,e.clientX,e.clientY).forEach(i=>threadDragTry(i,false));
  threadLastX=e.clientX;threadLastY=e.clientY;
 };
 board.onpointerup=board.onpointercancel=()=>{threadDragActive=false};
}
// 玩家点击入口（示范播放期间忽略）
function selectThreadNode(index){
 if(threadState.demoPlaying)return;
 commitNode(index);
}
// 提交一个节点（“照着走”复用同一套判定）
function commitNode(index){
 const round=threadState.round;
 if(threadState.path.includes(index)&&!threadAllowRepeat(index))return;   // 已连过的点重复提交无动作（闭合环回到起点除外）
 if(threadLockedSet(round).has(index)){$('threadHelp').textContent='这一段上一轮已经织过了，顺着当前这一轮的线条往前走。';return}
 const info=threadSegInfo(round);
 const trial=[...threadState.path,index];
 const matches=threadVariants[round].filter(sequence=>trial.every((node,i)=>sequence[i]===node));
 if(!matches.length){
  threadState.attempts++;
  const node=$('threadBoard').querySelector('[data-node="'+index+'"]');
  node&&node.classList.add('wrong');setTimeout(()=>node&&node.classList.remove('wrong'),350);
  const nextCoord=info.seq[info.nextIndex],headCoord=info.seq[info.headIndex];
  const dir=nextCoord?threadDirWord(threadNodes[headCoord],threadNodes[nextCoord]):'';
  $('threadHelp').textContent=threadState.attempts>2
   ?'这一点不在「'+info.seg.names[info.idx]+'」的线条上，丝线会断在纹样外。可点「这轮照着走」让阿木提带你连一段。'
   :'接不上——现在要「'+info.seg.names[info.idx]+'」，下一点在你的'+dir+'。看淡色轮廓从金色线头往哪拐，已连的线不会丢。';
  renderThreading();
  return;
 }
 threadState.path=trial;threadState.attempts=0;threadState.hintLevel=0;
 $('threadHelp').textContent='丝线已固定，金色线头往前移了；继续顺着「'+info.seg.names[info.idx]+'」往前拖。';
 if(matches.some(sequence=>trial.length===sequence.length)){
  threadState.round++;threadState.path=[];threadState.attempts=0;threadState.hintLevel=0;
  if(threadState.round===3){abortThreadDemo();showPuzzleView();return}
  showToast('第 '+(threadState.round+1)+' 组纹样的点位显现了。');
  renderThreading();    // 下一组点整体淡入
  maybeAutoDemo();      // 电脑示范新一组走线
  return;
 }
 renderThreading();
}
// 三级提示：① 方位文字 ② 描出当前小段虚线轮廓 ③ 下一点短暂发光；再点收起
function cycleHint(){
 if(threadState.demoPlaying||threadState.round>=3)return;
 threadState.hintLevel=(threadState.hintLevel+1)%4;
 const info=threadSegInfo(threadState.round);
 if(threadState.hintLevel===1){
  const dir=threadDirWord(threadNodes[info.seq[info.headIndex]],threadNodes[info.seq[info.nextIndex]]);
  $('threadHelp').textContent='提示① 当前目标「'+info.seg.names[info.idx]+'」；下一点在你的'+dir+'。';
 }else if(threadState.hintLevel===2){
  $('threadHelp').textContent='提示② 已用淡金色虚线描出这一小段的走向，顺着它拖过去即可。';
 }else if(threadState.hintLevel===3){
  $('threadHelp').textContent='提示③ 下一个该连的节点正在发光；连对后提示会自动收起，尽量自己观察。';
 }else{
  $('threadHelp').textContent='提示已收起。顺着金色线头前方的淡色轮廓继续往前拖。';
 }
 renderThreading();
}
function guideStep(){ // 照着走：沿玩家当前仍匹配的合法走法，替他连上下一个点
 if(threadState.round>=3||threadState.demoPlaying)return;
 const round=threadState.round;
 const live=threadVariants[round].filter(s=>threadState.path.every((n,i)=>s[i]===n));
 const next=(live[0]||threadSeq(round))[threadState.path.length];
 if(next!==undefined)commitNode(next);
}
function undoThread(){
 if(threadState.demoPlaying)return;
 if(threadState.path.length){threadState.path.pop();threadState.attempts=0;threadState.hintLevel=0;renderThreading();$('threadHelp').textContent='已撤回最近一段，金色线头退回到上一个点。';}
 else showToast('当前轮还没有可撤回的线段');
}
