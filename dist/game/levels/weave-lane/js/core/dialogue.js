// 对话与 toast
function showToast(message,type){$('toast').textContent=message;$('toast').className=type==='gold'?'gold':'';$('toast').hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>{$('toast').hidden=true},2600)}
function setNpcNameHidden(v){document.querySelectorAll('#amuti,#amutiDye').forEach(npc=>{const tag=npc.querySelector('span');if(tag)tag.style.display=v?'none':''})}
function closeDialogue(){state.dialogueOpen=false;state.dialogueQueue=[];state.busy=false;state.afterDialogue=null;$('dialoguePanel').hidden=true;$('functionBar').hidden=true;setNpcNameHidden(false)}
function paintDialogueLine(){
 const line=state.dialogueQueue[0];if(!line){closeDialogue();return}
 const speaker=line.speaker||'阿依苏',portrait=$('dialoguePortrait');
 const HERO_PORTRAIT={'阿依苏':'aysu','艾德':'aide','阿木提':'amuti'};
 const EMOTIONS=['neutral','happy','sad','confused','angry','realize','gentle','guide','serious','praise'];
 // 阿木提专属六情绪之外的通用情绪回退
 const EMOTION_ALIAS={amuti:{sad:'gentle',confused:'serious',angry:'serious',realize:'guide'}};
 const hero=HERO_PORTRAIT[speaker];
 let emotion=EMOTIONS.indexOf(line.emotion)>=0?line.emotion:'neutral';
 if(hero&&EMOTION_ALIAS[hero]&&EMOTION_ALIAS[hero][emotion])emotion=EMOTION_ALIAS[hero][emotion];
 const portraitVersion=hero==='amuti'&&emotion==='guide'?'?v=2':'';
 portrait.style.backgroundImage=hero?('url("../../assets/characters/'+hero+'/portraits/emotions/'+hero+'_portrait_'+emotion+'.png'+portraitVersion+'")'):'url("../../assets/characters/amuti/amuti_portrait.png")';
 portrait.classList.remove('npc-portrait');
 portrait.classList.toggle('is-npc',speaker!=='阿依苏'&&speaker!=='艾德');
 portrait.style.backgroundSize='contain';
 portrait.style.backgroundPosition='center bottom';
 portrait.textContent='';
 $('dialogueSpeaker').textContent=speaker;$('dialogueSpeaker').classList.toggle('is-npc',!hero);$('dialogueText').textContent=line.text;
 $('dialogueOptions').innerHTML=(line.options||[]).map((option,i)=>'<button type="button" data-option="'+i+'">'+option+'</button>').join('');
 $('dialogueOptions').hidden=!(line.options&&line.options.length);
 $('dialogueNext').textContent=state.dialogueQueue.length>1?'继续':'收起';
}
function showDialogue(lines,after){state.dialogueQueue=lines.map(line=>typeof line==='string'?{speaker:characters[state.character].name,text:line}:line);state.afterDialogue=after||null;state.dialogueOpen=true;state.busy=true;state.history.push(...state.dialogueQueue);$('dialoguePanel').hidden=false;$('functionBar').hidden=false;setNpcNameHidden(true);paintDialogueLine()}
function advanceDialogue(){if(!state.dialogueOpen)return;state.dialogueQueue.shift();if(!state.dialogueQueue.length){const after=state.afterDialogue;state.dialogueOpen=false;state.afterDialogue=null;$('dialoguePanel').hidden=true;$('functionBar').hidden=true;state.busy=false;setNpcNameHidden(false);if(after)after();return}paintDialogueLine()}
