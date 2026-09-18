<script setup>
/**
 * 关卡容器壳。
 *
 * 两种状态：
 * - 地图探索（默认主世界）：由另一位同学制作，交付后挂载到本视图位置；
 *   地图探索组件走到特殊地点时 emit('enter-level', <levelId>) 进入关卡。
 * - 关卡：渲染对应关卡组件，关卡内部通过 emit('exit') 返回地图探索。
 *
 * 当前地图尚未交付，壳默认显示「地图探索接入位」提示页，
 * 并提供临时测试入口，便于单独验证各关卡。
 */
import { computed, ref } from 'vue'
import { levels } from './levels/registry.js'

const activeLevelId = ref(null)

const activeLevel = computed(() => levels.find((level) => level.id === activeLevelId.value) ?? null)

function enterLevel(id) {
  const target = levels.find((level) => level.id === id && level.component)
  if (!target) return
  activeLevelId.value = target.id
}

function exitLevel() {
  activeLevelId.value = null
}
</script>

<template>
  <!-- 地图探索接入位：正式地图交付后替换此视图 -->
  <section v-if="!activeLevel" class="map-slot">
    <p class="map-slot__tag">MAP EXPLORE · 地图探索接入位</p>
    <h1>喀什古城</h1>
    <p class="map-slot__intro">
      游戏主世界为地图探索（由另一位同学制作），玩家在地图探索中走到特殊地点进入关卡。
      <br />地图交付后挂载方式见 README「地图探索接入」章节。
    </p>
    <div class="map-slot__levels">
      <button
        v-for="level in levels"
        :key="level.id"
        type="button"
        class="map-slot__level"
        @click="enterLevel(level.id)"
      >
        <span class="map-slot__title">{{ level.title }}</span>
        <span class="map-slot__desc">{{ level.desc }}</span>
        <small class="map-slot__hint">临时测试入口 · 正式版由地图地点触发</small>
      </button>
    </div>
  </section>

  <!-- 关卡运行 -->
  <component v-else :is="activeLevel.component" :key="activeLevel.id" @exit="exitLevel" />
</template>

<style scoped>
.map-slot {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  background:
    radial-gradient(1200px 600px at 50% 30%, rgba(232, 192, 125, 0.18), transparent 70%),
    #1a1410;
  color: #f4e6cd;
  box-sizing: border-box;
  padding: 24px;
}

.map-slot__tag {
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.3em;
  color: #8a7355;
}

.map-slot h1 {
  margin: 0;
  font-size: 72px;
  color: #e8c07d;
  letter-spacing: 0.12em;
}

.map-slot__intro {
  margin: 0;
  font-size: 15px;
  line-height: 1.8;
  text-align: center;
  color: #b7a183;
}

.map-slot__levels {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  margin-top: 8px;
}

.map-slot__level {
  width: 240px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
  padding: 18px;
  border: 1px solid rgba(232, 192, 125, 0.35);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
}

.map-slot__level:hover {
  background: rgba(232, 192, 125, 0.12);
  border-color: #e8c07d;
  transform: translateY(-2px);
}

.map-slot__title {
  font-size: 22px;
  font-weight: 700;
  color: #e8c07d;
}

.map-slot__desc {
  font-size: 13px;
  color: #b7a183;
}

.map-slot__hint {
  font-size: 12px;
  color: #8a7355;
}
</style>
