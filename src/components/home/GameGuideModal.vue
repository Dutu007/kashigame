<script setup>
import { nextTick, onMounted, ref } from 'vue'
import notice1 from '../../../首页公告1.png'
import notice2 from '../../../首页公告2.png'
import notice3 from '../../../首页公告3.png'
import notice4 from '../../../首页公告4.png'
import notice5 from '../../../首页公告5.png'
import ActiveTabDecoration from './ActiveTabDecoration.vue'

const emit = defineEmits(['close'])
const closeButton = ref(null)
const activeNotice = ref(0)
// Coordinates in the original 1499 × 1049 artwork, not the viewport.
const notices = [
  { image: notice1, label: '游戏简介', x: 284 },
  { image: notice2, label: '如何游玩', x: 534 },
  { image: notice3, label: '地图探索', x: 764 },
  { image: notice4, label: '文化关卡', x: 988 },
  { image: notice5, label: '操作说明', x: 1214 },
]
function tabStyle(tab) {
  return { left: `${(tab.x - 100) / 1499 * 100}%`, top: `${250 / 1049 * 100}%`, width: `${200 / 1499 * 100}%`, height: `${56 / 1049 * 100}%` }
}

function selectNotice(index) { activeNotice.value = index }
function close() { emit('close') }
onMounted(() => nextTick(() => closeButton.value?.focus()))
</script>

<template>
  <div class="guide-overlay" role="presentation" @click.self="close">
    <section class="guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" @keydown.esc.stop.prevent="close">
      <h2 id="guide-title" class="sr-only">《喀什小镇》玩法导览</h2>
      <div class="guide-artboard">
        <div id="guide-page" role="tabpanel" :aria-labelledby="`guide-tab-${activeNotice}`">
          <img v-for="(notice, index) in notices" :key="notice.label" class="guide-image" :class="{ 'is-visible': activeNotice === index }" :src="notice.image" :alt="`《喀什小镇》${notice.label}公告`" :aria-hidden="activeNotice !== index" draggable="false" />
        </div>
        <div class="guide-tabs" role="tablist" aria-label="玩法导览栏目">
          <button v-for="(notice, index) in notices" :id="`guide-tab-${index}`" :key="notice.label" class="guide-tab" :style="tabStyle(notice)" :class="{ 'is-active': activeNotice === index }" type="button" role="tab" :aria-label="notice.label" aria-controls="guide-page" :aria-selected="activeNotice === index" @click="selectNotice(index)">
            <span class="sr-only">{{ notice.label }}</span>
            <ActiveTabDecoration :id="`tab-gold-${index}`" :active="activeNotice === index" />
          </button>
        </div>
        <button ref="closeButton" class="guide-close" type="button" aria-label="关闭玩法导览" @click="close"><span aria-hidden="true">×</span></button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.guide-overlay { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 3vh 3vw; background: rgba(35,20,10,.48); backdrop-filter: blur(4px); animation: guide-overlay-in 240ms ease-out both; }
.guide-modal { position: relative; width: min(1100px, 94vw, calc(94dvh * 1499 / 1049)); animation: guide-modal-in 360ms cubic-bezier(.22,.61,.36,1) both; }
.guide-artboard { position: relative; aspect-ratio: 1499 / 1049; filter: drop-shadow(0 18px 28px rgba(45,25,10,.3)); }
.guide-image { position: absolute; inset: 0; display: block; width: 100%; height: 100%; opacity: 0; pointer-events: none; transition: opacity 220ms ease; }
.guide-image.is-visible { opacity: 1; }
.guide-tabs { position: absolute; inset: 0; pointer-events: none; }
.guide-tab { position: absolute; padding: 0; border: 0; background: transparent; cursor: pointer; pointer-events: auto; }
.guide-tab::before { content: ''; position: absolute; inset: 0 12% 15%; border-radius: 50%; background: radial-gradient(ellipse, #ffd78626, transparent 70%); opacity: 0; transition: opacity 140ms ease; }
.guide-tab:hover::before, .guide-tab:focus-visible::before { opacity: 1; }
.guide-tab:focus-visible { outline: 1px dashed #ae792c; outline-offset: 2px; border-radius: 50%; }
.guide-close { position: absolute; top: 7.5%; right: 4%; z-index: 3; width: 4.7%; aspect-ratio: 1; padding: 0; border: 0; border-radius: 50%; color: transparent; background: transparent; cursor: pointer; }
.guide-close:hover, .guide-close:focus-visible { background: rgba(255,226,151,.2); box-shadow: 0 0 12px rgba(255,180,54,.38); }
.guide-close:focus-visible { outline: 2px solid rgba(255,239,180,.95); outline-offset: 3px; }
.guide-close span { position: absolute; inset: 0; opacity: 0; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@keyframes guide-overlay-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes guide-modal-in { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (prefers-reduced-motion: reduce) { .guide-overlay, .guide-modal { animation: none; } .guide-image, .guide-tab::before, .guide-close { transition: none; } }
</style>
