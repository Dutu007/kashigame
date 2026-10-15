(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const chapters = {
    weave: { title: '第一关 · 织梦巷', url: 'levels/weave-lane/index.html' },
    karez: { title: '第二关 · 坎儿井', url: 'karez.html' },
  };
  let frame = null, current = null, completedChapter = null;
  function bridge() { return frame?.contentWindow?.ChapterBridge; }
  function refresh() {
    const s = Campaign.snapshot();
    const name = GameCharacters.definitions[s.character].name;
    $('journeyStatus').textContent = s.completed.karez && s.completed.weave ? `两段故事已完成 · ${name}的旅程` : s.characterChosen ? `同行主角 · ${name}` : '从织梦巷开始你的旅程';
    $('continueJourney').hidden = !s.started.weave && !s.started.karez;
    $('enterWeave').textContent = s.started.weave ? '重返织梦巷 →' : '走进织梦巷 →';
    $('weaveStatus').textContent = s.completed.weave ? '已完成 · 获得织梦染谱' : s.started.weave ? '探索中 · 进度已保留' : '旅程起点';
    $('enterKarez').disabled = !Campaign.canEnter('karez');
    $('enterKarez').textContent = Campaign.canEnter('karez') ? (s.started.karez ? '重返坎儿井 →' : '前往坎儿井 →') : '完成第一关后开启';
    $('karezStatus').textContent = s.completed.karez ? '已完成 · 水路重新连通' : s.started.karez ? '探索中 · 进度已保留' : '承接织梦巷的故事';
    $('heroName').textContent = name;
    $('nextChapter').hidden = current !== 'weave' || !s.completed.weave;
    $('storageWarning').hidden = Campaign.storageOK;
  }
  function unload() {
    if (!frame) return;
    bridge()?.save();
    frame.remove(); frame = null;
  }
  function enter(id) {
    if (!chapters[id] || !Campaign.canEnter(id)) return;
    if ($('completion').open) $('completion').close();
    unload(); current = id; Campaign.enter(id);
    $('menu').hidden = true; $('play').hidden = false; $('loading').hidden = false;
    $('chapterTitle').textContent = chapters[id].title;
    frame = document.createElement('iframe'); frame.title = chapters[id].title; frame.allow = 'autoplay; fullscreen';
    const url = new URL(chapters[id].url, document.baseURI);
    frame.src = url.href;
    frame.addEventListener('load', () => { $('loading').hidden = true; frame?.contentWindow.focus(); }, { once: true });
    $('chapterMount').appendChild(frame);
    history.replaceState(null, '', location.pathname + '#' + id);
    refresh();
  }
  function menu() {
    if ($('completion').open) $('completion').close();
    unload(); current = null;
    $('play').hidden = true; $('menu').hidden = false;
    history.replaceState(null, '', location.pathname);
    refresh(); $('continueJourney').focus();
  }
  function showCompletion(id) {
    if (!chapters[id] || !Campaign.snapshot().completed[id]) return;
    completedChapter = id; bridge()?.pause();
    const first = id === 'weave';
    $('completionKicker').textContent = first ? '纹脉已接续' : '水脉已连通';
    $('completionTitle').textContent = first ? '织梦巷 · 完成' : '坎儿井 · 完成';
    $('completionCopy').textContent = first ? '新绸上的纹样已收入织梦染谱。小镇的水却日渐稀少，带着这段记忆，去坎儿井寻找断开的水脉。' : '绳梯与陶灯带你走入暗渠，清淤、修补与复查让水流重新回到小镇。维护记录已经留下，这段旅程也有了新的回响。';
    $('completionNext').textContent = first ? '前往第二关 →' : '返回关卡目录';
    $('stayInChapter').hidden = !frame;
    if (!$('completion').open) $('completion').showModal();
    refresh();
  }
  function resume() { bridge()?.resume(); frame?.contentWindow.focus(); }
  $('enterWeave').onclick = () => enter('weave');
  $('enterKarez').onclick = () => enter('karez');
  $('continueJourney').onclick = () => enter(Campaign.snapshot().currentChapter);
  $('backToMenu').onclick = menu;
  $('nextChapter').onclick = () => enter('karez');
  $('stayInChapter').onclick = () => { $('completion').close(); resume(); };
  $('completionNext').onclick = () => completedChapter === 'weave' ? enter('karez') : menu();
  $('completion').addEventListener('cancel', resume);
  window.GameApp = Object.freeze({ showCompletion }); Campaign.subscribe(refresh);
  window.addEventListener('beforeunload', () => bridge()?.save()); refresh();
  const query = new URLSearchParams(location.search);
  const requested = query.get('chapter') || location.hash.slice(1);
  if (chapters[requested]) enter(requested);
  else if (['weave','karez'].includes(query.get('completed'))) showCompletion(query.get('completed'));
})();
