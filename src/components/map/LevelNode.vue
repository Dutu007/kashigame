<script setup>
import { computed } from 'vue'

const props = defineProps({
  level: { type: Object, required: true },
  hovered: Boolean,
  selected: Boolean,
})

defineEmits(['hover', 'leave', 'select'])

const nodeStyle = computed(() => ({
  '--level-x': `${props.level.x}%`,
  '--level-y': `${props.level.y}%`,
  '--float-duration': props.level.float,
  '--enter-delay': `${props.level.delay}ms`,
}))
</script>

<template>
  <button
    class="level-node"
    :class="[`is-${level.status}`, { 'is-selected': selected, 'is-hovered': hovered }]"
    :style="nodeStyle"
    type="button"
    :aria-label="`${level.title}，${level.subtitle}`"
    @mouseenter="$emit('hover', level.id)"
    @mouseleave="$emit('leave')"
    @focus="$emit('hover', level.id)"
    @blur="$emit('leave')"
    @click="$emit('select', level)"
  >
    <span v-if="level.id === 1" class="current-ring" aria-hidden="true" />
    <span class="node-art">
      <img :src="level.image" :alt="level.title" draggable="false" />
      <span v-if="level.status === 'developing'" class="node-status">探索中</span>
      <span v-else class="node-status is-ready">起点</span>
    </span>
    <span class="level-caption">
      <strong>{{ level.title }}</strong>
      <small>{{ level.subtitle }}</small>
    </span>
    <span class="level-info" :class="{ 'is-visible': hovered || selected }">
      <strong>{{ level.title }}</strong>
      <small>{{ level.detail }}</small>
      <em>{{ level.status === 'available' ? '点击进入 · 旅程已开启' : '新的故事正在准备中……' }}</em>
    </span>
  </button>
</template>

<style scoped>
.level-node { --node-width: clamp(108px, 10vw, 174px); position: absolute; left: var(--level-x); top: var(--level-y); z-index: 3; width: var(--node-width); padding: 0; border: 0; color: #5e3219; background: transparent; cursor: pointer; transform: translate(-50%, -50%); animation: node-in 560ms cubic-bezier(.22,.61,.36,1) var(--enter-delay) both, level-float var(--float-duration) ease-in-out calc(var(--enter-delay) + 650ms) infinite; transition: filter .45s cubic-bezier(.22,.61,.36,1), opacity .35s ease, transform .3s cubic-bezier(.22,.61,.36,1); }
.level-node::before { content: ''; position: absolute; inset: -6px; z-index: -1; border: 1px solid rgba(230, 180, 90, .52); border-radius: 44% 56% 49% 51% / 52% 44% 56% 48%; opacity: 0; transform: scale(.96); transition: opacity .35s ease, transform .35s ease; animation: border-pulse 1.8s ease-in-out infinite; }
.level-node::after { content: ''; position: absolute; inset: 5% -10%; z-index: 2; pointer-events: none; opacity: 0; background: linear-gradient(105deg, transparent 28%, rgba(255, 238, 190, .2) 48%, transparent 67%); transform: translateX(-125%); transition: opacity .15s; }
.level-node:hover, .level-node:focus-visible, .level-node.is-selected { z-index: 8; filter: drop-shadow(0 12px 20px rgba(69, 33, 12, .28)) drop-shadow(0 0 12px rgba(224, 163, 71, .32)); animation-play-state: paused; transform: translate(-50%, calc(-50% - 8px)) scale(1.04); }
.level-node:hover::before, .level-node:focus-visible::before, .level-node.is-selected::before { opacity: 1; transform: scale(1.02); }
.level-node:hover::after, .level-node:focus-visible::after { opacity: 1; transform: translateX(125%); transition: transform .8s ease, opacity .15s; }
.level-node:active { transform: translate(-50%, calc(-50% - 5px)) scale(.97); }
.level-node:focus-visible { outline: 2px solid rgba(255, 215, 141, .9); outline-offset: 5px; }
.node-art { position: relative; display: block; aspect-ratio: 4 / 3; overflow: hidden; border: 2px solid #d49a45; border-radius: 43% 57% 51% 49% / 52% 44% 56% 48%; background: rgba(255, 237, 194, .26); box-shadow: 0 8px 20px rgba(70, 35, 15, .22), 0 0 14px rgba(220, 160, 70, .22), inset 0 0 0 2px rgba(255, 220, 150, .35); transition: transform .45s cubic-bezier(.22,.61,.36,1), box-shadow .45s ease; }
.node-art::before { content: ''; position: absolute; inset: 3px; z-index: 2; border: 1px solid rgba(255, 220, 150, .45); border-radius: inherit; pointer-events: none; }
.node-art img { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: inherit; mix-blend-mode: multiply; transition: transform .5s cubic-bezier(.22,.61,.36,1), filter .45s ease; }
.level-node:hover .node-art, .level-node:focus-visible .node-art, .level-node.is-selected .node-art { transform: scale(1.04); box-shadow: 0 12px 28px rgba(70, 35, 15, .32), 0 0 22px rgba(230, 170, 70, .4), inset 0 0 0 2px rgba(255, 230, 169, .65); }
.level-node:hover .node-art img, .level-node:focus-visible .node-art img, .level-node.is-selected .node-art img { transform: scale(1.06); filter: saturate(1.06); }
.is-developing .node-art img { filter: saturate(.7) brightness(.92); }
.node-status { position: absolute; right: 5%; bottom: 5px; z-index: 3; padding: 2px 7px; border: 1px solid rgba(126, 65, 24, .45); border-radius: 999px; color: #fff0cf; background: #9d5425; box-shadow: 0 2px 5px rgba(67, 31, 12, .2); font: 700 clamp(9px, .65vw, 11px)/1.2 'Songti SC', serif; letter-spacing: .08em; }
.node-status.is-ready { background: #b9752d; }
.level-caption { display: block; margin-top: 5px; text-shadow: 0 1px rgba(255, 238, 196, .9); }
.level-caption strong, .level-caption small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.level-caption strong { font: 700 clamp(11px, .82vw, 15px)/1.25 Georgia, 'Songti SC', serif; }
.level-caption small { margin-top: 2px; font: 500 clamp(9px, .62vw, 12px)/1.2 'Songti SC', serif; opacity: .86; }
.level-info { position: absolute; left: 50%; top: calc(100% + 12px); width: clamp(170px, 16vw, 230px); padding: 10px 12px; border: 1px solid rgba(140, 77, 29, .52); border-radius: 8px 5px 7px 4px; color: #603319; background: rgba(255, 237, 201, .96); box-shadow: 0 6px 16px rgba(70, 35, 15, .2), inset 0 0 0 1px rgba(255, 215, 149, .45); opacity: 0; pointer-events: none; transform: translate(-50%, 8px); transition: opacity .25s ease, transform .25s ease; }
.level-info::before { content: ''; position: absolute; top: -6px; left: 50%; width: 10px; height: 10px; border-top: 1px solid rgba(140, 77, 29, .52); border-left: 1px solid rgba(140, 77, 29, .52); background: rgba(255, 237, 201, .96); transform: translateX(-50%) rotate(45deg); }
.level-info.is-visible { opacity: 1; transform: translate(-50%, 0); }
.level-info strong, .level-info small, .level-info em { display: block; }
.level-info strong { font: 700 14px/1.25 Georgia, 'Songti SC', serif; }
.level-info small { margin-top: 3px; font: 12px/1.4 'Songti SC', serif; }
.level-info em { margin-top: 6px; color: #9a5927; font: 11px/1.3 'Songti SC', serif; font-style: normal; }
.current-ring { position: absolute; inset: -12px; z-index: -2; border: 2px solid rgba(225, 166, 76, .48); border-radius: 46% 54% 51% 49% / 52% 45% 55% 48%; animation: current-pulse 2.2s ease-in-out infinite; pointer-events: none; }
@keyframes node-in { from { opacity: 0; transform: translate(-50%, -50%) scale(.88); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
@keyframes level-float { 0%, 100% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-5px); } }
@keyframes border-pulse { 0%, 100% { opacity: .35; transform: scale(1); } 50% { opacity: .7; transform: scale(1.02); } }
@keyframes current-pulse { 0%, 100% { opacity: .35; transform: scale(1); } 50% { opacity: 0; transform: scale(1.08); } }
@media (max-width: 700px) { .level-node { --node-width: clamp(86px, 18vw, 132px); } .level-info { width: 165px; } .level-caption small { display: none; } }
@media (prefers-reduced-motion: reduce) { .level-node, .level-node::before, .level-node::after, .current-ring { animation: none; transition: none; } }
</style>
