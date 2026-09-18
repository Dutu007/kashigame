<script setup>
import { computed, ref } from 'vue'

const emit = defineEmits(['complete'])

const PATTERNS = [
  { id: 'flow', name: '水波纹', note: '蓝 · 引水', cls: 'wheel-pattern--flow' },
  { id: 'pomegranate', name: '石榴花', note: '绛红 · 承色', cls: 'wheel-pattern--pomegranate' },
  { id: 'badam', name: '巴旦木', note: '金黄 · 点色', cls: 'wheel-pattern--badam' },
]

const CORRECT = ['flow', 'pomegranate', 'badam']

const wheels = ref([0, 0, 0])
const feedback = ref('')
const solved = ref(false)

const wheelLabels = computed(() =>
  wheels.value.map((index) => PATTERNS[index].name),
)

function cycle(index) {
  if (solved.value) return
  wheels.value[index] = (wheels.value[index] + 1) % PATTERNS.length
  feedback.value = ''
}

function confirm() {
  if (solved.value) return
  const matched = wheels.value.every(
    (index, position) => PATTERNS[index].id === CORRECT[position],
  )
  if (matched) {
    solved.value = true
    feedback.value = '阀栓转动，清水涌入染缸！'
    window.setTimeout(() => emit('complete'), 900)
  } else {
    feedback.value = '纹样次序不对，再想想老师傅的口诀……'
  }
}
</script>

<template>
  <div class="craft-layer">
    <section class="craft-panel valve-panel" role="dialog" aria-labelledby="valve-title">
      <div class="craft-panel__heading">
        <div class="craft-seal">阀</div>
        <div>
          <small>染坊水阀 · 纹样密码</small>
          <h2 id="valve-title">转动三枚纹样轮</h2>
        </div>
        <div class="valve-status" :class="{ 'valve-status--open': solved }">
          {{ solved ? '已开启' : '未开启' }}
        </div>
      </div>

      <p class="craft-description">
        老师傅的口诀：<b>水波在前，石榴居中，巴旦木收尾</b>。
        点击纹样轮切换图案，让三枚纹样按口诀排成一线。
      </p>

      <div class="valve-wheels">
        <div v-for="(index, position) in wheels" :key="position" class="valve-wheel">
          <button
            type="button"
            class="valve-wheel__disc"
            :class="[PATTERNS[index].cls, { 'valve-wheel__disc--open': solved }]"
            :aria-label="`第 ${position + 1} 枚纹样轮，当前 ${PATTERNS[index].name}，点击切换`"
            @click="cycle(position)"
          ></button>
          <strong>{{ wheelLabels[position] }}</strong>
          <small>第 {{ position + 1 }} 枚</small>
        </div>
      </div>

      <div class="craft-panel__footer">
        <p :class="{ success: solved }">{{ feedback || '三枚纹样轮都转好后，按下方的开启按钮。' }}</p>
        <button class="primary-button compact" type="button" :disabled="solved" @click="confirm">
          {{ solved ? '水阀已开启' : '开启水阀' }}
        </button>
      </div>
    </section>
  </div>
</template>
