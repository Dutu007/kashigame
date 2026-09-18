<script setup>
defineEmits(['cancel', 'confirm'])
</script>

<template>
  <div class="modal-layer modal-layer--dark">
    <section class="small-modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="exit-title">
      <div class="confirm-icon">！</div>
      <h2 id="exit-title">要离开染坊吗？</h2>
      <p>当前关卡进度不会保留，但你可以随时重新开始体验。</p>
      <div class="confirm-actions">
        <button class="secondary-button" type="button" @click="$emit('cancel')">继续体验</button>
        <button class="danger-button" type="button" @click="$emit('confirm')">确认退出</button>
      </div>
    </section>
  </div>
</template>
