<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  destination: { type: String, default: '织梦巷' },
  ready: { type: Boolean, default: true },
})
const emit = defineEmits(['complete', 'reveal'])
const transitionUrl = `${import.meta.env.BASE_URL}game/shared/map-transition/index.html?v=smooth-2`
const visualReady = ref(false)
const isLeaving = ref(false)
let cycleFinished = false
let cycleTimer = null
let leaveTimer = null

function finish() {
  if (!props.ready || !cycleFinished || isLeaving.value) return
  emit('reveal')
  isLeaving.value = true
  leaveTimer = window.setTimeout(() => emit('complete'), 350)
}

async function startCycle(event) {
  const frame = event.target
  await frame.contentWindow.transitionReady
  visualReady.value = true
  frame.contentWindow.startTransition()
  if (cycleTimer !== null) return
  cycleTimer = window.setTimeout(() => {
    cycleFinished = true
    finish()
  }, 3400)
}

watch(() => props.ready, finish)
onBeforeUnmount(() => {
  window.clearTimeout(cycleTimer)
  window.clearTimeout(leaveTimer)
})
</script>

<template>
  <main class="game-loading" :class="{ 'is-visible': visualReady, 'is-leaving': isLeaving }" :aria-label="`正在前往${destination}`" aria-busy="true">
    <iframe :src="transitionUrl" title="喀什小镇织结转场" tabindex="-1" aria-hidden="true" @load="startCycle" />
    <span class="loading-description" role="status">正在前往{{ destination }}……</span>
  </main>
</template>

<style scoped>
.game-loading { position: relative; display: grid; place-items: center; width: 100vw; height: 100dvh; overflow: hidden; background: #16110c; opacity: 0; transition: opacity 350ms ease; }
.game-loading.is-visible { opacity: 1; }
.game-loading.is-leaving { opacity: 0; }
.game-loading iframe { display: block; width: 100%; height: 100%; border: 0; pointer-events: none; }
.loading-description { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .game-loading { transition: none; } }
</style>
