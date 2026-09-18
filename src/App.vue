<script setup>
/**
 * 关卡容器壳。
 *
 * 状态：
 * - 主菜单（默认）：显示游戏标题与关卡入口；地图探索交付后，
 *   本视图作为地图启动入口，关卡改由地图中的特殊地点触发。
 * - 关卡：渲染对应关卡组件，关卡内部通过 emit('exit') 返回主菜单。
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
  <!-- 主菜单：地图探索交付后，本视图作为地图的启动入口 -->
  <section v-if="!activeLevel" class="hub-menu">
    <div class="hub-menu__backdrop"></div>
    <div class="hub-menu__content">
      <p class="hub-menu__eyebrow">KASHGAR TOWN · CULTURAL JOURNEY</p>
      <h1 class="hub-menu__title">喀什古城</h1>
      <div class="hub-menu__divider" aria-hidden="true"><span>✦</span></div>
      <p class="hub-menu__subtitle">丝路拾遗 · 选择一段文化旅程</p>

      <div class="hub-menu__levels">
        <button
          v-for="level in levels"
          :key="level.id"
          type="button"
          class="hub-menu__level"
          @click="enterLevel(level.id)"
        >
          <span class="hub-menu__level-title">{{ level.title }}</span>
          <span class="hub-menu__level-desc">{{ level.desc }}</span>
          <span class="hub-menu__level-action">进入 →</span>
        </button>
      </div>
    </div>
  </section>

  <!-- 关卡运行 -->
  <component v-else :is="activeLevel.component" :key="activeLevel.id" @exit="exitLevel" />
</template>

<style scoped>
.hub-menu {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #1a1410;
  color: #f4e6cd;
}

.hub-menu__backdrop {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(24, 13, 8, 0.94) 0%, rgba(30, 16, 10, 0.82) 34%, rgba(30, 16, 10, 0.38) 68%, rgba(24, 13, 8, 0.55) 100%),
    url('/assets/backgrounds/workshop-street.png') center / cover no-repeat;
}

.hub-menu__content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 18px;
  padding: 0 clamp(40px, 8vw, 140px);
  box-sizing: border-box;
  max-width: 860px;
}

.hub-menu__eyebrow {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.32em;
  color: #c9a86a;
}

.hub-menu__title {
  margin: 0;
  font-family: 'Songti SC', 'STSong', serif;
  font-size: clamp(64px, 7vw, 108px);
  line-height: 0.95;
  letter-spacing: 0.1em;
  color: #e8c07d;
  text-shadow: 0 4px 28px rgba(30, 12, 5, 0.55);
}

.hub-menu__divider {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #d49a39;
  font-size: 15px;
}

.hub-menu__divider::before,
.hub-menu__divider::after {
  content: '';
  height: 1px;
  width: 56px;
  background: linear-gradient(90deg, transparent, rgba(212, 154, 57, 0.7));
}

.hub-menu__divider::after {
  background: linear-gradient(90deg, rgba(212, 154, 57, 0.7), transparent);
}

.hub-menu__subtitle {
  margin: 0;
  font-size: 15px;
  letter-spacing: 0.14em;
  color: #d9c6a3;
}

.hub-menu__levels {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 22px;
}

.hub-menu__level {
  min-width: 250px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 16px 18px;
  border: 1px solid rgba(232, 192, 125, 0.32);
  border-radius: 12px;
  background: rgba(24, 14, 8, 0.55);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
}

.hub-menu__level:hover {
  background: rgba(232, 192, 125, 0.14);
  border-color: #e8c07d;
  transform: translateY(-2px);
}

.hub-menu__level-title {
  font-size: 21px;
  font-weight: 700;
  color: #e8c07d;
}

.hub-menu__level-desc {
  font-size: 13px;
  color: #c2ae8c;
}

.hub-menu__level-action {
  margin-top: 4px;
  font-size: 12px;
  letter-spacing: 0.1em;
  color: #d49a39;
}
</style>
