<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import GameLoading from './GameLoading.vue'
import KashgarMemoryPlaque from './map/KashgarMemoryPlaque.vue'
import CityMapArtwork from './map/CityMapArtwork.vue'
import { mapArt } from '../data/mapVisuals'
import { mapLevels } from '../data/mapLevels'
import { scenicChapters } from '../data/scenicChapters'
let hoverCloseTimer = null

const activeGame = ref(null)
const gameFrame = ref(null)
const isGameLoading = ref(false)
const gameReady = ref(false)
const selectedLevel = ref(null)
const hoveredLevel = ref(null)
const closeButton = ref(null)
const selectedCharacter = ref(sessionStorage.getItem('selectedCharacter') || 'female')
let opener = null

function closeGame() {
  gameFrame.value?.contentWindow?.GameApp?.save()
  isGameLoading.value = false
  activeGame.value = null
  nextTick(() => opener?.focus())
}
function selectLevel(level) {
  if (isGameLoading.value) return
  hoveredLevel.value = null
  opener = document.getElementById('level-' + level.id)
  if (level.chapter) {
    const hero = selectedCharacter.value === 'male' ? 'aide' : 'aysu'
    gameReady.value = false
    isGameLoading.value = true
    activeGame.value = {
      title: level.title,
      url: `${import.meta.env.BASE_URL}game/index.html?v=3&entry=map&chapter=${level.chapter}&hero=${hero}`,
    }
    return
  }
  selectedLevel.value = level
  nextTick(() => closeButton.value?.focus())
}
function setHoveredLevel(level) { clearTimeout(hoverCloseTimer); hoveredLevel.value = level }
function focusLevel(level, event) {
  setHoveredLevel(level)
  if (window.innerWidth <= 600) event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'center' })
}
function clearHoveredLevel(levelId) {
  clearTimeout(hoverCloseTimer)
  hoverCloseTimer = setTimeout(() => { if (hoveredLevel.value?.id === levelId) hoveredLevel.value = null }, 70)
}
function handleGameMessage(event) {
  if (event.origin === window.location.origin && event.source === gameFrame.value?.contentWindow && event.data?.type === 'map-chapter-ready') gameReady.value = true
}
function finishGameLoading() {
  isGameLoading.value = false
  gameFrame.value?.contentWindow?.GameApp?.resume()
  nextTick(() => gameFrame.value?.focus())
}
function closePreview() {
  selectedLevel.value = null
  nextTick(() => opener?.focus())
}
function handleKeydown(event) {
  if (selectedLevel.value && event.key === 'Escape') {
    event.preventDefault()
    closePreview()
  }
}
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('message', handleGameMessage)
})
onBeforeUnmount(() => {
  clearTimeout(hoverCloseTimer)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('message', handleGameMessage)
})
</script>

<template>
  <main class="map-page" :data-player-character="selectedCharacter" aria-label="喀什小镇关卡地图">
    <div class="map-container" :style="{ '--map-ratio': mapArt.width / mapArt.height }" :inert="selectedLevel || activeGame ? true : undefined">
      <CityMapArtwork :levels="mapLevels" :active-id="hoveredLevel?.id" @enter="setHoveredLevel" @leave="clearHoveredLevel" @select="selectLevel" />
      <h1 class="sr-only">喀什小镇 · 五境之旅</h1>
      <button v-for="level in mapLevels" :id="'level-' + level.id" :key="level.id" type="button" class="level-sign" :class="{ developing: !level.chapter, 'is-hovered': hoveredLevel?.id === level.id }" :style="{ left: level.x + '%', top: level.y + '%' }" :aria-describedby="hoveredLevel?.id === level.id ? 'memory-plaque' : undefined" :aria-label="`第${level.id}关 ${level.title}，${level.chapter ? '进入关卡' : '欣赏风景'}`" @mouseenter="setHoveredLevel(level)" @mouseleave="clearHoveredLevel(level.id)" @focus="focusLevel(level, $event)" @blur="clearHoveredLevel(level.id)" @click="selectLevel(level)">

      </button>
    </div>
    <Teleport to="body">
      <Transition name="memory" :duration="{ enter: 700, leave: 240 }">
        <KashgarMemoryPlaque v-if="hoveredLevel && !activeGame && !selectedLevel" :key="hoveredLevel.id" :level="hoveredLevel" />
      </Transition>
    </Teleport>
    <p v-if="!activeGame && !selectedLevel" class="map-pan-hint" aria-hidden="true">左右滑动 · 探索古城街巷</p>
    <section v-if="activeGame" class="game-overlay" :inert="isGameLoading ? true : undefined" :aria-label="activeGame.title">
      <header class="game-header"><button type="button" @click="closeGame">‹ 返回小镇地图</button><h1>{{ activeGame.title }}</h1></header>
      <iframe ref="gameFrame" :src="activeGame.url" :title="activeGame.title" allow="autoplay; fullscreen" />
    </section>
    <GameLoading v-if="isGameLoading" class="chapter-loading" :destination="activeGame.title" :ready="gameReady" @complete="finishGameLoading" />
    <Transition name="preview">
      <div v-if="selectedLevel" class="preview-backdrop" @click.self="closePreview">
        <section class="level-preview" role="dialog" aria-modal="true" aria-labelledby="preview-title" aria-describedby="preview-detail" @keydown.tab.prevent="closeButton?.focus()">
          <header class="preview-header">
            <div><p>喀什小镇 · 第 {{ String(selectedLevel.id).padStart(2, '0') }} 关</p><h2 id="preview-title">{{ selectedLevel.title }}</h2></div>
            <button ref="closeButton" type="button" class="preview-close" aria-label="关闭提示" @click="closePreview">×</button>
          </header>
          <img class="scenery-art" :src="scenicChapters[selectedLevel.id].image" :alt="selectedLevel.title + '风景插画'" />
          <div class="scenery-copy">
            <p class="preview-theme">{{ scenicChapters[selectedLevel.id].caption }}</p>
            <p id="preview-detail" class="preview-caption">{{ scenicChapters[selectedLevel.id].description }}</p>
          </div>
        </section>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.chapter-loading { position: fixed; inset: 0; z-index: 50; }
.game-overlay { position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; background: #21170f; }
.game-header { display: flex; align-items: center; gap: 20px; padding: 8px 16px; color: #f9e5bc; background: #342519; }
.game-header h1 { margin: 0; font: 700 18px/1.4 serif; }
.game-header button { padding: 8px 14px; border: 1px solid #b98a4d; border-radius: 6px; color: #f9e5bc; background: #503722; cursor: pointer; }
.game-overlay iframe { flex: 1; width: 100%; min-height: 0; border: 0; }
.map-page { position: relative; width: 100vw; height: 100dvh; overflow: auto; background: #d8b685; isolation: isolate; }
/* Fit the full width or height without distortion; excess map remains scrollable. */
.map-container { position: relative; width: max(100%, calc(100dvh * var(--map-ratio))); min-width: 900px; aspect-ratio: var(--map-ratio); }
.map-title { position: absolute; top: 2%; left: 43%; margin: 0; color: #4f2b15; font: 800 32px/1.2 'Songti SC', serif; text-shadow: 0 1px 8px #fff6dc, 0 1px 3px #fff6dc; pointer-events: none; }
.map-title span { display: block; margin-top: 5px; font-size: 12px; }
.level-sign { position: absolute; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 9px; min-height: 52px; padding: 7px 14px 7px 8px; border: 1px solid rgba(175, 120, 59, .72); border-radius: 10px; background: rgba(255, 242, 216, .88); color: #542b18; box-shadow: 0 4px 12px rgba(69, 35, 12, .18); cursor: pointer; white-space: nowrap; transition: transform 420ms cubic-bezier(.22,.61,.36,1), filter 420ms ease, box-shadow 420ms ease, background 420ms ease; }
.level-sign strong { display: block; font: 700 20px/1.25 'Songti SC', serif; }
.level-sign small { display: block; margin-top: 4px; font-size: 11px; color: #466152; }
.level-sign.developing small { color: #806d58; }
.level-number { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #a84720; color: #fff7e1; font: 700 21px/1 serif; }
.level-sign:hover, .level-sign:focus-visible, .level-sign.is-hovered { filter: brightness(1.04); outline: none; transform: translate(-50%, calc(-50% - 5px)) scale(1.025); background: rgba(255, 246, 227, .93); box-shadow: 0 8px 22px rgba(69, 35, 12, .22), 0 0 18px rgba(255, 222, 146, .28); }
.level-sign:focus-visible { outline: 2px solid rgba(255, 236, 182, .9); outline-offset: 4px; }

.preview-backdrop { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; padding: 20px; background: #30201399; backdrop-filter: blur(5px); }
.level-preview { box-sizing: border-box; width: min(440px, 94vw); max-height: 92dvh; overflow: auto; padding: 24px; border: 1px solid #d9b47a; border-radius: 8px; color: #603b25; background: #f9efdf; box-shadow: 0 24px 70px #301c1455; }
.preview-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.preview-header p { margin: 0 0 6px; color: #977346; font-size: 12px; }
.preview-header h2 { margin: 0; font: 700 25px/1.3 'Songti SC', serif; }
.preview-close { flex-shrink: 0; width: 44px; height: 44px; border: 0; border-radius: 50%; color: #86644b; background: #ecddc9; font: 26px/1 serif; cursor: pointer; }
.coming-soon { margin: 28px 0 12px; text-align: center; font-size: 22px; font-weight: 700; }
.preview-caption { margin: 14px 0 0; text-align: center; color: #916b48; font: 14px/1.6 'Songti SC', serif; }
.level-sign { gap: 12px; padding: 10px 17px 10px 11px; border-color: #b88c50; border-radius: 18px 6px 18px 6px; background: linear-gradient(115deg, #fff7e6f5, #f0dcbbf2); box-shadow: 0 5px 15px #45230c30, inset 0 0 0 3px #fff5dd80; text-align: left; }
.level-sign::after { content: ''; position: absolute; left: 55px; right: 18px; bottom: 6px; height: 1px; background: linear-gradient(90deg, #b78b47a0, transparent); pointer-events: none; }
.level-sign .level-number { width: 33px; height: 38px; border-radius: 12px 5px; color: #fff4d6; background: linear-gradient(145deg, #b45b32, #893e25); box-shadow: 0 2px 5px #77381730, inset 0 0 0 2px #e4b77b65; }
.level-sign:not(.developing) .level-number { background: linear-gradient(145deg, #497d73, #2e5a53); }
.sign-copy { position: relative; }
.level-sign .sign-copy strong { letter-spacing: .06em; }
.level-sign .sign-copy small { font-size: 11px; letter-spacing: .04em; }
.sign-motif { flex: none; width: 33px; height: 33px; color: #a77b41; opacity: .75; transition: transform 350ms ease; }
.level-sign:hover .sign-motif, .level-sign.is-hovered .sign-motif { transform: rotate(-6deg) translateY(-2px); }
.level-sign.is-hovered { z-index: 10; }

.level-preview { position: relative; width: min(480px, 92vw); padding: 28px 32px; border-radius: 26px 9px 26px 9px; border-color: #c9a468; background: radial-gradient(ellipse at 50% 38%, #fff9e9 0, transparent 65%), repeating-linear-gradient(35deg, #b7924a04 0 1px, transparent 1px 5px), linear-gradient(135deg, #fbf0d9, #efdfc3); box-shadow: 0 24px 70px #301c1455, inset 0 0 0 5px #fffae477; }
.level-preview::before { content: ''; position: absolute; inset: 10px; border: 1px solid #bd985b45; border-radius: 18px 4px; pointer-events: none; }
.preview-header { position: relative; z-index: 1; align-items: flex-start; }
.preview-header p { font-size: 11px; letter-spacing: .13em; }
.preview-header h2 { font-size: 28px; letter-spacing: .08em; }
.preview-close { width: 32px; height: 32px; background: #d9c39f55; transition: background 180ms ease, transform 180ms ease; }
.preview-close:hover { background: #d9c39f; transform: rotate(8deg); }
.preview-close:focus-visible { outline: 2px solid #497d73; outline-offset: 3px; }
.preview-emblem { position: relative; display: grid; place-items: center; width: 86px; height: 86px; margin: 22px auto 14px; color: #9c6434; border: 1px solid #c4a063; border-radius: 50% 50% 20% 20%; background: radial-gradient(ellipse at 50% 20%, #fff8df, #e7ca9645); box-shadow: 0 5px 16px #a7793520, inset 0 0 0 5px #fff5dc; }
.preview-emblem svg { width: 60px; height: 60px; animation: motif-float 4s ease-in-out infinite; }
.preview-emblem::before, .preview-emblem::after { content: ''; position: absolute; top: 52%; width: 56px; height: 1px; background: linear-gradient(90deg, transparent, #bd975c); }
.preview-emblem::before { right: calc(100% + 14px); }
.preview-emblem::after { left: calc(100% + 14px); transform: rotate(180deg); }
.preview-theme { margin: 0; text-align: center; color: #3e746b; font: 600 12px/1.6 'Songti SC', serif; letter-spacing: .25em; }
.coming-soon { margin: 10px 0; font: 700 23px/1.5 'Songti SC', serif; letter-spacing: .04em; }
.preview-caption { max-width: 340px; margin: 0 auto; line-height: 1.9; color: #866347; }
.preview-status { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 24px; color: #9a805c; font-size: 11px; letter-spacing: .12em; }
.preview-status span { width: 4px; height: 4px; transform: rotate(45deg); background: #b78e50; }
@keyframes motif-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.preview-enter-active .level-preview, .preview-leave-active .level-preview { transition: transform 260ms ease; }
.preview-enter-from .level-preview, .preview-leave-to .level-preview { transform: translateY(10px); }
.preview-enter-active, .preview-leave-active { transition: opacity 260ms; }
.preview-enter-from, .preview-leave-to { opacity: 0; }

.map-pan-hint { display: none; }
@media (max-width: 600px) {
  .map-page { display: block; }
  .map-title { font-size: 26px; }
  .level-sign strong { font-size: 17px; }

  .map-pan-hint { display: block; position: fixed; bottom: 8px; left: 50%; z-index: 15; transform: translateX(-50%); margin: 0; padding: 7px 15px; border-radius: 20px; color: #fff4de; background: #3f342bc9; font-size: 11px; white-space: nowrap; pointer-events: none; }
}

@media (max-width: 480px) { .level-preview { padding: 24px; } .coming-soon { font-size: 20px; } }
@media (prefers-reduced-motion: reduce) { .region-hit, .level-sign, .preview-enter-active, .preview-leave-active, .preview-emblem svg, .sign-motif, .preview-close, .preview-enter-active .level-preview, .preview-leave-active .level-preview { transition: none; animation: none; } }

/* Tilework and woven borders frame the chapter markers and scenic portraits. */
.level-sign { transform: none; min-width: 174px; gap: 10px; padding: 9px 14px 12px 9px; border: 2px solid #e3ba66; border-radius: 26px 26px 6px 6px; color: #fff3ce; background: #166b70; box-shadow: 0 4px 0 #82432c, 0 8px 18px #30201655, inset 0 0 0 3px #104a50; }
.level-sign::before { content: ''; position: absolute; left: 8px; right: 8px; bottom: 3px; height: 7px; background: repeating-linear-gradient(45deg, #e2ad55 0 4px, #a33c32 4px 8px, #247f85 8px 12px, #f6df9c 12px 16px); pointer-events: none; }
.level-sign::after { display: none; }
.level-sign .level-number, .level-sign:not(.developing) .level-number { display: flex; flex-direction: column; justify-content: center; width: 40px; height: 59px; flex-shrink: 0; border: 1px solid #f5d68c; border-radius: 19px 19px 3px 3px; background: #a3382b; box-shadow: inset 0 0 0 3px #bd6241; }
.level-sign .level-number small { margin: 0; color: #ffe6ac; font: 10px/1.2 serif; }
.level-number b { font: 700 25px/1.2 'Songti SC', serif; }
.level-sign .sign-copy strong { color: #fff6da; font-size: 19px; letter-spacing: 0; }
.level-sign .sign-copy small { color: #f5d58e; letter-spacing: 0; }
.sign-motif { width: 30px; height: 36px; color: #f2ce7f; opacity: 1; }
.level-sign:hover, .level-sign:focus-visible, .level-sign.is-hovered { transform: translateY(-3px); background: #1c7b7d; box-shadow: 0 4px 0 #82432c, 0 10px 24px #30201666; }

.level-preview { width: min(1000px, 94vw); padding: 0; border: 3px solid #d4aa5c; border-radius: 8px; background: #fff3dc; box-shadow: 0 24px 70px #1d131577; }
.level-preview::before { display: none; }
.preview-header { padding: 16px 22px; align-items: center; color: #fff2cf; background: #155d64; border-bottom: 5px solid #c69b50; }
.preview-header p { color: #f1d297; letter-spacing: 0; }
.preview-header h2 { color: #fff4d8; font-size: 26px; letter-spacing: 0; }
.preview-close { width: 44px; height: 44px; color: #fff1cf; border: 1px solid #e6c07a; background: #983b30; }
.scenery-art { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.scenery-copy { padding: 18px 30px 24px; border-top: 5px solid #c69b50; }
.preview-theme { font-size: 19px; color: #a33c32; letter-spacing: 0; }
.preview-caption { max-width: 800px; margin: 10px auto 0; color: #64452f; font-size: 15px; line-height: 1.8; }
@media (max-width: 600px) {

  .level-preview { padding: 0; }
  .preview-header { padding: 12px 16px; }
  .scenery-copy { padding: 14px 18px 20px; }
  .preview-theme { font-size: 17px; }
}

/* The chapter signs are painted into the map; these buttons only provide input. */
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.level-sign, .level-sign:hover, .level-sign:focus-visible, .level-sign.is-hovered {
  width: 18%; height: 10%; min-width: 0; min-height: 0; padding: 0;
  border: 0; border-radius: 12px; background: transparent; box-shadow: none;
  transform: translate(-50%, -50%); filter: none;
}
.level-sign::before, .level-sign::after { display: none; }
.level-sign:focus-visible { outline: 2px solid #fff0c5; outline-offset: 3px; }

/* Warm parchment, fine brass inlay and a quiet woven hem. */

@media (max-width: 600px) {

}
@media (prefers-reduced-motion: reduce) {

}
.memory-enter-active { transition: opacity 300ms 150ms cubic-bezier(.22,1,.36,1), transform 300ms 150ms cubic-bezier(.22,1,.36,1); }
.memory-leave-active { transition: opacity 240ms ease, transform 240ms ease; }
.memory-enter-from, .memory-leave-to { opacity: 0; transform: translateY(8px) scale(.985); }
/* On direct district switches, the previous card disappears before the new text enters. */
.memory-leave-active:not(:last-child) { visibility: hidden; }
@media(prefers-reduced-motion:reduce) { .memory-enter-active,.memory-leave-active { transition:none; } }
</style>
