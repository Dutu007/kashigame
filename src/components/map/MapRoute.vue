<script setup>
const dots = [
  [42, 54, 0], [36, 55, .3], [31, 55, .6], [24, 45, .9], [19, 38, 1.2],
  [18, 61, 1.5], [24, 67, 1.8], [31, 53, 2.1], [36, 34, 2.4], [45, 25, 2.7],
  [56, 29, 3], [63, 31, 3.3], [68, 43, 3.6], [72, 57, 3.9], [77, 68, 4.2],
  [83, 56, 4.5], [87, 45, 4.8], [88, 30, 5.1], [87, 20, 5.4],
]
</script>

<template>
  <svg class="map-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <path class="route-shadow" d="M46 52 C39 56 33 56 28 55 C23 50 20 39 17 32 C16 47 18 61 20 69 C27 65 33 45 39 24 C48 25 56 30 65 31 C69 39 69 47 70 53 C74 59 77 66 78 72 C84 63 87 50 88 38 C87 29 86 19 86 10" />
    <path class="route-glow" d="M46 52 C39 56 33 56 28 55 C23 50 20 39 17 32 C16 47 18 61 20 69 C27 65 33 45 39 24 C48 25 56 30 65 31 C69 39 69 47 70 53 C74 59 77 66 78 72 C84 63 87 50 88 38 C87 29 86 19 86 10" />
    <g class="route-dots">
      <circle v-for="dot in dots" :key="`${dot[0]}-${dot[1]}`" :cx="dot[0]" :cy="dot[1]" r=".72" :style="{ animationDelay: `${dot[2]}s` }" />
    </g>
  </svg>
</template>

<style scoped>
.map-route { position: absolute; inset: 0; z-index: 2; width: 100%; height: 100%; overflow: visible; pointer-events: none; opacity: .55; }
.map-route path { fill: none; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.route-shadow { stroke: rgba(103, 53, 20, .2); stroke-width: 5; stroke-dasharray: 1 18; }
.route-glow { stroke: rgba(222, 163, 74, .8); stroke-width: 1.8; stroke-dasharray: 7 12; animation: route-move 4.5s linear infinite; filter: drop-shadow(0 0 2px rgba(244, 190, 97, .55)); }
.route-dots circle { fill: #d59b45; opacity: .55; transform-box: fill-box; transform-origin: center; animation: route-dot 2.4s ease-in-out infinite; filter: drop-shadow(0 0 2px rgba(238, 183, 91, .5)); }
@keyframes route-move { to { stroke-dashoffset: -38; } }
@keyframes route-dot { 0%, 100% { opacity: .42; transform: scale(.82); } 50% { opacity: 1; transform: scale(1.18); } }
@media (prefers-reduced-motion: reduce) { .route-glow, .route-dots circle { animation: none; } }
</style>
