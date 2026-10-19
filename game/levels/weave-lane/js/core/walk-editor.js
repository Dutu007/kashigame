// 可走范围编辑器：坐标沿用场景的 1672 × 941 世界坐标。
(() => {
 'use strict';
 const storageKey='weave-lane.walk-geometry.v1';
 const clone=value=>JSON.parse(JSON.stringify(value));
 const original=scenes.map(scene=>clone({walk:scene.walk,obstacles:scene.obstacles||[]}));
 const areas=walk=>Array.isArray(walk?.[0]?.[0])?walk:[walk];
 const validPolygon=poly=>Array.isArray(poly)&&poly.length>=3&&poly.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=W&&p[1]>=0&&p[1]<=H);
 const validGeometry=value=>value&&Array.isArray(value.walk)&&areas(value.walk).every(validPolygon)&&Array.isArray(value.obstacles)&&value.obstacles.every(validPolygon);
 let storageError=false;
 try{
  const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');
  scenes.forEach((scene,index)=>{if(validGeometry(saved[index]))Object.assign(scene,clone(saved[index]));});
 }catch{storageError=true;}
 const board=$('board'),ns='http://www.w3.org/2000/svg';
 const toggle=document.createElement('button');
 toggle.id='walkEditorToggle';toggle.type='button';toggle.textContent='可走范围';toggle.setAttribute('aria-expanded','false');
 const panel=document.createElement('section');panel.id='walkEditorPanel';panel.hidden=true;
 panel.setAttribute('aria-label','可走范围编辑器');
 panel.innerHTML='<p><strong>可走范围编辑</strong> · 绿线可走，红线障碍<br>拖动边线移动两端，拖动圆点调整顶点；Esc 退出。</p><div class="walk-editor-actions"><select aria-label="选择场景"></select><button type="button" data-action="undo">撤销</button><button type="button" data-action="reset">恢复本场景</button><button type="button" data-action="export">导出坐标</button></div><output id="walkEditorStatus" aria-live="polite"></output>';
 const select=panel.querySelector('select');
 scenes.forEach((scene,index)=>{const option=document.createElement('option');option.value=index;option.textContent=scene.title;select.append(option);});
 const svg=document.createElementNS(ns,'svg');svg.id='walkEditorOverlay';svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.hidden=true;svg.style.display='none';
 svg.setAttribute('aria-label','可拖动的行走边界');
 board.append(svg,toggle,panel);
 let active=false,drag=null;
 const history=scenes.map(()=>[]);
 const status=message=>{$('walkEditorStatus').textContent=message;};
 const geometry=()=>clone({walk:scenes[state.scene].walk,obstacles:scenes[state.scene].obstacles||[]});
 function save(){
  try{localStorage.setItem(storageKey,JSON.stringify(scenes.map(scene=>({walk:scene.walk,obstacles:scene.obstacles||[]}))));status('已保存到当前浏览器；行走范围已实时更新。');}
  catch{status('行走范围已更新，但浏览器保存失败，请导出坐标。');}
 }
 function remember(){history[state.scene].push(geometry());if(history[state.scene].length>50)history[state.scene].shift();}
 function element(tag,attributes){const node=document.createElementNS(ns,tag);Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,value));return node;}
 function draw(){
  svg.replaceChildren();select.value=state.scene;
  panel.querySelector('[data-action="undo"]').disabled=!history[state.scene].length;
  if(!active)return;
  const scene=scenes[state.scene];
  [['walk',areas(scene.walk)],['obstacles',scene.obstacles||[]]].forEach(([kind,polys])=>{
   polys.forEach((poly,index)=>{
    svg.append(element('polygon',{points:poly.map(p=>p.join(',')).join(' '),class:kind==='walk'?'walk-area':'blocked-area'}));
    poly.forEach((p,vertex)=>{
     const next=poly[(vertex+1)%poly.length];
     svg.append(element('line',{x1:p[0],y1:p[1],x2:next[0],y2:next[1],class:'walk-edge','data-kind':kind,'data-poly':index,'data-vertex':vertex,'data-mode':'edge'}));
    });
    poly.forEach((p,vertex)=>svg.append(element('circle',{cx:p[0],cy:p[1],r:6,class:'walk-vertex','data-kind':kind,'data-poly':index,'data-vertex':vertex,'data-mode':'vertex'})));
   });
  });
 }
 function point(event){const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());return [p.x,p.y];}
 function settle(){
  const fixed=fixStand([state.x,state.y]);[state.x,state.y]=fixed;render();
 }
 function finish(cancel=false){
  if(!drag)return;
  const previous=drag;
  if(cancel){Object.assign(scenes[previous.scene],previous.before);history[previous.scene].pop();}
  drag=null;
  if(svg.hasPointerCapture(previous.pointer))svg.releasePointerCapture(previous.pointer);
  if(!cancel)save();
  settle();draw();
 }
 function setActive(value){
  finish();active=value;keys.clear();svg.hidden=!value;svg.style.display=value?'block':'none';panel.hidden=!value;
  toggle.textContent=value?'退出范围编辑':'可走范围';toggle.setAttribute('aria-expanded',String(value));
  if(value)status(storageError?'浏览器存储不可用；调整后可导出坐标。':'选择场景后拖动边线或圆点，调整会自动保存。');
  draw();
 }
 toggle.onclick=()=>setActive(!active);
 svg.addEventListener('pointerdown',event=>{
  if(!active||drag||event.button!==0||!event.target.dataset.mode)return;
  event.preventDefault();
  const data=event.target.dataset,scene=scenes[state.scene];
  const poly=(data.kind==='walk'?areas(scene.walk):scene.obstacles)[Number(data.poly)];
  remember();drag={scene:state.scene,pointer:event.pointerId,poly,vertex:Number(data.vertex),mode:data.mode,start:point(event),points:clone(poly),before:geometry()};
  svg.setPointerCapture(event.pointerId);
 });
 svg.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.pointer)return;
  const p=point(event),indices=[drag.vertex];
  if(drag.mode==='edge')indices.push((drag.vertex+1)%drag.poly.length);
  const selected=indices.map(i=>drag.points[i]);
  // 限制整条边的位移，保持两端的相对位置。
  const dx=Math.round(Math.max(-Math.min(...selected.map(q=>q[0])),Math.min(W-Math.max(...selected.map(q=>q[0])),p[0]-drag.start[0])));
  const dy=Math.round(Math.max(-Math.min(...selected.map(q=>q[1])),Math.min(H-Math.max(...selected.map(q=>q[1])),p[1]-drag.start[1])));
  indices.forEach(i=>{drag.poly[i]=[drag.points[i][0]+dx,drag.points[i][1]+dy];});
  draw();status('正在调整：松开鼠标自动保存。');
 });
 svg.addEventListener('pointerup',event=>{if(drag?.pointer===event.pointerId)finish();});
 svg.addEventListener('pointercancel',()=>finish(true));
 svg.addEventListener('lostpointercapture',()=>finish());
 window.addEventListener('blur',()=>finish());
 window.addEventListener('keydown',event=>{if(active&&event.key==='Escape'){event.preventDefault();setActive(false);}},true);
 select.onchange=()=>{finish();loadScene(Number(select.value));status('已切换场景，可直接调整边界。');};
 panel.addEventListener('click',event=>{
  const action=event.target.dataset.action;if(!action)return;
  finish();
  if(action==='undo'){
   const previous=history[state.scene].pop();if(previous){Object.assign(scenes[state.scene],previous);save();settle();draw();}
  }else if(action==='reset'){
   remember();Object.assign(scenes[state.scene],clone(original[state.scene]));save();settle();draw();
  }else if(action==='export'){
   const blob=new Blob([JSON.stringify(scenes.map((scene,index)=>({scene:index,title:scene.title,walk:scene.walk,obstacles:scene.obstacles||[]})),null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='weave-lane-walk-geometry.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   status('已导出全部场景的可走范围和障碍坐标。');
  }
 });
 window.addEventListener('weave-scene-change',()=>{finish(true);draw();});
 window.WalkEditor={get active(){return active;},setActive};
})();
