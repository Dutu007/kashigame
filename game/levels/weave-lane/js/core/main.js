// 进入染院工作台：镜头先平缓推向工作台，染谱界面再柔和出现
function pushInAndOpenDye(){
 const board=$('board');
 const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 state.busy=true;
 if(reduced||!board){openWorkshop('dye');return;}
 const p=scenes[5].points.find(q=>q.id==='dye')||{x:W/2,y:H/2};
 board.style.transformOrigin=(p.x/W*100).toFixed(1)+'% '+(p.y/H*100).toFixed(1)+'%';
 board.style.transition='transform .5s cubic-bezier(.4,0,.2,1),filter .5s ease';
 board.style.transform='scale(1.055)';
 board.style.filter='brightness(1.05)';
 setTimeout(()=>{if(state.busy)openWorkshop('dye');},460);
}
// 交互、主循环与启动
function interact(){
 if(window.WalkEditor?.active)return;
 if(state.dialogueOpen){advanceDialogue();return}
 if(state.busy)return;
 const scene=scenes[state.scene];
 const near=scene.points.map(q=>({q,d:Math.hypot(q.x-state.x,q.y-state.y)}))
  .filter(v=>v.d<=(v.q.range||78)).sort((a,b)=>a.d-b.d)[0]?.q;
 if(!near){setStatus('走近阿木提、织房纺织台、染院染缸或楼上观景处再按 E。');return}
 if(typeof near.to==='number'){transitionToScene(near.to,near.spawn,near.label,near.id);return}
 switch(near.id){
 case 'amuti':
  if(state.scene===5){
   if(state.dyedWarp){showDialogue(AMUTI_DYE_REVISIT,render);break}
   if(!state.boundWarp){showDialogue(AMUTI_DYE_EMPTY,render);break}
   setStatus('阿木提就在染缸旁。走到染缸跟前按 E，先配缸，再下缸。');break
  }
  if(!state.quest){state.quest=true;showDialogue([
   {speaker:'阿木提',text:'机器没坏。可我想接上的那道纹样，总在这里断开。',emotion:'gentle'},
   {speaker:'艾德',text:'这段线条……我在巷口的门框上也见过。',emotion:'confused'},
   {speaker:'阿依苏',text:'如果把散落在巷子里的几段找齐呢？',emotion:'realize'},
   {speaker:'阿木提',text:'门框、旧绸和墙上的残纹，我已经拓下来收进纺织台的纹样册了。你先挑一张合眼缘的，照着拆、照着扎、照着染——像不像，看你的手。',emotion:'guide'}],render);break}
  setStatus('阿木提守在织机旁。先去纺织台，线索拓样在那里。');break;
 case 'workshop':
  if(!state.quest){setStatus('先问问织机旁的阿木提。');break}
  if(!state.patternPlan){openWorkshop('album');break}
  if(!state.boundWarp){openWorkshop('threading');break}
  if(!state.dyedWarp){setStatus('带着拼好的白坯纹样，穿过巷道进染院染线——染完就是完整的布。');break}
  setStatus('布已经染好成形、新绸在晾晒架上。顺着蓝色台阶到楼上看看。');break;
 case 'dye':
  if(!state.boundWarp){showDialogue(AMUTI_DYE_EMPTY,render);break}
  if(state.dyedWarp){setStatus('布已经染好成形——顺着蓝色台阶到楼上观景处看看。');break}
  if(!state.dyeBriefed){state.dyeBriefed=true;showDialogue(AMUTI_DYE_BRIEF,pushInAndOpenDye);break}
  pushInAndOpenDye();break;
 case 'lookout':
  if(state.woven&&!state.silkCollected){openCompare();break}
  if(!state.woven){setStatus('爬上楼后，可以看见旧漆与远处仍灰白的古城。');break}
  if(state.chapterComplete){setStatus('那段回忆已经留在织梦染谱里。');break}
  showDialogue([
   {speaker:'艾德',text:'刚进来的时候，我以为这段蓝色只是墙上的旧漆。',emotion:'confused'},
   {speaker:'阿依苏',text:'从楼上再看，它像是一直在指向这里。',emotion:'realize'}],startMemory);break;
 }
 render();
}
function startMemory(){
 state.busy=true;$('memoryCurtain').classList.add('memory');$('memoryCurtain').onclick=finishMemory;$('functionBar').hidden=false;
 const lines=['旧时染线的人围在缸边。','织坊里的梭子在经线间来回。','孩子举起一小段同样纹样的绸。','阿木提看见了玩家织出的新绸。','还有许多故事，正等着下一双手。'];
 let index=0;function next(){if(!state.busy)return;
  $('memoryCurtain').textContent=lines[index++];
  if(index<=lines.length)state.memoryTimer=setTimeout(next,10000);
  else finishMemory();
 }next();
}
function finishMemory(){
 if(!$('memoryCurtain').classList.contains('memory'))return;
 $('memoryCurtain').onclick=null;clearTimeout(state.memoryTimer);$('memoryCurtain').classList.remove('memory');
 state.chapterComplete=true;state.busy=false;
 LevelOneProgress.save();
 showDialogue([{speaker:'阿木提',text:'谢谢你们帮我找到开头。后面的，我还能教。',emotion:'praise'},
  {speaker:'阿依苏',text:'第一章完成｜织梦巷。获得「织梦染谱」。',emotion:'happy'}],()=>{render();ChapterBridge.complete('weave')});
}
window.addEventListener('keydown',e=>{
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter','e','E','w','a','s','d','W','A','S','D'].includes(e.key))e.preventDefault();
 keys.add(e.key.toLowerCase());
 if((e.key.toLowerCase()==='e'||e.key==='Enter')&&!e.repeat)interact();
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
function frame(now){
 let dt=Math.max(0,Math.min((now-last)/1000,.05));last=now;
 if(typeof Ambient !== 'undefined')Ambient.update(dt);
 if(!state.busy&&!window.WalkEditor?.active){
  const dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
  const dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  const length=Math.hypot(dx,dy)||1;
  // 步行速度严格按行走帧步幅标定（一个步态循环0.672s、左右脚各一步=2步）：
  // walkLeft 单步约78源像素、walkUp/walkDown 单步约18源像素（上下迈腿在画面上投影短）；
  // 场景0 sprite源→屏0.37、世界→屏0.567，垂直不滑步速度≈36px/s（旧值62约为步幅1.8倍→滑步）
  const moveX=dx/length*90*dt,moveY=dy/length*36*dt;
  const moved=moveWithWallSlide(moveX,moveY);
  state.x=moved[0];state.y=moved[1];
  if(dx)state.facing=Math.sign(dx);
  state.motionTime+=dt;
  const moving=!!(dx||dy);
  const dir=dy>0?'Down':dy<0?'Up':(dx<0?'Left':dx>0?'Right':(state.facing<0?'Left':'Right'));
  const pose=moving?'walk':'idle';
  const set=pose==='idle'?'idle':'walk'+dir;
  const nf=framesFor(set).length;
  const isWalk=set.indexOf('walk')===0;
  const period=isWalk?GameCharacters.walkCycleSeconds/nf:0.12;
  const frameIndex=pose==='idle'?0:Math.floor(state.motionTime/period)%nf;
  paintSprite(set,false,frameIndex);
  $('avatar').style.transform='translate(-50%,-100%)';
  scaleActor();$('avatar').style.left=state.x/W*100+'%';$('avatar').style.top=state.y/H*100+'%';
  updateInteractionHint();
  checkPortals();
 }
 requestAnimationFrame(frame);
}
$('dialogueNext').onclick=advanceDialogue;$('workshopClose').onclick=closeWorkshop;$('threadUndo').onclick=undoThread;$('applyDye').onclick=completeDye;
$('vatTabs').onclick=e=>{if(e.target.matches('button[data-vat]'))selectVatTab(e.target.dataset.vat)};
$('dipStart').onclick=startDip;$('dipStop').onclick=()=>stopDip(false);
$('confirmYes').onclick=()=>answerConfirm(true);$('confirmNo').onclick=()=>answerConfirm(false);
$('albumGrid').onclick=e=>{const b=e.target.closest?e.target.closest('[data-album]'):null;if(b){albumSelected=b.dataset.album;renderAlbum()}};
$('albumConfirm').onclick=chooseBlueprint;
$('vatMix').onclick=e=>{if(e.target.dataset&&e.target.dataset.role)showPalette(e.target.dataset.role)};
$('paletteGrid').onclick=e=>{if(e.target.dataset&&e.target.dataset.color)pickColor(e.target.dataset.color)};
$('paletteClose').onclick=()=>{$('paletteModal').hidden=true;paletteRole=null};
$('mixDefault').onclick=mixDefault;$('mixStart').onclick=mixStart;
$('puzzleReshuffle').onclick=reshufflePuzzle;$('guideBtn').onclick=guideStep;$('demoSkip').onclick=skipDemo;$('silkCollect').onclick=collectSilk;
$('dialogueOptions').onclick=e=>{if(e.target.matches('button')){showToast(`已选择：${e.target.textContent}`);closeDialogue();render()}};
$('skipButton').onclick=()=>{if($('memoryCurtain').classList.contains('memory'))finishMemory();else if(state.dialogueOpen){const after=state.afterDialogue;closeDialogue();if(after)after()}};
let pendingCharacter=Campaign.snapshot().character;
function selectChoice(ch){pendingCharacter=ch;$('choice-aide').classList.toggle('selected',ch==='aide');$('choice-aysu').classList.toggle('selected',ch==='aysu')}
$('choice-aide').onclick=()=>selectChoice('aide');$('choice-aysu').onclick=()=>selectChoice('aysu');
function chooseCharacter(ch){
 state.character=GameCharacters.normalize(ch);Campaign.chooseCharacter(state.character);
 $('characterSetup').hidden=true;state.busy=false;updateAvatarArt();
 ['walkDown','walkUp','walkLeft','walkRight'].forEach(framesFor);
 LevelOneProgress.start();render();
 setStatus('沿地砖移动；靠近地点按 E，进入蓝色切场点会自动换图。');showDialogue(AMUTI_INTRO,render);
}
$('startJourney').onclick=()=>chooseCharacter(pendingCharacter);
const resumed=LevelOneProgress.restore();
Ambient.mount($('board'),state.scene);
loadScene(state.scene,resumed?[state.x,state.y]:undefined);
if(resumed){
 state.busy=false;$('characterSetup').hidden=true;
 ['idle','walkDown','walkUp','walkLeft','walkRight'].forEach(framesFor);
 setStatus('已接续上次的织梦巷旅程。');
 if(state.woven&&!state.silkCollected)openCompare();
}else if(Campaign.snapshot().characterChosen){
 chooseCharacter(pendingCharacter);
}else{state.busy=true;selectChoice(pendingCharacter);$('characterSetup').hidden=false;}
requestAnimationFrame(frame);
