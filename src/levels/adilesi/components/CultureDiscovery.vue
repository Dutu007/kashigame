<script setup>
defineProps({ item: { type: Object, required: true } })
defineEmits(['close'])
</script>

<template>
  <div class="modal-layer culture-layer">
    <section class="culture-card" role="dialog" aria-labelledby="culture-title">
      <div class="culture-card__seal">识</div>
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
