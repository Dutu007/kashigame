(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const query = new URLSearchParams(location.search);
  const fromMap = query.get('entry') === 'map';
  document.body.classList.toggle('from-map', fromMap);
  const canEnter = id => Campaign.canEnter(id) || (fromMap && (id === 'weave' || id === 'karez'));
  if (fromMap && ['aide', 'aysu'].includes(query.get('hero'))) Campaign.chooseCharacter(query.get('hero'));
  const chapters = {
    weave: { title: '第一关 · 织梦巷', url: 'levels/weave-lane/index.html?v=weave-smooth-20261020-2' },
    karez: { title: '第二关 · 坎儿井', url: 'karez.html' },
  };
  let frame = null, current = null, completedChapter = null;
  function bridge() { return frame?.contentWindow?.ChapterBridge; }
  function refresh() {
    const s = Campaign.snapshot();
    const name = GameCharacters.definitions[s.character].name;
    $('journeyStatus').textContent = s.completed.karez && s.completed.weave ? `两段故事已完成 · ${name}的旅程` : s.characterChosen ? `同行主角 · ${name}` : '从织梦巷开始你的旅程';
    $('continueJourney').hidden = !s.started.weave && !s.started.karez;
    $('continueJourney').innerHTML = s.currentChapter === 'karez'
      ? '进入坎儿井 <span aria-hidden="true">→</span>' : '继续旅程 <span aria-hidden="true">→</span>';
    $('enterWeave').textContent = s.started.weave ? '重返织梦巷 →' : '走进织梦巷 →';
    $('weaveStatus').textContent = s.completed.weave ? '已完成 · 获得织梦染谱' : s.started.weave ? '探索中 · 进度已保留' : '旅程起点';
    $('enterKarez').disabled = !canEnter('karez');
    $('enterKarez').textContent = canEnter('karez') ? '进入坎儿井 →' : '完成第一关后开启';
    $('karezStatus').textContent = s.completed.karez ? '已完成 · 再次进入从头开始' : s.started.karez ? '再次进入将从头开始' : '承接织梦巷的故事';
    $('heroName').textContent = name;
    $('nextChapter').hidden = current !== 'weave' || !s.completed.weave;
    $('storageWarning').hidden = Campaign.storageOK;
  }
  function unload() {
    if (!frame) return;
    bridge()?.save();
    if (current === 'karez') bridge()?.prepareRestart?.();
    frame.remove(); frame = null;
  }
  function enter(id, fresh = false) {
    if (!chapters[id] || !canEnter(id)) return;
    if ($('completion').open) $('completion').close();
    unload();
    // Entering from the map always restarts that chapter from the beginning.
    if (fresh) Campaign.resetChapter(id);
    // A fresh run replays the opening story; an in-progress run resumes directly.
    const intro = id === 'weave' && !Campaign.snapshot().started.weave;
    current = id; Campaign.enter(id);
    const coveredEntry = !fromMap && intro;
    $('menu').hidden = !coveredEntry; $('play').hidden = false; $('loading').hidden = false;
    $('play').style.visibility = coveredEntry ? 'hidden' : '';
    $('chapterTitle').textContent = chapters[id].title;
    frame = document.createElement('iframe'); frame.title = chapters[id].title; frame.allow = 'autoplay; fullscreen';
    const url = new URL(intro ? 'levels/weave-lane/intro/index.html?embedded=1&v=2' : chapters[id].url, document.baseURI);
    frame.src = url.href;
    const chapterFrame = frame;
    let revealChapter;
    const chapterReady = new Promise(resolve => { revealChapter = resolve; });
    const entryTransition = !fromMap && intro
      ? WeaveMapTransition.run(() => {
          $('menu').hidden = true;
          $('play').style.visibility = '';
          return chapterReady;
        })
      : null;
    frame.addEventListener('load', () => {
      if (frame !== chapterFrame) return;
      if (intro) chapterFrame.contentWindow.addEventListener('zhimengxiangTransitionComplete', () => {
        if (frame !== chapterFrame) return;
        $('loading').hidden = false;
        chapterFrame.addEventListener('load', () => {
          if (frame !== chapterFrame) return;
          $('loading').hidden = true;
          chapterFrame.contentWindow.focus();
        }, { once: true });
        chapterFrame.src = new URL(chapters[id].url, document.baseURI).href;
      }, { once: true });
      $('loading').hidden = true; if (fromMap) {
      window.parent.postMessage({ type: 'map-chapter-ready' }, location.origin);
    } else {
      const reveal = () => {
        if (frame !== chapterFrame) return;
        if (intro) chapterFrame.contentWindow.ChapterBridge.resume();
        chapterFrame.contentWindow.focus();
      };
      if (entryTransition) {
        revealChapter();
        entryTransition.then(reveal);
      } else reveal();
    } }, { once: true });
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
  // Chapter two is the end of the journey: leave the chapter and show the level list again
  // instead of keeping the player inside the embedded game.
  function returnToLevelList(chapter) {
    if (!fromMap) { menu(); return; }
    try { window.parent.postMessage({ type: 'map-chapter-complete', chapter }, location.origin); }
    catch (_) { /* Fall through to the local level list. */ }
    // The map closes this player as soon as it receives the message. If it never answers
    // (for example ?entry=map was opened on its own), fall back to the local level list.
    setTimeout(() => { if (current === chapter) menu(); }, 600);
  }
  function finishChapter(chapter) {
    if (chapter === 'karez') returnToLevelList(chapter);
    else showCompletion(chapter);
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
  $('enterKarez').onclick = () => enter('karez', true);
  $('continueJourney').onclick = () => { const id = Campaign.snapshot().currentChapter; enter(id, id === 'karez'); };
  $('backToMenu').onclick = menu;
  $('nextChapter').onclick = () => enter('karez', true);
  $('stayInChapter').onclick = () => { $('completion').close(); resume(); };
  $('completionNext').onclick = () => completedChapter === 'weave' ? enter('karez', true) : menu();
  $('completion').addEventListener('cancel', resume);
  window.GameApp = Object.freeze({ showCompletion, finishChapter, resume, save: () => bridge()?.save() }); Campaign.subscribe(refresh);
  window.addEventListener('beforeunload', () => bridge()?.save());
  window.addEventListener('pagehide', event => {
    bridge()?.save();
    if (!event.persisted && current === 'karez') bridge()?.prepareRestart?.();
  });
  refresh();
  const requested = query.get('chapter') || location.hash.slice(1);
  if (chapters[requested]) enter(requested, fromMap);
  else if (['weave','karez'].includes(query.get('completed'))) showCompletion(query.get('completed'));
})();
