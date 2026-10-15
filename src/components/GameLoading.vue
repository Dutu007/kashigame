<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import loadingBackgroundUrl from '../../首页加载.png'
import textureUrl from '../../加载动画所用材质.png'

const emit = defineEmits(['complete'])
const progress = ref(0)
const loadingMessage = ref('正在整理旅途中的行囊……')
const isLeaving = ref(false)
const dots = ref('')
let frameId = null
let messageTimer = null
let completeTimer = null
let dotTimer = null
let startedAt = 0
const duration = 4300

const messages = [
  [0, '正在整理旅途中的行囊……'],
  [20, '正在穿过喀什古城的街巷……'],
  [40, '正在寻找丝路留下的故事……'],
  [60, '正在开启新的文化旅程……'],
  [80, '新的故事即将开始……'],
  [100, '旅程已经准备好了！'],
]

const progressStyle = computed(() => ({ width: progress.value + '%' }))

function updateMessage(value) {
  const next = [...messages].reverse().find(([threshold]) => value >= threshold)?.[1] || messages[0][1]
  if (next === loadingMessage.value) return
  loadingMessage.value = ''
  window.clearTimeout(messageTimer)
  messageTimer = window.setTimeout(() => { loadingMessage.value = next }, 120)
}

function tick(now) {
  if (!startedAt) startedAt = now
  const elapsed = Math.min(1, (now - startedAt) / duration)
  const eased = elapsed < 0.18
    ? elapsed / 0.18 * 0.2
    : elapsed < 0.72
      ? 0.2 + (elapsed - 0.18) / 0.54 * 0.5
      : elapsed < 0.9
        ? 0.7 + (elapsed - 0.72) / 0.18 * 0.2
        : 0.9 + (elapsed - 0.9) / 0.1 * 0.1
  progress.value = Math.min(100, Math.round(eased * 100))
  updateMessage(progress.value)
  if (elapsed < 1) frameId = window.requestAnimationFrame(tick)
  else finish()
}

function finish() {
  progress.value = 100
  loadingMessage.value = '旅程已经准备好了！'
  window.clearTimeout(completeTimer)
  completeTimer = window.setTimeout(() => {
    isLeaving.value = true
    completeTimer = window.setTimeout(() => emit('complete'), 720)
  }, 650)
}

onMounted(() => {
  dotTimer = window.setInterval(() => { dots.value = dots.value.length >= 3 ? '' : dots.value + '.' }, 420)
  frameId = window.requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (frameId) window.cancelAnimationFrame(frameId)
  window.clearTimeout(messageTimer)
  window.clearTimeout(completeTimer)
  window.clearInterval(dotTimer)
})
</script>

<template>
  <main class="game-loading" :class="{ 'is-leaving': isLeaving }" :style="{ '--loading-bg': 'url(' + loadingBackgroundUrl + ')' }" aria-label="游戏加载中">
    <section class="loading-panel" aria-live="polite">
      <h1>正在前往喀什小镇<span class="title-dots">{{ dots }}</span></h1>
      <div class="loading-track" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
        <div class="loading-fill" :style="progressStyle"><span class="loading-sheen" /></div>
      </div>
      <div class="loading-percent">{{ progress }}%</div>
      <p class="loading-message">{{ loadingMessage }}</p>
    </section>
  </main>
</template>

<style scoped>
.game-loading { position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #ead6b4 var(--loading-bg) center / cover no-repeat; opacity: 1; transform: scale(1); transition: opacity 720ms ease, transform 720ms ease; }
.game-loading.is-leaving { opacity: 0; transform: scale(1.015); }
.loading-panel { position: absolute; left: 50%; bottom: clamp(8%, 10%, 12%); width: min(90vw, 920px); transform: translateX(-50%) translateY(8px); animation: panel-in 500ms ease-out forwards; text-align: center; color: #6d3c1e; }
.loading-panel h1 { margin: 0 0 clamp(15px, 2vh, 20px); font: 600 clamp(20px, 1.8vw, 32px)/1.2 Georgia, 'Songti SC', serif; letter-spacing: .08em; text-shadow: 0 1px 1px rgba(255,245,218,.8); }
.title-dots { display: inline-block; width: 1.6em; text-align: left; }
.loading-track { position: relative; width: clamp(300px, 30vw, 620px); height: clamp(18px, 2.3vh, 24px); margin: 0 auto; overflow: hidden; border: 2px solid #73401e; border-radius: 999px; background: rgba(114, 65, 32, .14); box-shadow: inset 0 2px 5px rgba(75, 36, 13, .28), 0 1px 0 rgba(255,255,255,.7); }
.loading-fill { position: relative; height: 100%; min-width: 0; overflow: hidden; border-radius: inherit; background-image: url('../../加载动画所用材质.png'); background-repeat: repeat-x; background-size: auto 100%; animation: texture-flow 1.6s ease-in-out infinite; transition: width 80ms linear; }
.loading-sheen { position: absolute; inset: 0; width: 38%; background: linear-gradient(105deg, transparent, rgba(255,246,205,.35), transparent); animation: sheen 2.8s ease-in-out infinite; }
.loading-percent { margin-top: 10px; font: 700 clamp(18px, 1.65vw, 28px)/1.1 Georgia, 'Songti SC', serif; letter-spacing: .08em; }
.loading-message { min-height: 1.5em; margin: 9px 0 0; font: 500 clamp(14px, 1.08vw, 20px)/1.4 'Songti SC', 'STSong', serif; letter-spacing: .08em; transition: opacity 250ms ease; }
@keyframes panel-in { to { transform: translateX(-50%) translateY(0); } }
@keyframes texture-flow { 0%,100% { background-position-x: 0; } 50% { background-position-x: 30px; } }
@keyframes sheen { 0%, 35% { transform: translateX(-180%); opacity: 0; } 48% { opacity: .8; } 70%,100% { transform: translateX(300%); opacity: 0; } }
@media (max-width: 700px) { .loading-panel { width: 92vw; bottom: 8%; } .loading-track { width: min(78vw, 420px); } }
@media (prefers-reduced-motion: reduce) { .game-loading, .loading-fill, .loading-sheen { animation: none; transition-duration: .01ms; } }
</style>
