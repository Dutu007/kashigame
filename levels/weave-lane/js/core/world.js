// 世界层：碰撞、场景加载、渲染、传送
function inside(p,poly){let inPoly=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){let a=poly[i],b=poly[j];if(((a[1]>p[1])!==(b[1]>p[1]))&&(p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]))inPoly=!inPoly}return inPoly}
function canStand(p,s=scenes[state.scene]){const samples=[[0,0],[ACTOR_RADIUS,0],[-ACTOR_RADIUS,0],[0,ACTOR_RADIUS],[0,-ACTOR_RADIUS]];const areas=Array.isArray(s.walk[0][0])?s.walk:s.walk?[s.walk]:[];return samples.every(([ox,oy])=>areas.some(poly=>inside([p[0]+ox,p[1]+oy],poly))&&!(s.obstacles||[]).some(poly=>inside([p[0]+ox,p[1]+oy],poly)))}
function fixStand(p,s=scenes[state.scene]){if(canStand(p,s))return p;for(let r=8;r<=96;r+=8){for(let a=0;a<8;a++){const q=[p[0]+Math.round(Math.cos(a*Math.PI/4)*r),p[1]+Math.round(Math.sin(a*Math.PI/4)*r)];if(canStand(q,s))return q}}return p}
function moveWithWallSlide(dx,dy,s=scenes[state.scene]){
 const start=[state.x,state.y], target=[start[0]+dx,start[1]+dy];
 if(canStand(target,s))return target;
 let best=start;
 const axisCandidates=[[start[0]+dx,start[1]],[start[0],start[1]+dy]];
 for(const candidate of axisCandidates){if(canStand(candidate,s)&&Math.hypot(candidate[0]-start[0],candidate[1]-start[1])>Math.hypot(best[0]-start[0],best[1]-start[1]))best=candidate}
 const areas=Array.isArray(s.walk[0][0])?s.walk:s.walk?[s.walk]:[];
 for(const poly of areas){
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length], ex=b[0]-a[0],ey=b[1]-a[1],len=Math.hypot(ex,ey)||1;
   const t=[ex/len,ey/len], proj=dx*t[0]+dy*t[1];
   if(Math.abs(proj)<0.01)continue;
   const candidate=[start[0]+t[0]*proj,start[1]+t[1]*proj];
   if(canStand(candidate,s)&&Math.hypot(candidate[0]-start[0],candidate[1]-start[1])>Math.hypot(best[0]-start[0],best[1]-start[1]))best=candidate;
  }
 }
 return best;
}
function setStatus(s){showToast(s)}
function toClip(poly){return `polygon(${poly.map(([x,y])=>`${(x/W*100).toFixed(2)}% ${(y/H*100).toFixed(2)}%`).join(',')})`}
function scaleActor(){const width=Math.round((state.scene>=2?42+state.y/H*44:74)*1.5);$('avatar').style.width=width*1.2+'px';$('avatar').style.height=Math.round(width*1.27)*1.4+'px'}
function updateInteractionHint(){
 const point=scenes[state.scene].points.find(p=>Math.hypot(state.x-p.x,state.y-p.y)<=(p.range||80));
 $('interactionHint').hidden=!point||state.busy;
 if(point)$('interactionHint').textContent='E · '+point.label;
}
function loadScene(n,spawn){
 state.scene=n;[state.x,state.y]=fixStand(spawn||scenes[n].start,scenes[n]);const scene=scenes[n];
 $('background').src=scene.image;$('background').alt=scene.title;
 $('amuti').hidden=n!==0;
 $('amutiDye').hidden=n!==5;
 $('foreground').innerHTML=(scene.foreground||[]).map(poly=>'<img class="foreground-piece" src="'+scene.image+'" alt="" style="clip-path:'+toClip(poly)+'">').join('');
 updateAvatarArt();render();updateInteractionHint();
 if(n===5){
  // 染院：阿木提在缸边等候。未扎束→兜底（可重复）；扎好白坯首次进院→迎接讲解（仅一次）
  setTimeout(()=>{
   if(state.scene!==5||state.busy||state.dialogueOpen)return;
   if(!state.boundWarp){showDialogue(AMUTI_DYE_EMPTY,render);}
   else if(!state.dyedWarp&&!state.dyeMet){state.dyeMet=true;showDialogue(AMUTI_DYE_WELCOME,render);}
  },620);
 }
}
function render(){
 scaleActor();$('avatar').style.left=state.x/W*100+'%';$('avatar').style.top=state.y/H*100+'%';
 updateInteractionHint();
}
function transitionToScene(n,spawn,message,portalId){
 if(state.busy)return;
 state.busy=true;state.portalLock=portalId||null;
 $('wipe').textContent=message||'穿过织梦巷';
 $('wipe').classList.remove('show');void $('wipe').offsetWidth;$('wipe').classList.add('show');
 setTimeout(()=>{loadScene(n,spawn);setTimeout(()=>{state.busy=false;$('wipe').classList.remove('show')},420)},360);
}
function checkPortals(){
 if(state.busy)return;
 const scene=scenes[state.scene],portal=scene.portals.find(p=>Math.hypot(p.x-state.x,p.y-state.y)<(p.range||72));
 if(!portal){state.portalLock=null;return}
 if(state.portalLock===portal.id)return;
 transitionToScene(portal.to,portal.spawn,portal.label,portal.id);
}
