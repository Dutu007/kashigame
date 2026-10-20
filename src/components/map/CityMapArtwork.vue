<script setup>
import { useId } from 'vue'
import { mapArt, mapVisuals, protectedRegions } from '../../data/mapVisuals'
defineProps({ levels: Array, activeId: Number })
const emit = defineEmits(['enter', 'leave', 'select'])
const uid = useId().replace(/:/g, '')
const id = name => `${uid}-${name}`
const url = name => `url(#${id(name)})`
</script>

<template>
  <svg class="city-artwork" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="街巷相连的喀什古城地图">
    <defs>
      <filter :id="id('feather')" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation=".22 .39" /></filter>
      <filter :id="id('edge')" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".19 .34" /></filter>
      <mask :id="id('preserve')" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
        <polygon v-for="points in protectedRegions" :key="points" :points="points" fill="white" :filter="url('feather')" />
      </mask>
      <g :id="id('scene')">
        <image :href="mapArt.cityUrl" width="100" height="100" preserveAspectRatio="none" />
      </g>
      <radialGradient :id="id('warm')"><stop stop-color="#ffe1a1" stop-opacity=".6" /><stop offset="1" stop-color="#ffe1a1" stop-opacity="0" /></radialGradient>
      <radialGradient :id="id('water')"><stop stop-color="#a2ded4" stop-opacity=".55" /><stop offset="1" stop-color="#a2ded4" stop-opacity="0" /></radialGradient>
      <template v-for="level in levels" :key="level.id">
        <clipPath :id="id('clip-' + level.id)"><polygon :points="mapVisuals[level.id].points" /></clipPath>
        <mask :id="id('soft-' + level.id)" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><polygon :points="mapVisuals[level.id].points" fill="white" :filter="url('feather')" /></mask>
      </template>
    </defs>
    <use :href="'#' + id('scene')" class="city-base" />
    <g v-for="level in levels" :key="level.id" class="district" :class="[mapVisuals[level.id].theme, { awake: activeId === level.id }]" :data-region="level.id" aria-hidden="true" pointer-events="none">
      <g class="district-light" :mask="url('soft-' + level.id)"><use :href="'#' + id('scene')" class="bright-art" /></g>
      <polygon class="district-halo" :points="mapVisuals[level.id].points" :filter="url('edge')" />
      <g class="ambient" :clip-path="url('clip-' + level.id)">
        <g class="ambient-breathe">
          <ellipse v-for="(light, index) in mapVisuals[level.id].lights" :key="index" :cx="light[0]" :cy="light[1]" :rx="light[2]" :ry="light[3]" :fill="url(level.id === 2 ? 'water' : 'warm')" />
          <path v-for="path in mapVisuals[level.id].threads" :key="path" class="cloth-light" :d="path" />
        </g>
        <ellipse v-for="(well, index) in mapVisuals[level.id].wells" :key="index" class="water-glint" :cx="well[0]" :cy="well[1]" rx="1" ry=".3" :style="{ '--offset': index * -.8 + 's' }" />
        <path v-if="mapVisuals[level.id].heat" class="kiln-heat" :d="mapVisuals[level.id].heat" />
      </g>
    </g>
    <g aria-hidden="true" pointer-events="none">
      <ellipse v-for="level in levels" :key="level.id" class="plaque-wake" :class="{ lit: activeId === level.id }" :cx="level.x" :cy="level.y" rx="8" ry="4" :fill="url('warm')" />
    </g>
    <g class="hotspots" aria-hidden="true">
      <polygon v-for="level in levels" :key="level.id" :data-hit="level.id" class="region-hit" :points="mapVisuals[level.id].points" @pointerenter="emit('enter', level)" @pointerleave="emit('leave', level.id)" @pointercancel="emit('leave', level.id)" @click="emit('select', level)" />
    </g>
  </svg>
</template>

<style scoped>
.city-artwork { display: block; width: 100%; height: 100%; }
.region-hit { fill: transparent; cursor: pointer; pointer-events: all; }
.chapter-beacon { opacity: .65; transition: opacity 300ms ease; }
.chapter-beacon.is-active { opacity: 1; }
.beacon-pulse { animation: beacon-breathe 3.2s ease-in-out infinite; animation-delay: var(--phase); }
.beacon-ring { fill: none; stroke-linecap: round; stroke-linejoin: round; transition: stroke-width 300ms ease, opacity 300ms ease; }
.beacon-bloom { stroke: #ffd58a; stroke-width: .65; opacity: .6; }
.beacon-tail { stroke: #ffe0a0; stroke-width: .2; opacity: .65; }
.beacon-tip { stroke: #fff4d4; stroke-width: .09; opacity: .8; }
.is-active .beacon-bloom { stroke-width: 1; opacity: .9; }
.is-active .beacon-tail { stroke-width: .3; opacity: .85; }
.is-active .beacon-tip { stroke-width: .14; opacity: 1; }
@keyframes beacon-breathe { 0%, 100% { opacity: .5; } 50% { opacity: .95; } }
.district-light, .district-halo, .ambient { opacity: 0; transition: opacity 350ms ease-out; }
.bright-art { filter: brightness(1.04) saturate(1.07); }
.awake .district-light { opacity: 1; transition-duration: 180ms; }
.district-halo { fill: none; stroke: #ffe5b4; stroke-width: .32; stroke-linejoin: round; }
.awake .district-halo { opacity: 0; transition-delay: 150ms; }
.awake .ambient { opacity: 1; transition-delay: 650ms; }
.cloth-light { fill: none; stroke: #f6d6a0; stroke-width: .12; opacity: .38; }
.water-glint { fill: none; stroke: #a8d9cf; stroke-width: .08; opacity: .25; }
.kiln-heat { fill: none; stroke: #f7ddb5; stroke-width: .15; opacity: .16; filter: blur(.06px); }
.awake .ambient-breathe { animation: memory-breathe 3.2s 650ms ease-in-out infinite; }
.awake .water-glint { animation: well-shimmer 3.4s ease-in-out infinite; animation-delay: var(--offset); }
.awake .kiln-heat { animation: kiln-warmth 3.6s 650ms ease-in-out infinite; }
@keyframes memory-breathe { 0%, 100% { opacity: .45; } 50% { opacity: .85; } }
@keyframes well-shimmer { 0%, 100% { opacity: .12; stroke-dasharray: 1 3; stroke-dashoffset: 0; } 50% { opacity: .35; stroke-dashoffset: 2; } }
@keyframes kiln-warmth { 0%, 100% { opacity: .08; transform: translateY(0); } 50% { opacity: .22; transform: translateY(-.35px); } }
@media (prefers-reduced-motion: reduce) {
  .beacon-pulse { animation: none; opacity: .7; }
  .beacon-ring { transition: none; }
  .chapter-beacon { transition: none; opacity: .55; }
  .district-light, .district-halo, .ambient { transition: none !important; }
  .awake .ambient-breathe, .awake .water-glint, .awake .kiln-heat { animation: none; }
}
.plaque-wake { opacity:0; transition:opacity 240ms ease; }
.plaque-wake.lit { opacity:.24; transition-duration:180ms; }
</style>
