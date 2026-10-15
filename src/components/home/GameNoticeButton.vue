<script setup>
import { ref } from 'vue'
import noticeLogo from '../../assets/processed/notice-icon-transparent.png'

const button = ref(null)
defineEmits(['click'])
defineExpose({ focus: () => button.value?.focus() })
</script>

<template>
  <button ref="button" class="notice-button" type="button" aria-label="查看游戏玩法公告" @click="$emit('click')">
    <img class="notice-logo" :src="noticeLogo" alt="" aria-hidden="true" />
  </button>
</template>

<style scoped>
.notice-button { position: absolute; top: clamp(120px, 15vh, 180px); right: clamp(24px, 3vw, 58px); z-index: 24; display: grid; place-items: center; width: 96px; height: 96px; padding: 0; border: 0; background: transparent; cursor: pointer; opacity: .96; transform: translateY(0) scale(1); transition: transform 280ms cubic-bezier(.22,.61,.36,1), filter 280ms ease; animation: notice-breathe 2.5s ease-in-out 2; }
.notice-button:hover, .notice-button:focus-visible { opacity: 1; filter: brightness(1.08) drop-shadow(0 5px 9px rgba(70, 35, 15, .32)); transform: translateY(-2px) scale(1.06); }
.notice-button:focus-visible { outline: 2px solid rgba(255, 223, 155, .92); outline-offset: 4px; }
.notice-logo { display: block; width: 100%; height: 100%; object-fit: contain; }
@keyframes notice-breathe { 0%, 100% { filter: drop-shadow(0 2px 4px rgba(70,35,15,.12)); } 50% { filter: drop-shadow(0 5px 9px rgba(70,35,15,.3)); } }
@media (max-width: 700px) { .notice-button { top: 11vh; right: 18px; width: 78px; height: 78px; } }
@media (prefers-reduced-motion: reduce) { .notice-button { animation: none; transition: none; } }
</style>
