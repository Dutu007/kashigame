<script setup>
defineProps({ complete: { type: Boolean, default: false } })
defineEmits(['accept', 'return'])
</script>

<template>
  <div class="reward-layer">
    <section v-if="!complete" class="reward-card" role="dialog" aria-labelledby="reward-title">
      <div class="reward-rays"></div>
      <div class="collection-card">
        <span class="collection-card__tag">文化收藏 · 01</span>
        <div class="collection-card__pattern"></div>
        <h3>艾德莱斯绸</h3>
        <small>新疆传统丝织艺术</small>
      </div>
      <div class="reward-copy">
        <span class="modal-kicker">CULTURAL MEMORY UNLOCKED</span>
        <h2 id="reward-title">老师傅的认可</h2>
        <blockquote>“真正的传统，不只是留下作品，更重要的是有人愿意继续记住它。”</blockquote>
        <p>你完成了纹样辨认、扎结留白与层叠染色，亲手唤醒了丝线中的色彩记忆。</p>
        <button class="primary-button" type="button" @click="$emit('accept')">收下图鉴</button>
      </div>
    </section>

    <section v-else class="chapter-complete">
      <span class="chapter-complete__seal">染</span>
      <p>CHAPTER ONE COMPLETE</p>
      <h2>第一章完成</h2>
      <div class="title-divider"><span>✦</span></div>
      <h3>喀什小镇的故事，才刚刚开始……</h3>
      <button class="primary-button" type="button" @click="$emit('return')">返回小镇入口</button>
    </section>
  </div>
</template>
