// 纹样册：选蓝本。12 页，01 可玩，其余待后续章节解锁。
let albumSelected='p01';
function setupAlbum(){
 $('workshopTitle').textContent='纹样册';
 $('workshopKicker').textContent='老织坊 · 阿木提的拓样集';
 albumSelected=state.patternPlan?state.patternPlan.blueprint:'p01';
 renderAlbum();
}
function renderAlbum(){
 const groups={};
 BLUEPRINTS.forEach(bp=>{(groups[bp.group]=groups[bp.group]||[]).push(bp)});
 $('albumGrid').innerHTML=Object.keys(groups).map(g=>
  '<div class="album-group"><h4>'+g+'</h4><div class="album-row">'+groups[g].map(bp=>
   '<button type="button" data-album="'+bp.id+'" class="album-card'+(bp.id===albumSelected?' selected':'')+(bp.locked?' locked':'')+'">'+
   '<img src="'+bp.thumb+'" alt="'+bp.name+'">'+(bp.locked?'<span class="album-lock">后续章节</span>':'')+
   '<small>'+bp.num+' '+bp.name+'</small></button>').join('')+'</div></div>').join('');
 showAlbumDetail(albumSelected);
}
function showAlbumDetail(id){
 const bp=blueprintById(id);
 $('albumPreview').style.backgroundImage='url("'+bp.thumb+'")';
 $('albumName').textContent=bp.num+' '+bp.name;
 $('albumMeaning').textContent=bp.meaning;
 const plan=state.patternPlan&&state.patternPlan.blueprint===bp.id;
 $('albumConfirm').disabled=bp.locked;
 $('albumConfirm').textContent=plan?'重新用这张':(bp.locked?'待解锁':'就用这张');
 if(!bp.locked){
  const cv=$('albumBlank');
  const saved=state.patternPlan;
  state.patternPlan=state.patternPlan&&state.patternPlan.blueprint===bp.id?state.patternPlan:defaultPlan(bp);
  renderPattern(cv,'blank');
  state.patternPlan=saved;
 }
}
function chooseBlueprint(){
 const bp=blueprintById(albumSelected);
 if(bp.locked){showToast('这张纹样的拓样还没凑齐，先从杏花卷草开始吧。');return}
 state.patternPlan=defaultPlan(bp);
 closeWorkshop();
 showToast('已选蓝本 · '+bp.num+' '+bp.name);
 showDialogue([{speaker:'阿木提',text:'好眼力。去纺织台，先把它的三段结构认出来。',emotion:'praise'}],render);
}
