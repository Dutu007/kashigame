<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { memoryPlaques } from '../../data/memoryPlaques'
const props = defineProps({ level: Object })
const card = ref(null)
const position = ref({ left: '0px', top: '0px', visibility: 'hidden' })
const theme = computed(() => memoryPlaques[props.level.id])
const numbers = ['一', '二', '三', '四', '五']
let observer, frame
function place() {
  const anchor = document.getElementById(`level-${props.level.id}`)
  if (!anchor || !card.value) return
  const a = anchor.getBoundingClientRect(), c = card.value.getBoundingClientRect()
  const w = window.innerWidth, h = window.innerHeight, gap = 16, margin = 12
  const candidates = [
    { x: a.left + (a.width-c.width)/2, y: a.top-c.height-gap },
    { x: a.right+gap, y: a.top+(a.height-c.height)/2 },
    { x: a.left-c.width-gap, y: a.top+(a.height-c.height)/2 },
    { x: a.left+(a.width-c.width)/2, y: a.bottom+gap },
  ]
  // Reserve the map title's upper strip; clamp against the visible viewport.
  const top = Math.min(110, h * .14)
  const best = candidates.find(p => p.x >= margin && p.x+c.width <= w-margin && p.y >= top && p.y+c.height <= h-margin) || candidates[1]
  position.value = { left: `${Math.max(margin, Math.min(w-c.width-margin,best.x))}px`, top: `${Math.max(margin, Math.min(h-c.height-margin,best.y))}px`, visibility: 'visible' }
}
function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(place) }
watch(() => props.level.id, () => nextTick(schedule))
onMounted(() => {
  observer = new ResizeObserver(schedule)
  observer.observe(card.value)
  const map = document.querySelector('.map-container')
  if (map) observer.observe(map)
  window.addEventListener('resize', schedule)
  window.addEventListener('scroll', schedule, true)
  place()
})
onBeforeUnmount(() => { observer?.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('resize', schedule); window.removeEventListener('scroll', schedule, true) })
</script>
<template>
  <aside ref="card" id="memory-plaque" role="tooltip" class="memory-plaque" :style="{ ...position, '--accent': theme.accent }">
    <svg v-for="corner in ['tl','tr','bl','br']" :key="corner" class="corner" :class="corner" viewBox="0 0 32 32" aria-hidden="true"><path d="M3 28V8q0-5 5-5h20M8 24V12q0-4 4-4h12"/><path class="inlay" d="m12 12 5-5 5 5-5 5Z"/></svg>
    <svg class="theme-motif" viewBox="0 0 60 54" aria-hidden="true"><path :d="theme.motif" /></svg>
    <p class="category reveal">第{{ numbers[level.id-1] }}关 · {{ level.subtitle }}</p>
    <h2 class="reveal">{{ level.title }}</h2>
    <p class="description reveal">{{ theme.description }}</p>
    <p class="action reveal">{{ level.chapter ? '进入关卡' : '欣赏风景 · 玩法待开放' }}<svg viewBox="0 0 28 12" aria-hidden="true"><path d="M1 6h24m-5-4 5 4-5 4"/></svg></p>
    <!-- Interim geometric weave: replace with an approved Atlas textile pattern. -->
    <svg class="woven-hem" viewBox="0 0 280 6" preserveAspectRatio="none" aria-hidden="true"><path d="M0 3Q7-2 14 3T28 3T42 3T56 3T70 3T84 3T98 3T112 3T126 3T140 3T154 3T168 3T182 3T196 3T210 3T224 3T238 3T252 3T266 3T280 3"/><path d="M0 3Q7 8 14 3T28 3T42 3T56 3T70 3T84 3T98 3T112 3T126 3T140 3T154 3T168 3T182 3T196 3T210 3T224 3T238 3T252 3T266 3T280 3"/></svg>
  </aside>
</template>
<style scoped>
.memory-plaque { --wood:#70492f; --gold:#b58a50; position:fixed; z-index:25; box-sizing:border-box; width:min(320px,calc(100vw - 24px)); padding:27px 28px 26px; pointer-events:none; color:var(--wood); border:1px solid #70492fcc; border-radius:5px 14px 5px 14px; background:radial-gradient(ellipse at 40% 25%,#fff9e980,transparent 75%),repeating-linear-gradient(0deg,#84623c04 0 1px,transparent 1px 4px),repeating-linear-gradient(90deg,#84623c04 0 1px,transparent 1px 5px),#f4e9d5; box-shadow:0 8px 22px #4c30232b,inset 0 1px #fff8e9; transform-origin:center; }
.memory-plaque::before { content:''; position:absolute; left:30px; right:30px; top:9px; height:1px; background:#b58a5055; }
.corner { position:absolute; width:27px; height:27px; fill:none; stroke:var(--gold); stroke-width:1; }
.tl { top:5px; left:5px; }.tr { top:5px; right:5px; transform:rotate(90deg); }.br { bottom:5px; right:5px; transform:rotate(180deg); }.bl { bottom:5px; left:5px; transform:rotate(270deg); }
.inlay { fill:var(--accent); fill-opacity:.28; stroke:var(--accent); stroke-opacity:.6; }
.theme-motif { position:absolute; right:23px; top:25px; width:40px; height:40px; fill:none; stroke:var(--accent); stroke-width:1.2; stroke-linecap:round; stroke-linejoin:round; opacity:.65; }
.category { margin:0 35px 7px 0; font:500 12px/1.6 'Songti SC',serif; color:#947b60; }
h2 { margin:0 25px 14px 0; color:var(--accent); font:600 25px/1.35 'Songti SC',serif; letter-spacing:.04em; }
.description { margin:0; font:15px/1.75 'Songti SC',serif; min-height:52px; }
.action { margin:17px 0 0; padding-top:12px; border-top:1px solid #b58a5045; display:flex; align-items:center; justify-content:space-between; font:13px/1.5 'Songti SC',serif; }
.action svg { width:25px; height:12px; fill:none; stroke:var(--wood); stroke-width:1.2; }
.woven-hem { position:absolute; bottom:11px; left:30px; width:calc(100% - 60px); height:5px; fill:none; stroke:#b58a50; stroke-width:1; opacity:.5; }.woven-hem path+path { stroke:var(--accent); }
.reveal { animation:copy-in 220ms both; }.category { animation-delay:300ms; }h2 { animation-delay:350ms; }.description { animation-delay:400ms; }.action { animation-delay:450ms; }
.corner { animation:corner-light 250ms 600ms both; }
@keyframes copy-in { from { opacity:0; translate:0 3px; } to { opacity:1; translate:0 0; } }
@keyframes corner-light { 0%,100% { opacity:.65; } 50% { opacity:1; } }
@media(prefers-reduced-motion:reduce) { .reveal,.corner { animation:none; } }
</style>
