<script setup>
defineProps({
  scene: { type: Object, required: true },
  portrait: { type: String, required: true },
})
defineEmits(['complete'])
</script>

<template>
  <div class="dialogue-layer">
    <section class="dialogue-panel quest-dialogue" role="dialog" aria-live="polite">
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
