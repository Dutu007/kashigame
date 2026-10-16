// Sprite frame loading and rendering.
// Frames live under assets/characters/<character>/<action>/ and are named
// <character>_<action>_<direction>_<NN>.png (two-digit, zero-padded).
const spriteCache={};let displayedPose='';
function framesFor(pose){
  const key=state.character+':'+pose;
  if(spriteCache[key])return spriteCache[key];
  const def=GameCharacters.pose(state.character,pose);
  const arr=[];
  for(let f=0;f<def.frames;f++){
    const art=new Image();
    art.onload=()=>{if(pose==='idle')paintSprite('idle',false,0)};
    art.src=`${def.base}${String(f).padStart(2,'0')}.png`;
    arr.push(art);
  }
  return spriteCache[key]=arr;
}
function paintSprite(pose,flip=false,frameIndex=0){
  const frames=framesFor(pose);if(!frames||!frames.length)return;
  const art=frames[frameIndex%frames.length];if(!art||!art.complete||!art.naturalWidth)return;
  const key=state.character+':'+pose+'-'+frameIndex+(flip?'-left':'-right');if(displayedPose===key)return;
  const canvas=$('avatar').querySelector('canvas'),ctx=canvas.getContext('2d');
  const iw=art.naturalWidth,ih=art.naturalHeight,scale=Math.min(canvas.width/iw,canvas.height/ih);
  const dw=iw*scale,dh=ih*scale,dx=(canvas.width-dw)/2,dy=(canvas.height-dh)/2;
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();
  if(flip){ctx.translate(canvas.width,0);ctx.scale(-1,1)}
  ctx.drawImage(art,0,0,iw,ih,flip?canvas.width-dx-dw:dx,dy,dw,dh);
  ctx.restore();displayedPose=key;
}
function updateAvatarArt(){displayedPose='';paintSprite('idle');$('avatar').setAttribute('aria-label',characters[state.character].name+'的动作帧')}
