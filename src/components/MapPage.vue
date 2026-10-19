<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import GameLoading from './GameLoading.vue'
import WeaveTransition from './WeaveTransition.vue'
import mapBackgroundUrl from '../../地图.png'
import { mapLevels } from '../data/mapLevels'
const regions = [
  '40,40 45,33 50,34 56,44 57,56 60,65 61,74 58,83 61,98 44,99 36,91 36,81 38,70 35,74 35,66 38,58 40,52',
  '3,51 12,45 24,42 33,40 38,48 40,53 38,62 34,68 23,63 14,59 3,56',
  '2,29 9,22 23,21 29,25 32,32 34,35 30,40 20,44 12,42 5,38',
  '1,63 5,58 14,60 23,65 31,68 35,76 37,85 35,91 29,88 21,83 12,78 3,73',
  '27,18 31,10 39,8 45,10 50,16 54,20 52,28 48,34 41,34 34,30 29,26',
  '50,33 56,26 58,15 60,14 61,23 68,18 70,23 72,30 75,34 77,40 74,43 64,45 56,43',
  '59,47 64,45 74,44 81,46 85,50 90,52 92,58 84,61 75,65 63,70 60,61 58,54',
  '63,74 70,70 77,66 87,62 96,60 99,62 98,68 94,73 93,80 88,87 79,94 70,98 63,95 61,87',
  '76,25 80,22 87,21 93,24 97,29 99,33 97,42 94,47 89,46 82,42 78,38',
  '68,18 70,12 74,9 75,3 78,3 80,10 87,13 90,17 91,21 87,21 80,20 75,22 72,24',
]
const images = import.meta.glob('../../地图关卡*.png', { eager: true, query: '?url', import: 'default' })
const activeGame = ref(null)
const gameFrame = ref(null)
const isGameLoading = ref(false)
const gameReady = ref(false)
const gameRevealed = ref(false)
const gameChapters = { 3: { id: 'weave', title: '织梦巷' }, 7: { id: 'karez', title: '坎儿井' } }
const selectedLevel = ref(null)
const closeButton = ref(null)
const imageFailed = ref(false)
const selectedCharacter = ref(sessionStorage.getItem('selectedCharacter') || 'female')
const levelsWithRegions = computed(() => mapLevels.map((level, index) => ({ ...level, points: regions[index], image: images[`../../地图关卡${level.id}.png`] })))
let opener = null

function closeGame() {
  gameFrame.value?.contentWindow?.GameApp?.save()
  isGameLoading.value = false
  activeGame.value = null
  nextTick(() => opener?.focus())
}
function selectLevel(level, event) {
  if (isGameLoading.value) return
  opener = event.currentTarget
  const chapter = gameChapters[level.id]
  if (chapter) {
    const hero = selectedCharacter.value === 'male' ? 'aide' : 'aysu'
    gameReady.value = false
    gameRevealed.value = false
    isGameLoading.value = true
    activeGame.value = { ...chapter, url: `${import.meta.env.BASE_URL}game/index.html?v=weave-smooth-20261020-2&entry=map&chapter=${chapter.id}&hero=${hero}` }
    return
  }
  imageFailed.value = false
  selectedLevel.value = level
  nextTick(() => closeButton.value?.focus())
}
function handleGameMessage(event) {
  if (event.origin === window.location.origin && event.source === gameFrame.value?.contentWindow && event.data?.type === 'map-chapter-ready') gameReady.value = true
}
function finishGameLoading() {
  isGameLoading.value = false
  gameFrame.value?.contentWindow?.GameApp?.resume()
  nextTick(() => gameFrame.value?.focus())
}
function closePreview() { selectedLevel.value = null; nextTick(() => opener?.focus()) }
function handleKeydown(event) { if (selectedLevel.value && event.key === 'Escape') { event.preventDefault(); closePreview() } }
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('message', handleGameMessage)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('message', handleGameMessage)
})
</script>

<template>
  <main class="map-page" :data-player-character="selectedCharacter" aria-label="喀什小镇关卡地图">
    <div class="map-container" :inert="selectedLevel || activeGame ? true : undefined">
      <img class="base-map" :src="mapBackgroundUrl" alt="喀什小镇世界地图" draggable="false" />
      <svg class="map-regions" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="关卡选择">
        <defs><clipPath v-for="level in levelsWithRegions" :id="`region-${level.id}`" :key="level.id"><polygon :points="level.points" /></clipPath></defs>
        <g v-for="level in levelsWithRegions" :key="level.id" class="map-region" role="button" tabindex="0" :aria-label="gameChapters[level.id] ? `进入${gameChapters[level.id].title}：${level.title}` : `查看第${level.id}关：${level.title}`" aria-haspopup="dialog" @click="selectLevel(level, $event)" @keydown.enter.prevent="selectLevel(level, $event)" @keydown.space.prevent="selectLevel(level, $event)">
          <image class="region-art" :href="mapBackgroundUrl" width="100" height="100" preserveAspectRatio="none" :clip-path="`url(#region-${level.id})`" aria-hidden="true" />
          <polygon class="region-hit" :points="level.points" />
        </g>
      </svg>
    </div>
    <section v-if="activeGame" class="game-overlay" :class="{ 'is-preparing': isGameLoading && !gameRevealed && activeGame.id === 'weave' }" :inert="isGameLoading ? true : undefined" :aria-label="activeGame.title">
      <header class="game-header"><button type="button" @click="closeGame">‹ 返回小镇地图</button><h1>{{ activeGame.title }}</h1></header>
      <iframe ref="gameFrame" :src="activeGame.url" :title="activeGame.title" allow="autoplay; fullscreen" />
    </section>
    <component :is="activeGame?.id === 'weave' ? WeaveTransition : GameLoading" v-if="isGameLoading" class="chapter-loading" :destination="activeGame.title" :ready="gameReady" @reveal="gameRevealed = true" @complete="finishGameLoading" />
    <Transition name="preview">
      <div v-if="selectedLevel" class="preview-backdrop" @click.self="closePreview"><section class="level-preview" role="dialog" aria-modal="true" aria-labelledby="preview-title"><header class="preview-header"><div><p>喀什小镇 · 第 {{ String(selectedLevel.id).padStart(2, '0') }} 关</p><h2 id="preview-title">{{ selectedLevel.title }}</h2></div><button ref="closeButton" type="button" class="preview-close" aria-label="关闭关卡预览" @click="closePreview">×</button></header><div class="preview-art"><p v-if="imageFailed">关卡图片暂时加载失败，请关闭后重试。</p><img v-else :src="selectedLevel.image" :alt="`${selectedLevel.title}关卡地图`" @error="imageFailed = true" /></div><p class="preview-caption">{{ selectedLevel.detail }}</p></section></div>
    </Transition>
  </main>
</template>

<style scoped>
.chapter-loading { position: fixed; inset: 0; z-index: 50; }
.game-overlay { position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; background: #21170f; }
.game-overlay.is-preparing { visibility: hidden; }
.game-header { display: flex; align-items: center; gap: 20px; padding: 8px 16px; color: #f9e5bc; background: #342519; }
.game-header h1 { margin: 0; font: 700 18px/1.4 serif; }
.game-header button { padding: 8px 14px; border: 1px solid #b98a4d; border-radius: 6px; color: #f9e5bc; background: #503722; cursor: pointer; }
.game-overlay iframe { flex: 1; width: 100%; min-height: 0; border: 0; }
.map-page { position: relative; display: grid; width: 100vw; height: 100vh; min-height: 420px; overflow: hidden; place-items: center; background: #d8b685; isolation: isolate; }
.map-container { position: relative; width: min(100vw, calc(100dvh * 1672 / 941)); aspect-ratio: 1672 / 941; overflow: hidden; }
.base-map { display: block; width: 100%; height: 100%; user-select: none; }
.map-regions { position: absolute; inset: 0; width: 100%; height: 100%; }
.map-region { cursor: pointer; outline: none; }
.region-art { pointer-events: none; filter: brightness(1.2) saturate(1.08); animation: region-glow 3.6s ease-in-out infinite; }
.region-hit { fill: transparent; pointer-events: all; stroke: transparent; stroke-width: 2; vector-effect: non-scaling-stroke; transition: fill 180ms ease, stroke 180ms ease; }
.map-region:hover .region-art, .map-region:focus-visible .region-art { animation: none; opacity: .95; filter: brightness(1.26) saturate(1.15); }
.map-region:hover .region-hit, .map-region:focus-visible .region-hit { fill: #ffe6a51a; stroke: #fff0bb; stroke-linejoin: round; }
@keyframes region-glow { 0%, 100% { opacity: .12; } 50% { opacity: .75; } }
.preview-backdrop { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; padding: 20px; background: #30201399; backdrop-filter: blur(5px); }
.level-preview { width: min(860px, 94vw); max-height: 92dvh; overflow: auto; padding: 22px; border: 1px solid #d9b47a; border-radius: 20px; color: #603b25; background: #f9efdf; box-shadow: 0 24px 70px #301c1455; }
.preview-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.preview-header p { margin: 0 0 6px; color: #977346; font-size: 12px; letter-spacing: .12em; }
.preview-header h2 { margin: 0; font: 700 25px/1.3 'Songti SC', serif; }
.preview-close { width: 34px; height: 34px; border: 0; border-radius: 50%; color: #86644b; background: #ecddc9; font: 26px/1 serif; cursor: pointer; }
.preview-art { display: grid; place-items: center; min-height: 120px; overflow: hidden; border-radius: 12px; background: #fffcf6; }
.preview-art img { display: block; width: 100%; max-height: 65dvh; object-fit: contain; }
.preview-caption { margin: 14px 0 0; text-align: center; color: #916b48; font: 14px/1.6 'Songti SC', serif; }
.preview-enter-active, .preview-leave-active { transition: opacity 200ms ease; }
.preview-enter-active .level-preview, .preview-leave-active .level-preview { transition: transform 200ms ease; }
.preview-enter-from, .preview-leave-to { opacity: 0; }
.preview-enter-from .level-preview, .preview-leave-to .level-preview { transform: translateY(10px); }
@media (prefers-reduced-motion: reduce) { .region-art, .preview-enter-active, .preview-leave-active, .preview-enter-active .level-preview, .preview-leave-active .level-preview { animation: none; transition: none; } }
</style>
