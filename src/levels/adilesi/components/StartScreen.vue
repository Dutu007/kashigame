<script setup>
defineEmits(['start', 'back'])
</script>

<template>
  <section class="start-screen" aria-labelledby="game-title">
    <div class="start-screen__shade"></div>
    <div class="start-screen__content">
      <p class="eyebrow">KASHGAR TOWN · CULTURAL JOURNEY</p>
      <h1 id="game-title">喀什小镇</h1>
      <div class="title-divider" aria-hidden="true"><span>✦</span></div>
      <h2>艾德莱斯绸：色彩的记忆</h2>
      <p class="start-screen__description">
        走进丝路染坊，听老师傅讲述流动于丝线之间的记忆，<br />
        亲手完成一次传统纹样、扎结与染色体验。
      </p>
      <button class="primary-button start-button" type="button" @click="$emit('start')">
        <span>进入染坊</span>
        <small>ENTER THE WORKSHOP</small>
      </button>
      <button class="back-button" type="button" @click="$emit('back')">← 返回地图</button>
      <div class="start-screen__meta">
        <span>预计体验 3—7 分钟</span>
        <i></i>
        <span>第一章 · 非遗工艺</span>
      </div>
    </div>
    <img class="start-character start-character--player" src="/assets/characters/player/player-portrait.png" alt="旅行者" />
    <img class="start-character start-character--master" src="/assets/characters/npc/master-ayti.png" alt="阿依提老师傅" />
  </section>
</template>

<style scoped>
.back-button {
  margin-top: 18px;
  padding: 10px 24px;
  border: 1px solid rgba(232, 192, 125, 0.4);
  border-radius: 999px;
  background: rgba(26, 20, 16, 0.5);
  color: #e8c07d;
  font-size: 14px;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.back-button:hover {
  background: rgba(232, 192, 125, 0.15);
  border-color: #e8c07d;
}
</style>
