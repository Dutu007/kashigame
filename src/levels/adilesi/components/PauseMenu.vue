<script setup>
defineEmits(['resume', 'restart', 'exit'])
</script>

<template>
  <div class="modal-layer">
    <section class="small-modal" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <span class="modal-kicker">GAME PAUSED</span>
      <h2 id="pause-title">旅程暂歇</h2>
      <p>染坊里的故事会停在这里，等待你继续。</p>
      <button class="primary-button" type="button" @click="$emit('resume')">继续体验</button>
      <button class="secondary-button" type="button" @click="$emit('restart')">重新开始本关</button>
      <button class="text-button" type="button" @click="$emit('exit')">返回标题页</button>
    </section>
  </div>
</template>
