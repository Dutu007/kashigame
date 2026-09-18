<script setup>
import { onMounted } from 'vue'

defineProps({ item: { type: Object, required: true } })
defineEmits(['close'])

onMounted(() => {
  // 线索入手的清脆拾取音效，与"放大+高亮"同时发生
  const pickup = new Audio('/assets/audio/pickup.wav')
  pickup.volume = 0.8
  pickup.preload = 'auto'
  pickup.setAttribute('data-pickup', 'true')
  document.body.appendChild(pickup)
  pickup.play().catch((error) => {
    console.warn('[pickup] play blocked:', error)
  })
})
</script>

<template>
  <div class="modal-layer culture-layer">
    <section class="culture-card" role="dialog" aria-labelledby="culture-title">
      <div v-if="item.image" class="culture-card__item">
        <span class="culture-card__glow" aria-hidden="true"></span>
        <img :src="item.image" :alt="item.title" />
      </div>
      <small>获得文化线索</small>
      <h2 id="culture-title">{{ item.title }}</h2>
      <p class="culture-card__description">{{ item.description }}</p>
      <div class="culture-card__lesson">
        <b>文化讲解</b>
        <p>{{ item.culture }}</p>
      </div>
      <footer>
        <span>{{ item.source }}</span>
        <button type="button" class="primary-button compact" @click="$emit('close')">收下线索</button>
      </footer>
    </section>
  </div>
</template>
