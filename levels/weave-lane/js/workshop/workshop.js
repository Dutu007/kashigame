// 工作台壳：模式路由（选蓝本/辨纹/染线/织绸）、共享进度状态、确认弹窗
const threadState={round:0,path:[],attempts:0,bound:[false,false,false],bindNext:0,
 demoRound:-1,demoPlaying:false,hintLevel:0};
const weaveState={step:0,round:0,demo:true};
const vatState={base:{done:false,stage:0,fill:0,depth:.55},main:{done:false,stage:0,fill:0,depth:.55},halo:{done:false,stage:0,fill:0,depth:.55}};
let vatColors=null,activeVat='base',dipTimer=null,dipPaused=false;
const VATS=[
 {key:'base',title:'底色缸',dips:1,zones:[[.30,.52]],labels:['打底'],desc:'底色缸染丝线的底子。浅了发白，深了发闷。'},
 {key:'main',title:'主纹缸',dips:2,zones:[[.25,.48],[.60,.82]],labels:['主纹','叠色'],desc:'主纹缸染主花：先打底，再叠一次色。'},
 {key:'halo',title:'晕色缸',dips:1,zones:[[.56,.76]],labels:['晕色'],desc:'晕色缸染卷草与晕边，色晕在这里出来。'}
];
let workshopCloseHook=null;
function openWorkshop(mode){
 state.busy=true;loadPatternAssets();
 workshopCloseHook=null;
 $('patternWorkshop').hidden=false;
 $('threadingView').hidden=mode!=='threading';
 $('weavingView').hidden=mode!=='weaving';
 $('dyeView').hidden=mode!=='dye-old';
 $('coloringView').hidden=mode!=='dye';
 $('albumView').hidden=mode!=='album';
 $('puzzleView').hidden=true;
 if(mode==='album')setupAlbum();
 if(mode==='threading')setupThreading();
 if(mode==='weaving')setupWeaving();
 if(mode==='dye')openColoring();
}
function closeWorkshop(){
 state.busy=false;
 if(dipTimer){clearInterval(dipTimer);dipTimer=null;dipPaused=true}
 if(workshopCloseHook){const h=workshopCloseHook;workshopCloseHook=null;h();}
 $('patternWorkshop').hidden=true;hideConfirm();
 const ho=$('hangingOverlay');if(ho)ho.hidden=true;
 const pf=$('dyePerform');if(pf)pf.hidden=true;
 // 复位进染院时的镜头缓推
 const board=document.getElementById('board');
 if(board){board.style.transition='transform .45s ease,filter .45s ease';board.style.transform='';board.style.filter='';}
}
let confirmHandlers=null;
function showConfirm(text,yesLabel,noLabel,onYes,onNo){
 confirmHandlers={onYes,onNo};
 $('confirmText').textContent=text;
 $('confirmYes').textContent=yesLabel;$('confirmNo').textContent=noLabel;
 $('confirmModal').hidden=false;
}
function hideConfirm(){$('confirmModal').hidden=true;confirmHandlers=null}
function answerConfirm(yes){
 const h=confirmHandlers;hideConfirm();
 if(!h)return;
 if(yes&&h.onYes)h.onYes();
 if(!yes&&h.onNo)h.onNo();
}
