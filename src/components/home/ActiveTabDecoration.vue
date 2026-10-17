<script setup>
defineProps({ active: Boolean, id: { type: String, required: true } })
</script>

<template>
  <span class="tab-decoration" :class="{ 'is-active': active }" aria-hidden="true">
    <span class="tab-glow" />
    <svg class="gold-ornament" viewBox="0 0 120 16" fill="none">
      <defs>
        <linearGradient :id="id" x1="0" y1="8" x2="120" y2="8" gradientUnits="userSpaceOnUse">
          <stop stop-color="#bc8738" stop-opacity=".15" />
          <stop offset=".35" stop-color="#be832a" />
          <stop offset=".5" stop-color="#ffe5a0" />
          <stop offset=".65" stop-color="#be832a" />
          <stop offset="1" stop-color="#bc8738" stop-opacity=".15" />
        </linearGradient>
      </defs>
      <g class="engraved-line" :stroke="`url(#${id})`" stroke-width="1.1" stroke-linecap="round">
        <path d="M1 8H49M71 8H119M12 8Q22 2 32 8M88 8Q98 2 108 8M24 8Q34 12 44 8M76 8Q86 12 96 8" />
      </g>
      <g class="jewel-appear">
        <g class="jewel">
          <path d="M60 1 67 8 60 15 53 8Z" fill="#267a78" stroke="#c08b36" stroke-width="1.3" />
          <path d="M60 3.8 64.2 8 60 12.2 55.8 8Z" stroke="#edd18b" stroke-width=".65" />
          <path d="m60 6 2 2-2 2-2-2Z" fill="#ffe8ac" />
        </g>
      </g>
    </svg>
  </span>
</template>

<style scoped>
.tab-decoration { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 140ms ease; }
.tab-decoration.is-active { opacity: 1; }
.tab-glow { position: absolute; inset: 0 10% 13%; background: radial-gradient(ellipse, #f3bb522b, #f3bb5210 42%, transparent 72%); opacity: 0; transition: opacity 300ms ease; mix-blend-mode: soft-light; }
.is-active .tab-glow { opacity: 1; }
.gold-ornament { position: absolute; width: 60%; height: auto; left: 20%; bottom: 1%; overflow: visible; }
.engraved-line { transform-origin: 60px 8px; transform: scaleX(0); transition: transform 240ms cubic-bezier(.22,.61,.36,1) 35ms; }
.is-active .engraved-line { transform: scaleX(1); }
.jewel-appear { opacity: 0; transition: opacity 150ms ease 130ms; }
.is-active .jewel-appear { opacity: 1; }
.is-active .jewel { animation: jewel-breathe 3.6s ease-in-out 300ms infinite; }
@keyframes jewel-breathe { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.13); } }
@media (prefers-reduced-motion: reduce) { .tab-decoration, .tab-glow, .engraved-line, .jewel-appear { transition: none; } .is-active .jewel { animation: none; } }
</style>
