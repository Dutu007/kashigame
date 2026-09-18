<script setup>
import { computed } from 'vue'
import { getObjective } from '../game/missionGuidance.js'
import { gameBus } from '../game/eventBus.js'

const props = defineProps({
  step: { type: String, required: true },
  inventory: { type: Object, required: true },
  nearTarget: { type: Object, default: null },
})

defineEmits(['exit'])

const STEPS = ['intro', 'explore', 'dialogue', 'collect-silk', 'find-pattern', 'return-master', 'open-valve', 'pattern', 'tying', 'dyeing', 'reveal', 'acceptance', 'reward', 'complete']
const TOTAL = STEPS.length

const objective = computed(() => getObjective(props.step, props.inventory))
const progress = computed(() => Math.max(1, STEPS.indexOf(props.step) + 1))

const silkList = [
  { id: 'silk-blue', label: '蓝色蚕丝束' },
  { id: 'silk-red', label: '绛红蚕丝束' },
  { id: 'silk-gold', label: '金黄蚕丝束' },
]
const showMaterials = computed(() => [
  'collect-silk', 'find-pattern', 'return-master', 'open-valve', 'pattern', 'tying', 'dyeing', 'reveal',
].includes(props.step))

function interact() {
  gameBus.emit('ui-interact')
}
</script>

<template>
  <header class="game-hud">
    <div class="hud-stack">
      <div class="chapter-chip player-panel">
        <img src="/assets/characters/player/player-portrait.png" alt="旅行者" />
        <div>
          <small>旅行者 · 丝路来客</small>
          <strong>艾德莱斯工艺考验</strong>
        </div>
      </div>

      <div class="objective-card">
        <div class="objective-card__topline">
          <span class="objective-card__label">当前任务</span>
          <span class="objective-card__step">{{ progress }} / {{ TOTAL }}</span>
        </div>
        <p class="objective-card__text">{{ objective }}</p>
        <div class="progress-track"><i :style="{ width: `${(progress / TOTAL) * 100}%` }"></i></div>
        <div v-if="showMaterials" class="inventory-strip" aria-label="已收集材料">
          <span class="inventory-strip__title">材料</span>
          <img
            v-for="silk in silkList"
            :key="silk.id"
            :src="`/assets/props/${silk.id}.png`"
            :alt="silk.label"
            :class="['inventory-silk', { 'inventory-silk--got': inventory.silk.includes(silk.id) }]"
          />
          <img
            src="/assets/props/pattern-sample.png"
            alt="纹样样本"
            :class="['inventory-pattern', { 'inventory-pattern--got': inventory.pattern }]"
          />
        </div>
      </div>
    </div>

    <button class="icon-button close-button" type="button" aria-label="退出关卡" @click="$emit('exit')">×</button>
  </header>

  <Transition name="prompt">
    <div v-if="nearTarget" class="interact-prompt">
      <kbd>E</kbd>
      <span>{{ nearTarget.label }}</span>
    </div>
  </Transition>

  <button v-if="nearTarget" class="round-action-button" type="button" aria-label="执行交互" @click="interact">
    <span>交互</span><small>E</small>
  </button>

  <div v-if="['explore', 'collect-silk', 'find-pattern', 'return-master', 'open-valve', 'acceptance'].includes(step)" class="control-guide">
    <span><kbd>A</kbd><kbd>D</kbd> 移动</span>
    <span><kbd>Shift</kbd> 助跑</span>
    <span><kbd>Space</kbd> 跳跃</span>
  </div>
</template>
