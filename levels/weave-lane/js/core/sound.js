// 极轻量音效：WebAudio 合成染液声，不依赖音频文件。每次操作只响一声，高频自动限流。
// 静音开关存 localStorage；系统开启"减少动态效果"时缩短为极轻一声。
const SoundFX = (function(){
 let ctx=null, lastPlay=0, settings=loadSettings();
 function ac(){
  if(ctx)return ctx;
  try{
   const AC=window.AudioContext||window.webkitAudioContext;
   if(!AC)return null;
   ctx=new AC();
  }catch(e){ ctx=null; }
  return ctx;
 }
 function reduced(){
  try{ return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch(e){ return false; }
 }
 function unlock(){ const c=ac(); if(c&&c.state==='suspended')c.resume(); }
 function setMuted(m){ settings.soundOn=!m; saveSettings({soundOn:settings.soundOn}); }
 function muted(){ return !settings.soundOn; }
 // 轻柔染液声：低通滤波后的短噪声起伏 + 一点水滴音
 function dye(hex){
  if(muted())return;
  const now=Date.now();
  if(now-lastPlay<110)return; // 高频操作限流
  lastPlay=now;
  const c=ac(); if(!c)return;
  try{
  if(c.state==='suspended')c.resume();
  const t=c.currentTime, fast=reduced(), dur=fast?0.18:0.62;
  const master=c.createGain();
  master.gain.setValueAtTime(0.0001,t);
  master.gain.exponentialRampToValueAtTime(fast?0.05:0.12,t+0.05);
  master.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  master.connect(c.destination);
  // 染液噪声
  const len=Math.floor(c.sampleRate*dur);
  const buf=c.createBuffer(1,len,c.sampleRate);
  const d=buf.getChannelData(0);
  let b1=0,b2=0;
  for(let i=0;i<len;i++){
   const white=Math.random()*2-1;
   b1+=0.045*(white-b1); b2+=0.018*(white-b2);
   d[i]=(b1*2.2+b2*3.4)*0.55;
  }
  const src=c.createBufferSource(); src.buffer=buf;
  const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(820,t);
  lp.frequency.exponentialRampToValueAtTime(360,t+dur);
  src.connect(lp); lp.connect(master); src.start(t); src.stop(t+dur);
  // 轻微水滴
  if(!fast){
   const o=c.createOscillator(), g=c.createGain();
   o.type='sine';
   const base=340+((hex?hex.charCodeAt(1)+hex.charCodeAt(3):0)%6)*18;
   o.frequency.setValueAtTime(base,t+0.08);
   o.frequency.exponentialRampToValueAtTime(base*0.72,t+0.34);
   g.gain.setValueAtTime(0.0001,t+0.08);
   g.gain.exponentialRampToValueAtTime(0.05,t+0.12);
   g.gain.exponentialRampToValueAtTime(0.0001,t+0.36);
   o.connect(g); g.connect(master);
   o.start(t+0.08); o.stop(t+0.4);
  }
  }catch(e){ /* 音频失败不得影响染色操作 */ }
 }
 // 染线演出：缓慢的染缸水声（长、轻），返回可提前停止的句柄
 function dyeWash(){
  if(muted())return {stop(){}};
  const c=ac(); if(!c)return {stop(){}};
  try{
  if(c.state==='suspended')c.resume();
  const t=c.currentTime, dur=2.6;
  const master=c.createGain();
  master.gain.setValueAtTime(0.0001,t);
  master.gain.exponentialRampToValueAtTime(0.08,t+0.4);
  master.gain.setTargetAtTime(0.06,t+1,0.5);
  master.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  master.connect(c.destination);
  const len=Math.floor(c.sampleRate*dur), buf=c.createBuffer(1,len,c.sampleRate), d=buf.getChannelData(0);
  let b1=0;
  for(let i=0;i<len;i++){
   b1+=0.02*(Math.random()*2-1-b1);
   d[i]=b1*3.2+Math.sin(i*0.013)*0.015;
  }
  const src=c.createBufferSource(); src.buffer=buf;
  const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=480;
  src.connect(lp); lp.connect(master); src.start(t); src.stop(t+dur);
  return {stop(){ try{master.gain.cancelScheduledValues(c.currentTime);master.gain.setTargetAtTime(0.0001,c.currentTime,0.05);}catch(e){} }};
  }catch(e){ return {stop(){}}; }
 }
 return {unlock,dye,dyeWash,setMuted,muted,reduced};
})();
document.addEventListener&&document.addEventListener('pointerdown',()=>SoundFX.unlock(),{once:true});
