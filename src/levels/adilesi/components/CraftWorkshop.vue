<script setup>
import { computed, ref } from 'vue'
import { applyDye, checkPattern, isDyeComplete, toggleTiePoint, classifyTie, TIE_TYPE_NAMES, COLOR_NAMES, COLOR_HEX } from '../game/craftRules.js'

const props = defineProps({ step: { type: String, required: true } })
const emit = defineEmits(['pattern-complete', 'tying-complete', 'dyeing-complete', 'reveal-complete'])

const feedback = ref('')
const tiePoints = ref([])
const dyeSequence = ref([])
const revealing = ref(false)

// 选满 3 个扎结点后归类的扎结法（类型+色带宽度+倾斜角度）
const tieResult = computed(() => (tiePoints.value.length === 3 ? classifyTie(tiePoints.value) : null))
const dyeName = computed(() => (dyeSequence.value.length === 3 ? dyeSequence.value.map((c) => COLOR_NAMES[c]).join(' · ') : ''))

// 预览和最终成品共用同一个连续渐变，避免新增颜色没有样式或条纹出现断接。
function createFabricStyle(tie, sequence) {
  const base = '#f5f0e6'
  const colors = sequence.map((color) => COLOR_HEX[color]).filter(Boolean)
  if (!colors.length) {
    return { backgroundColor: base, backgroundImage: `repeating-linear-gradient(135deg, ${base} 0 50%, #fffaf0 50% 100%)` }
  }

  const widthRatio = tie?.widthRatio || 0.26
  const angle = tie?.angle || 35
  // 整块布只生成一次连续渐变，不使用 repeating-linear-gradient，避免斜纹平铺时出现拼接缝。
  const repeatCount = 7
  const band = 2.8 + widthRatio * 2
  const gap = tie?.type === 'scatter' ? 1.6 : 1.05 + (0.45 - widthRatio)
  const cycle = 100 / repeatCount
  const colorBand = Math.min(band, cycle / 3 - gap)
  let cursor = 0
  const stops = []
  for (let repeat = 0; repeat < repeatCount; repeat += 1) {
    colors.forEach((color) => {
      stops.push(`${color} ${cursor}% ${cursor + colorBand}%`)
      cursor += colorBand
      stops.push(`${base} ${cursor}% ${cursor + gap}%`)
      cursor += gap
    })
  }
  stops.push(`${base} ${cursor}% 100%`)
  return {
    backgroundColor: base,
    backgroundImage: `linear-gradient(${angle}deg, ${stops.join(', ')})`,
  }
}

const fabricStyle = computed(() => createFabricStyle(tieResult.value, dyeSequence.value))
const miniFabricStyle = computed(() => createFabricStyle(tieResult.value, dyeSequence.value))

const fabricClass = computed(() => (tieResult.value ? `silk-fabric--${tieResult.value.type}` : ''))

const title = computed(() => ({
  pattern: '第一步 · 认识纹样',
  tying: '第二步 · 扎结留白',
  dyeing: '第三步 · 层叠染色',
  reveal: '最后一步 · 展开成品',
}[props.step]))

const description = computed(() => ({
  pattern: '观察纹样的流动感、连续性与对称关系，选出最符合艾德莱斯绸特征的一项。',
  tying: '选择三个位置进行扎结。被扎紧的区域不会完全着色，展开后会形成富有节奏的留白。',
  dyeing: '从六种颜色里选三种，顺序随意。选的颜色和顺序会直接决定成品绸的色彩布局。',
  reveal: '每一次扎结和染色都已留在丝线中。现在，慢慢展开它。',
}[props.step]))

function selectPattern(id) {
  const result = checkPattern(id)
  feedback.value = result.message
  if (result.correct) window.setTimeout(() => emit('pattern-complete'), 850)
}

function selectTiePoint(id) {
  const result = toggleTiePoint(tiePoints.value, id, 3)
  tiePoints.value = result.points
  feedback.value = result.accepted
    ? result.removed ? '已松开这个位置。' : `已完成 ${tiePoints.value.length} / 3 个扎结。`
    : '只需选择三个位置；可以再次点击已选位置进行调整。'
}

function confirmTying() {
  if (tiePoints.value.length === 3) emit('tying-complete')
}

function chooseDye(color) {
  const result = applyDye(dyeSequence.value, color)
  feedback.value = result.message
  dyeSequence.value = result.sequence
  if (isDyeComplete(dyeSequence.value)) window.setTimeout(() => emit('dyeing-complete'), 700)
}

function revealSilk() {
  revealing.value = true
  window.setTimeout(() => emit('reveal-complete', {
    style: fabricStyle.value,
    className: fabricClass.value,
    colors: [...dyeSequence.value],
    tie: tieResult.value,
  }), 1800)
}
</script>

<template>
  <div class="craft-layer">
    <section class="craft-panel" role="dialog" aria-labelledby="craft-title">
      <div class="craft-panel__heading">
        <div class="craft-seal">艺</div>
        <div>
          <small>艾德莱斯绸工艺体验</small>
          <h2 id="craft-title">{{ title }}</h2>
        </div>
        <div class="craft-stage-pips" aria-label="制作进度">
          <i v-for="stage in ['pattern', 'tying', 'dyeing', 'reveal']" :key="stage" :class="{ active: stage === step }"></i>
        </div>
      </div>
      <p class="craft-description">{{ description }}</p>

      <div v-if="step === 'pattern'" class="pattern-grid">
        <button class="pattern-card" type="button" @click="selectPattern('scattered-flowers')">
          <span class="pattern-swatch pattern-swatch--flowers"></span>
          <strong>花果散点纹</strong><small>自由分布 · 轻盈活泼</small>
        </button>
        <button class="pattern-card pattern-card--featured" type="button" @click="selectPattern('flowing-geometric')">
          <span class="pattern-swatch pattern-swatch--flow"></span>
          <strong>流动几何纹</strong><small>连续律动 · 中心呼应</small>
        </button>
        <button class="pattern-card" type="button" @click="selectPattern('random-lines')">
          <span class="pattern-swatch pattern-swatch--lines"></span>
          <strong>自由线条纹</strong><small>无序交错 · 随机变化</small>
        </button>
      </div>

      <div v-else-if="step === 'tying'" class="tying-workspace">
        <div class="silk-cloth silk-cloth--plain">
          <button
            v-for="point in ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']"
            :key="point"
            type="button"
            :class="['tie-point', `tie-point--${point}`, { selected: tiePoints.includes(point) }]"
            :aria-label="`扎结位置 ${point}`"
            @click="selectTiePoint(point)"
          ><span></span></button>
        </div>
        <aside class="step-note"><b>{{ tiePoints.length }} / 3</b><span>已选择扎结点</span></aside>
      </div>

      <div v-else-if="step === 'dyeing'" class="dye-workspace">
        <div class="mini-silk" :style="miniFabricStyle"></div>
        <div class="dye-vats">
          <button v-for="vat in [
            { id: 'indigo', name: '靛蓝', note: '沉静的底色' },
            { id: 'red', name: '绛红', note: '热烈的脉络' },
            { id: 'yellow', name: '暖黄', note: '明亮的点缀' },
            { id: 'green', name: '翠绿', note: '生机的绿意' },
            { id: 'purple', name: '茄紫', note: '神秘的深紫' },
            { id: 'orange', name: '橘橙', note: '温暖的橘色' },
          ]" :key="vat.id" :class="['dye-vat', `dye-vat--${vat.id}`, { used: dyeSequence.includes(vat.id) }]" type="button" @click="chooseDye(vat.id)">
            <i></i><strong>{{ vat.name }}</strong><small>{{ vat.note }}</small>
          </button>
        </div>
        <div class="dye-order"><span v-for="(color, index) in dyeSequence" :key="index" :class="{ done: true }">{{ index + 1 }} · {{ COLOR_NAMES[color] }}</span><span v-if="dyeSequence.length < 3">? · 待选</span></div>
      </div>

      <div v-else class="reveal-workspace">
        <div :class="['silk-roll', { open: revealing }]">
          <div class="silk-roll__bar silk-roll__bar--top"></div>
          <div :class="['silk-roll__fabric', fabricClass]" :style="fabricStyle">
            <span>{{ revealing ? '色彩的记忆' : '展开绸布' }}</span>
          </div>
          <div class="silk-roll__bar silk-roll__bar--bottom"></div>
        </div>
        <p v-if="tieResult" class="reveal-summary">
          <b>{{ TIE_TYPE_NAMES[tieResult.type] }}</b> · 经线留白 {{ tieResult.type === 'stripe' ? '聚成条纹' : tieResult.type === 'diagonal' ? '斜贯布面' : '散落成点' }}
          <span v-if="dyeName">｜{{ dyeName }}层叠着色</span>
        </p>
      </div>

      <div class="craft-panel__footer">
        <p :class="{ success: feedback.includes('正确') || feedback.includes('完成') }">{{ feedback || '跟随老师傅的提示，慢慢完成每一步。' }}</p>
        <button v-if="step === 'tying'" class="primary-button compact" type="button" :disabled="tiePoints.length !== 3" @click="confirmTying">完成扎结</button>
        <button v-if="step === 'reveal'" class="primary-button compact" type="button" :disabled="revealing" @click="revealSilk">{{ revealing ? '纹样正在显现…' : '展开绸布' }}</button>
      </div>
    </section>
  </div>
</template>
