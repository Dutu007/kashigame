// 全局状态与常量
const W=1672,H=941;
const state={scene:0,x:330,y:758,character:'aysu',portalLock:null,motionTime:0,facing:1,quest:false,patternPlan:null,collection:[],boundWarp:false,dyedWarp:false,woven:false,silkCollected:false,chapterComplete:false,busy:true,dialogueOpen:false,dialogueQueue:[],history:[],afterDialogue:null,dyeMet:false,dyeBriefed:false};
const ACTOR_RADIUS=12;
const $=id=>document.getElementById(id);const keys=new Set();let last=performance.now();
