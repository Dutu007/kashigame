// 理经拼纹：刚织好的无色白坯纹样被竖直等切成 N 条竖片，横向打乱顺序。
// 玩家鼠标/触屏按住竖片左右拖动来重新排序（竖片不旋转、不翻转）；
// 排列顺序与原切序完全一致时通关，竖片缝隙收拢，展示完整白坯纹样。
const PUZZLE_STRIPS=8;          // 竖片数量（等宽）
const PUZZLE_GAP=4;             // 竖片之间的细微缝隙（px）
const PUZZLE_MAX_SIDE=540;      // 拼板最大边长（正方形纹样）
const PUZZLE_CANVAS_W=180;      // 每片离屏 canvas 逻辑宽度（高度随片数）
const puzzleState={order:[],solved:false,S:0,stripW:0,step:0,drag:null};

function showPuzzleView(){
 $('threadingView').hidden=true;$('puzzleView').hidden=false;
 if(!state.patternPlan)state.patternPlan=defaultPlan(blueprintById('p01'));
 $('workshopTitle').textContent='把纹样拼回去';
 $('workshopKicker').textContent='老织坊 · 理经拼纹';
 buildPuzzle();
}
// Fisher-Yates 横向打乱，保证不是原序
function shuffledOrder(n){
 const a=Array.from({length:n},(_,i)=>i);
 for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=a[i];a[i]=a[j];a[j]=t}
 if(a.every((v,i)=>v===i)){const t=a[0];a[0]=a[1];a[1]=t}
 return a;
}
function isPuzzleSolved(){return puzzleState.order.length===PUZZLE_STRIPS&&puzzleState.order.every((v,i)=>v===i)}
// 切出第 id 条竖片（从无色纹样原图上等宽竖裁，不缩放变形、不旋转翻转）
function makeStripCanvas(id){
 const cv=document.createElement('canvas');
 cv.width=PUZZLE_CANVAS_W;cv.height=PUZZLE_CANVAS_W*PUZZLE_STRIPS;
 const img=patternAssets.grayImg;
 if(grayReady()){
  const ctx=cv.getContext('2d'),sw=img.naturalWidth/PUZZLE_STRIPS;
  ctx.drawImage(img,id*sw,0,sw,img.naturalHeight,0,0,cv.width,cv.height);
 }
 return cv;
}
function redrawPuzzleStrips(){
 if($('puzzleView').hidden)return;
 renderPattern($('puzzleRef'),'blank');
 const board=$('puzzleBoard');
 if(!board.querySelectorAll)return;
 board.querySelectorAll('.puzzle-strip').forEach(el=>{
  const old=el.querySelector?el.querySelector('canvas'):null;
  if(old)el.removeChild(old);
  el.appendChild(makeStripCanvas(Number(el.dataset.strip)));
 });
}
function relayoutPuzzle(){
 const board=$('puzzleBoard');
 const parentW=board.parentElement&&board.parentElement.clientWidth;
 const reference=getComputedStyle(board).getPropertyValue('--reference-layout').trim()==='1';
 const S=reference?parentW*.536:Math.max(240,Math.min(PUZZLE_MAX_SIDE,(parentW||640)-28));
 puzzleState.S=S;puzzleState.stripW=(S-(PUZZLE_STRIPS-1)*PUZZLE_GAP)/PUZZLE_STRIPS;
 puzzleState.step=puzzleState.stripW+PUZZLE_GAP;
 board.style.width=S+'px';board.style.height=(reference?board.parentElement.clientHeight*.441:S)+'px';
 renderStripPositions();
}
function buildPuzzle(){
 const board=$('puzzleBoard');
 board.innerHTML='';board.classList.remove('solved');
 puzzleState.solved=false;puzzleState.drag=null;
 if(puzzleState.order.length!==PUZZLE_STRIPS)puzzleState.order=shuffledOrder(PUZZLE_STRIPS);
 for(let id=0;id<PUZZLE_STRIPS;id++){
  const strip=document.createElement('div');
  strip.className='puzzle-strip';strip.dataset.strip=String(id);
  strip.appendChild(makeStripCanvas(id));
  strip.addEventListener('pointerdown',onStripPointerDown);
  board.appendChild(strip);
 }
 $('puzzleReshuffle').hidden=false;
 renderPattern($('puzzleRef'),'blank');
 relayoutPuzzle();
 updatePuzzleStatus();
}
if(typeof window!=='undefined')window.addEventListener('resize',()=>{if(!$('puzzleView').hidden)relayoutPuzzle()});
function renderStripPositions(){
 const board=$('puzzleBoard');
 if(!board.querySelectorAll)return;
 const {order,S,stripW,step,solved}=puzzleState;
 const w=solved?S/PUZZLE_STRIPS:stripW;
 board.querySelectorAll('.puzzle-strip').forEach(el=>{
  const id=Number(el.dataset.strip),slot=order.indexOf(id);
  el.style.width=w+'px';
  el.style.transform='translateX('+(solved?slot*(S/PUZZLE_STRIPS):slot*step)+'px)';
 });
}
function updatePuzzleStatus(){
 if(puzzleState.solved){$('puzzleStatus').textContent='纹样完整拼合——白坯织好了。';return}
 const correct=puzzleState.order.filter((v,i)=>v===i).length;
 $('puzzleStatus').textContent='按住竖片左右拖动，调整横向顺序（竖片不会转动或翻面）；当前 '+correct+' / '+PUZZLE_STRIPS+' 条在正确位置。';
}
function reshufflePuzzle(){
 if(puzzleState.solved)return;
 puzzleState.order=shuffledOrder(PUZZLE_STRIPS);
 renderStripPositions();updatePuzzleStatus();
}
// 把 from 槽位的竖片落到 to 槽位（拖拽松手 / 测试注入共用）
function placeStrip(from,to){
 if(puzzleState.solved)return;
 to=Math.max(0,Math.min(PUZZLE_STRIPS-1,to));
 if(from!==to){
  const order=puzzleState.order.slice(),item=order.splice(from,1)[0];
  order.splice(to,0,item);
  puzzleState.order=order;
 }
 renderStripPositions();
 if(isPuzzleSolved())finishPuzzle();else updatePuzzleStatus();
}
// 测试与程序化提交用：直接给定当前横向顺序并判定
function setPuzzleOrder(arr){
 if(puzzleState.solved||!Array.isArray(arr)||arr.length!==PUZZLE_STRIPS)return;
 puzzleState.order=arr.slice();
 renderStripPositions();
 if(isPuzzleSolved())finishPuzzle();else updatePuzzleStatus();
}
function onStripPointerDown(e){
 if(puzzleState.solved)return;
 const strip=e.currentTarget,id=Number(strip.dataset.strip);
 const from=puzzleState.order.indexOf(id);
 if(from<0)return;
 e.preventDefault();
 if(strip.setPointerCapture)try{strip.setPointerCapture(e.pointerId)}catch(_){}
 strip.classList.add('dragging');
 puzzleState.drag={id,from,startX:e.clientX,dx:0,to:from};
 strip.addEventListener('pointermove',onStripPointerMove);
 strip.addEventListener('pointerup',onStripPointerUp);
 strip.addEventListener('pointercancel',onStripPointerUp);
}
function onStripPointerMove(e){
 const d=puzzleState.drag;
 if(!d||d.id!==Number(e.currentTarget.dataset.strip))return;
 const {step,stripW}=puzzleState,n=PUZZLE_STRIPS;
 let dx=e.clientX-d.startX;
 dx=Math.max(-d.from*step,Math.min((n-1-d.from)*step,dx)); // 竖片不拖出拼板
 d.dx=dx;
 const centerX=d.from*step+stripW/2+dx;
 const to=Math.max(0,Math.min(n-1,Math.floor(centerX/step)));
 d.to=to;
 const board=$('puzzleBoard');
 e.currentTarget.style.transform='translateX('+(d.from*step+dx)+'px)';
 board.querySelectorAll('.puzzle-strip').forEach(el=>{
  if(Number(el.dataset.strip)===d.id)return;
  const s=puzzleState.order.indexOf(Number(el.dataset.strip));
  let disp=0;
  if(d.from<to&&s>d.from&&s<=to)disp=-step;
  else if(d.from>to&&s>=to&&s<d.from)disp=step;
  el.style.transform='translateX('+(s*step+disp)+'px)';
 });
}
function onStripPointerUp(e){
 const d=puzzleState.drag;
 if(!d||d.id!==Number(e.currentTarget.dataset.strip))return;
 const strip=e.currentTarget;
 strip.classList.remove('dragging');
 strip.removeEventListener('pointermove',onStripPointerMove);
 strip.removeEventListener('pointerup',onStripPointerUp);
 strip.removeEventListener('pointercancel',onStripPointerUp);
 puzzleState.drag=null;
 placeStrip(d.from,d.to);
}
function finishPuzzle(){
 puzzleState.solved=true;
 state.boundWarp=true;
 const board=$('puzzleBoard');
 board.classList.add('solved');
 $('puzzleReshuffle').hidden=true;
 renderStripPositions(); // 过渡到无缝等宽，缝隙收拢
 $('puzzleStatus').textContent='纹样完整拼合——白坯织好了。';
 setTimeout(freezeBlank,720);
}
function freezeBlank(){ // 白坯纹样定格演出
 const ov=$('freezeOverlay'),cv=$('freezeCanvas');
 renderPattern(cv,'blank');
 ov.classList.add('show');
 setTimeout(()=>{
  ov.classList.remove('show');
  closeWorkshop();
  showToast('获得任务物品 · 白坯纹样','gold');
  showDialogue([
   {speaker:'阿依苏',text:'竖片全接回去了——纹样的骨架完整了，就差颜色。',emotion:'happy'},
   {speaker:'阿木提',text:'白的进，彩的出。去染院，想要什么颜色，跟缸说。',emotion:'guide'}],render);
 },1400);
}
