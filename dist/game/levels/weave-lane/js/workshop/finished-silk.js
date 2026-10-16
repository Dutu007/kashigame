// 成品挂绸：真实配色、经纬纹理、垂坠褶皱、织锦边与成束珠帽流苏。
// 使用 Canvas 绘制，离线可用；所有装饰随玩家配色变化。
function finishedPalette(colors,tpl){
 const weights={};
 for(const r of tpl.regions){
  const c=colors[r.id];if(!c)continue;
  weights[c]=(weights[c]||0)+(r.area||1);
 }
 const chosen=Object.keys(weights).sort((a,b)=>weights[b]-weights[a]||a.localeCompare(b));
 // 彩色优先；只有白色或浅灰时也保留它们，不能回退成另一套棕色配色。
 const colorful=chosen.filter(c=>{const rgb=hexRgb(c);return Math.max(...rgb)-Math.min(...rgb)>=18||Math.min(...rgb)<=210;});
 const main=colorful[0]||chosen[0]||CREAM_HEX;
 const brightness=c=>{const rgb=hexRgb(c);return (rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722)/255;};
 // 相近颜色不能让织边菱形消失；明暗变化只作用于装饰，不替换染色区域。
 const accent=chosen.find(c=>Math.abs(brightness(c)-brightness(main))>=.22)
  ||(brightness(main)>.55?darken(main,.48):lighten(main,.55));
 const light=chosen.find(c=>c!==main&&c!==accent)||lighten(main,.7);
 return {main,accent,light,gold:'#c49850'};
}

function finishedCloth(colors,tpl){
 const S=tpl.size,rec=regionAssetCache[tpl.id],flat=_nc(S,S),f=flat.getContext('2d');
 // 编辑时保留黑线便于定位，成品里用实际染色之间的边界表现织纹。
 f.fillStyle=CREAM_HEX;f.fillRect(0,0,S,S);
 if(rec&&rec.ready)for(const rid of tpl.drawOrder){
  if(colors[rid]==null)continue;
  const tint=getRegionTint(rec,rid,colors[rid]);f.drawImage(tint.canvas,tint.bx,tint.by);
 }
 const silk=_nc(S,S),c=silk.getContext('2d');
 // 经线微小错位，产生艾得莱斯的竖向羽状边缘；不修改玩家原始配色。
 for(let x=0;x<S;x+=2){
  const shift=Math.sin(x*1.731)*5+Math.sin(x*.321)*4;
  c.drawImage(flat,x,0,2,S,x,-12+shift,2,S+24);
 }
 return silk;
}

function silkGold(ctx,x,y,r,color){
 const g=ctx.createRadialGradient(x-r*.32,y-r*.4,r*.08,x,y,r);
 g.addColorStop(0,'#fff2bf');g.addColorStop(.25,color||'#dbb46e');
 g.addColorStop(.65,'#a07130');g.addColorStop(1,'#583915');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#7e5428';ctx.lineWidth=.65;ctx.stroke();
}

function silkTassel(ctx,x,y,color,size=1){
 ctx.save();ctx.translate(x,y);ctx.scale(size,size);
 ctx.strokeStyle='#a07135';ctx.lineWidth=1.1;
 ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,6);ctx.stroke();
 silkGold(ctx,0,10,4.8);
 const bead=ctx.createRadialGradient(-1.5,8,1,0,11,4);
 bead.addColorStop(0,lighten(color,.5));bead.addColorStop(.5,color);bead.addColorStop(1,darken(color,.55));
 ctx.fillStyle=bead;ctx.beginPath();ctx.ellipse(0,11,3.5,4,0,0,Math.PI*2);ctx.fill();
 silkGold(ctx,0,17,2.9);
 const body=ctx.createLinearGradient(-11,0,11,0);
 body.addColorStop(0,darken(color,.42));body.addColorStop(.25,color);
 body.addColorStop(.46,lighten(color,.2));body.addColorStop(.7,color);body.addColorStop(1,darken(color,.4));
 ctx.fillStyle=body;
 ctx.beginPath();ctx.moveTo(-3,19);
 ctx.bezierCurveTo(-6,25,-8,43,-12,52);
 ctx.quadraticCurveTo(0,58,12,52);
 ctx.bezierCurveTo(8,43,6,25,3,19);ctx.closePath();ctx.fill();
 // 流苏是成束丝线：细线从同一个束口向外垂坠，长度微错落。
 ctx.lineCap='round';
 for(let i=0;i<43;i++){
  const u=i/42-.5,end=u*23;
  ctx.strokeStyle=i%4===0?lighten(color,.34):i%3===0?darken(color,.35):lighten(color,.06);
  ctx.lineWidth=.45;
  ctx.beginPath();ctx.moveTo(u*5,20);
  ctx.bezierCurveTo(u*9,29,end*.75,43,end,53+Math.cos(i*1.8)*1.3);ctx.stroke();
 }
 ctx.strokeStyle='#d4b272';ctx.lineWidth=1.3;
 ctx.beginPath();ctx.moveTo(-3.4,19);ctx.lineTo(3.4,19);ctx.stroke();
 ctx.restore();
}

function silkDiamond(ctx,x,y,rx,ry,color){
 ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-ry);ctx.lineTo(x+rx,y);
 ctx.lineTo(x,y+ry);ctx.lineTo(x-rx,y);ctx.closePath();ctx.fill();
}

function renderFinishedHanging(target,colors,tplId){
 const tpl=regionTemplate(tplId),silk=finishedCloth(colors,tpl),pal=finishedPalette(colors,tpl);
 target.width=640;target.height=880;
 const c=target.getContext('2d');c.clearRect(0,0,640,880);
 const bg=c.createRadialGradient(240,330,30,320,430,610);
 bg.addColorStop(0,'#fff8e8');bg.addColorStop(.6,'#f3e4c7');bg.addColorStop(1,'#d4b588');
 c.fillStyle=bg;c.fillRect(0,0,640,880);
 // 背景暖光与落地阴影。
 c.save();c.filter='blur(18px)';c.fillStyle='rgba(109,72,35,.13)';
 c.beginPath();c.ellipse(327,847,232,12,-.025,0,Math.PI*2);c.fill();c.restore();
 const top=55,edge=739,widthTop=482,widthBottom=556,cx=320;
 const hemY=u=>edge+38*Math.sin(Math.PI*u);
 const fold=u=>Math.sin(u*Math.PI*13+.8)*.7+Math.sin(u*Math.PI*27)*.22;
 const left=u=>cx-(widthTop+(widthBottom-widthTop)*u)/2;
 const outline=()=>{
  c.beginPath();c.moveTo(cx-widthTop/2,top);
  for(let i=0;i<=80;i++){const u=i/80;c.lineTo(cx-widthTop/2+widthTop*u,top+5*Math.sin(Math.PI*u));}
  c.lineTo(cx+widthBottom/2,edge);
  for(let i=80;i>=0;i--){const u=i/80;c.lineTo(cx-widthBottom/2+widthBottom*u,hemY(u));}
  c.closePath();
 };
 c.save();c.shadowColor='rgba(74,46,20,.23)';c.shadowBlur=15;c.shadowOffsetX=7;c.shadowOffsetY=12;
 outline();c.fillStyle=CREAM_HEX;c.fill();c.restore();
 // 雕花挂杆与铜金端头。
 const rod=c.createLinearGradient(0,30,0,54);
 rod.addColorStop(0,'#503116');rod.addColorStop(.28,'#d4a662');rod.addColorStop(.47,'#8e592c');rod.addColorStop(.75,'#4a2c17');rod.addColorStop(1,'#9c6a33');
 c.fillStyle=rod;c.fillRect(39,34,562,18);
 for(const x of [39,601]){
  silkGold(c,x,43,13);
  c.save();c.translate(x,43);c.scale(.7,1);
  silkGold(c,0,0,20);
  c.strokeStyle='#f6d491';c.lineWidth=.8;
  for(let i=-10;i<=10;i+=5){c.beginPath();c.ellipse(i,0,3,15,0,0,Math.PI*2);c.stroke();}
  c.restore();silkGold(c,x+(x<320?-19:19),43,5);
 }
 c.save();outline();c.clip();
 // 横纵网格映射：纹样随褶皱和弧形布边弯曲，不产生竖向切片空缝。
 const cols=200,rows=38,S=tpl.size;
 for(let ix=0;ix<cols;ix++){
  const u=ix/cols,mid=(ix+.5)/cols;
  const topY=top+5*Math.sin(Math.PI*mid),height=hemY(mid)-topY;
  for(let iy=0;iy<rows;iy++){
   const v=iy/rows,x=left(v)+(widthTop+(widthBottom-widthTop)*v)*u;
   const ww=(widthTop+(widthBottom-widthTop)*v)/cols;
   const sx=Math.max(0,Math.min(S-S/cols,u*S+fold(mid)*7));
   c.drawImage(silk,sx,v*S,S/cols,S/rows,x,topY+v*height,ww+.8,height/rows+.7);
  }
 }
 // 纵向丝光：亮脊窄而软，暗谷宽，顶端褶皱更紧。
 for(let y=top;y<790;y+=12)for(let x=40;x<600;x++){
  const v=(y-top)/740,u=(x-79)/482;
  const sh=fold(u+Math.sin(v*4.2+u*6)*.009*v);
  const shadow=Math.max(0,-sh)*(.17+.06*(1-v));
  c.fillStyle='rgba(39,26,23,'+shadow.toFixed(3)+')';c.fillRect(x,y,1,12);
  c.fillStyle='rgba(255,252,227,'+(Math.pow(Math.max(0,sh),4)*.22).toFixed(3)+')';c.fillRect(x,y,1,12);
 }
 // 经纬丝纹保持细密，避免成品看起来像涂色纸。
 for(let x=45;x<600;x+=1.5){
  c.strokeStyle=x%3<1.5?'rgba(255,255,238,.08)':'rgba(55,35,22,.04)';c.lineWidth=.45;
  c.beginPath();c.moveTo(x,top);c.bezierCurveTo(x-2,240,x+3,530,x,790);c.stroke();
 }
 for(let y=top;y<790;y+=2){c.fillStyle='rgba(58,38,22,.035)';c.fillRect(40,y,560,.55);}
 // 两侧织锦带，配色取自作品。
 for(const side of [-1,1]){
  for(let y=top;y<790;y++){
   const v=(y-top)/(edge-top),w=widthTop+(widthBottom-widthTop)*v;
   const x=cx+side*w/2-(side>0?32:0);
   c.fillStyle=pal.main;c.fillRect(x,y,32,1.1);
   c.fillStyle='#f2dfb6';c.fillRect(x+4,y,1.4,1.1);c.fillRect(x+26,y,1.4,1.1);
   c.fillStyle=pal.gold;c.fillRect(x+1,y,1,1.1);c.fillRect(x+30,y,1,1.1);
  }
  for(let y=89;y<770;y+=37){
   const v=(y-top)/(edge-top),x=cx+side*(widthTop+(widthBottom-widthTop)*v)/2-side*16;
   silkDiamond(c,x,y,9,13,'#f2dfb6');silkDiamond(c,x,y,5,8,pal.accent);silkDiamond(c,x,y,1.6,3,pal.gold);
  }
 }
 c.restore();
 // 下摆织锦：弧线与布边一致，金线与菱形组成整洁边饰。
 const hemPath=(offset)=>{
  c.beginPath();for(let i=0;i<=120;i++){
   const u=i/120,x=cx-widthBottom/2+widthBottom*u,y=hemY(u)+offset;
   if(!i)c.moveTo(x,y);else c.lineTo(x,y);
  }
 };
 c.save();c.lineJoin='round';c.lineCap='butt';
 hemPath(-11);c.strokeStyle=pal.main;c.lineWidth=22;c.stroke();
 for(const off of [-21,-17,-4,0]){hemPath(off);c.strokeStyle=off===-17||off===-4?'#f3e3bd':pal.gold;c.lineWidth=1.5;c.stroke();}
 for(let i=0;i<27;i++){
  const u=(i+.5)/27,x=cx-widthBottom/2+widthBottom*u,y=hemY(u)-11;
  c.save();c.translate(x,y);c.rotate(Math.atan(38*Math.PI*Math.cos(Math.PI*u)/widthBottom));
  silkDiamond(c,0,0,8,5,'#ecd5a8');silkDiamond(c,0,0,4.5,2.8,pal.accent);c.restore();
 }
 c.restore();
 const tasselColors=[pal.main,pal.accent,'#f5e7ca',pal.main,pal.light];
 for(let i=0;i<23;i++){
  const u=(i+.5)/23,x=cx-widthBottom/2+widthBottom*u;
  // 配色顺序左右镜像，珠帽与束口悬在下摆上，丝线不穿过布面。
  const ci=Math.min(i,22-i)%tasselColors.length;
  silkTassel(c,x,hemY(u)+1,tasselColors[ci],1.12);
 }
 // 挂杆两侧小垂饰。
 for(const x of [39,601]){
  c.strokeStyle='#966a35';c.lineWidth=1.2;c.beginPath();c.moveTo(x,61);c.lineTo(x,88);c.stroke();
  silkGold(c,x,76,3);silkTassel(c,x,88,pal.main,1.15);
  silkTassel(c,x+(x<320?7:-7),136,pal.accent,.85);
 }
 return target;
}
