<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { playAmbient, stopAmbient } from '../game/ambientAudio.js'

defineProps({
  scene: { type: Object, required: true },
  portrait: { type: String, required: true },
})
defineEmits(['complete'])

onMounted(() => playAmbient())
onBeforeUnmount(() => stopAmbient())
</script>

<template>
  <div class="dialogue-layer">
    <section class="dialogue-panel" role="dialog" aria-live="polite">

      <img :src="portrait" :alt="scene.speaker" class="dialogue-portrait" />
      <div class="dialogue-panel__body">
        <div class="speaker-name">{{ scene.speaker }}</div>
        <p>{{ scene.text }}</p>
        <div class="dialogue-panel__footer dialogue-panel__footer--end">
          <button type="button" @click="$emit('complete')">{{ scene.action }} <b>›</b></button>
        </div>
      </div>
    </section>
  </div>
</template>
