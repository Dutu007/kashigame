<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import characterBackgroundUrl from '../../角色选择背景图.png'
import journeyButtonUrl from '../assets/processed/start-journey-button-transparent.png'
import maleCharacterUrl from '../assets/processed/male-character-transparent-v2.png'
import femaleCharacterUrl from '../assets/processed/female-character-transparent-v2.png'
import KashgarPlaque from './KashgarPlaque.vue'
import audioManager from '../utils/audioManager'

const emit = defineEmits(['start', 'back'])
const selectedCharacter = ref(sessionStorage.getItem('selectedCharacter') || 'female')
const hoveredCharacter = ref(null)
const feedbackCharacter = ref(null)
const isLeaving = ref(false)
const isStarting = ref(false)
let feedbackTimer = null
let leaveTimer = null
let selectionAudio = null
let selectionSoundToken = 0
let lastSelectionSoundAt = -Infinity

async function playSelectionSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass || performance.now() - lastSelectionSoundAt < 140) return
  lastSelectionSoundAt = performance.now()
  const token = ++selectionSoundToken

  try {
    selectionAudio ??= new AudioContextClass()
    const context = selectionAudio
    if (context.state === 'suspended') await context.resume()
    if (token !== selectionSoundToken || context.state !== 'running' || isLeaving.value || isStarting.value) return

    // Two soft ascending plucks with a quiet harmonic for a warm confirmation.
    const now = context.currentTime
    ;[392, 587.33].forEach((frequency, index) => {
      const start = now + index * 0.085
      ;[1, 2, 3].forEach((harmonic, overtone) => {
        const oscillator = context.createOscillator()
        const envelope = context.createGain()
        const duration = 0.32 - overtone * 0.065
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(frequency * harmonic, start)
        envelope.gain.setValueAtTime(0, start)
        envelope.gain.linearRampToValueAtTime(0.09 / (harmonic * harmonic), start + 0.008)
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
        envelope.gain.linearRampToValueAtTime(0, start + duration + 0.015)
        oscillator.connect(envelope)
        envelope.connect(context.destination)
        oscillator.start(start)
        oscillator.stop(start + duration + 0.02)
        oscillator.onended = () => {
          oscillator.disconnect()
          envelope.disconnect()
        }
      })
    })
  } catch {
    // Selection remains usable when browser audio is unavailable.
  }
}

const displayCharacter = computed(() => hoveredCharacter.value || selectedCharacter.value)

const characters = {
  male: {
    name: '艾德',
    traits: '热情 · 好奇 · 喜欢探索古城',
    quote: '“走吧，看看古城里藏着什么故事！”',
    image: maleCharacterUrl,
  },
  female: {
    name: '阿依苏',
    traits: '细心 · 灵动 · 擅长发现文化线索',
    quote: '“慢一点，也许线索就在我们身边。”',
    image: femaleCharacterUrl,
  },
}

function chooseCharacter(character) {
  if (isStarting.value || isLeaving.value) return
  playSelectionSound()
  selectedCharacter.value = character
  sessionStorage.setItem('selectedCharacter', character)
  feedbackCharacter.value = character
  window.clearTimeout(feedbackTimer)
  feedbackTimer = window.setTimeout(() => { feedbackCharacter.value = null }, 320)
}

function startJourney() {
  if (isStarting.value) return
  isStarting.value = true
  sessionStorage.setItem('selectedCharacter', selectedCharacter.value)
  audioManager.fadeOut(800)
  window.setTimeout(() => {
    isLeaving.value = true
    leaveTimer = window.setTimeout(() => emit('start'), 620)
  }, 120)
}

function goBack() {
  if (isStarting.value || isLeaving.value) return
  isLeaving.value = true
  leaveTimer = window.setTimeout(() => emit('back'), 520)
}

onMounted(() => {
  // The home page and character selection share one music bed.
  audioManager.play({ fadeIn: false })
})

onBeforeUnmount(() => {
  selectionSoundToken += 1
  selectionAudio?.close().catch(() => {})
  selectionAudio = null
  window.clearTimeout(feedbackTimer)
  window.clearTimeout(leaveTimer)
})
</script>

<template>
  <main
    class="character-select"
    :class="{ 'is-leaving': isLeaving }"
    :style="{ '--character-bg': `url('${characterBackgroundUrl}')` }"
    aria-label="选择你的旅伴"
  >
    <div class="character-backdrop" aria-hidden="true" />
    <div class="character-vignette" aria-hidden="true" />

    <section class="character-zone male-zone" :class="{ 'is-active': displayCharacter === 'male' }">
      <div class="character-halo" aria-hidden="true" />
      <button
        class="character-hitbox"
        :class="{ 'is-feedback': feedbackCharacter === 'male' }"
        type="button"
        aria-label="选择男性角色艾德"
        :aria-pressed="selectedCharacter === 'male'"
        @mouseenter="hoveredCharacter = 'male'"
        @mouseleave="hoveredCharacter = null"
        @focus="hoveredCharacter = 'male'"
        @blur="hoveredCharacter = null"
        @click="chooseCharacter('male')"
      >
        <span class="character-float">
          <img class="character-image" :src="characters.male.image" alt="男性角色艾德" draggable="false" />
        </span>
      </button>
      <div class="character-copy">
        <strong>{{ characters.male.name }}</strong>
        <span>{{ characters.male.traits }}</span>
        <small>{{ characters.male.quote }}</small>
      </div>
      <span v-if="selectedCharacter === 'male'" class="selected-badge"><KashgarPlaque /><span class="ornament-label">已选择</span></span>
    </section>

    <section class="character-zone female-zone" :class="{ 'is-active': displayCharacter === 'female' }">
      <div class="character-halo" aria-hidden="true" />
      <button
        class="character-hitbox"
        :class="{ 'is-feedback': feedbackCharacter === 'female' }"
        type="button"
        aria-label="选择女性角色阿依苏"
        :aria-pressed="selectedCharacter === 'female'"
        @mouseenter="hoveredCharacter = 'female'"
        @mouseleave="hoveredCharacter = null"
        @focus="hoveredCharacter = 'female'"
        @blur="hoveredCharacter = null"
        @click="chooseCharacter('female')"
      >
        <span class="character-float">
          <img class="character-image female-image" :src="characters.female.image" alt="女性角色阿依苏" draggable="false" />
        </span>
      </button>
      <div class="character-copy">
        <strong>{{ characters.female.name }}</strong>
        <span>{{ characters.female.traits }}</span>
        <small>{{ characters.female.quote }}</small>
      </div>
      <span v-if="selectedCharacter === 'female'" class="selected-badge"><KashgarPlaque /><span class="ornament-label">已选择</span></span>
    </section>

    <button class="back-button" type="button" aria-label="返回游戏首页" @click="goBack"><KashgarPlaque variant="sand" /><span class="ornament-label">返回</span></button>

    <button
      class="journey-button"
      type="button"
      aria-label="开始旅程"
      :disabled="isStarting"
      @click="startJourney"
    >
      <img :src="journeyButtonUrl" alt="开始旅程" draggable="false" />
    </button>
  </main>
</template>

<style scoped>
.character-select { position: relative; width: 100vw; height: 100vh; min-height: 560px; overflow: hidden; color: #5a321e; background: #dca969; opacity: 1; transition: opacity 620ms ease, transform 620ms ease; }
.character-select.is-leaving { opacity: 0; transform: scale(1.012); pointer-events: none; }
.character-backdrop { position: absolute; inset: 0; z-index: 0; background: var(--character-bg) center / cover no-repeat; animation: backdrop-in 450ms ease-out both; }
.character-vignette { position: absolute; inset: 0; z-index: 1; pointer-events: none; background: radial-gradient(ellipse at center, transparent 55%, rgba(72, 31, 9, .14) 100%); mix-blend-mode: multiply; }
.character-zone { position: absolute; z-index: 3; bottom: 23.5%; width: clamp(360px, 31vw, 520px); height: 56vh; min-height: 330px; transition: filter 420ms ease, opacity 420ms ease; }
.male-zone { left: 29%; transform: translateX(-50%); }
.female-zone { right: 29%; transform: translateX(50%); }
.character-zone:not(.is-active) { filter: brightness(.9) saturate(.9); }
.character-halo { position: absolute; left: 50%; top: 13%; width: 88%; height: 64%; border-radius: 50%; background: radial-gradient(ellipse at center, rgba(255,222,155,.48) 0%, rgba(232,177,82,.24) 35%, rgba(232,177,82,.08) 60%, rgba(232,177,82,0) 75%); opacity: 0; transform: translate(-50%, -50%) scale(.82); transition: opacity 500ms ease, transform 500ms ease; pointer-events: none; }
.character-zone.is-active .character-halo { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.character-hitbox { position: absolute; inset: 0; z-index: 2; display: block; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; cursor: pointer; }
.character-float { position: absolute; inset: 0; display: block; animation: character-float 4.5s ease-in-out infinite; }
.female-zone .character-float { animation-duration: 4.9s; animation-delay: -.7s; }
.character-image { position: absolute; left: 50%; bottom: 0; width: auto; height: clamp(320px, 47vh, 520px); max-width: 125%; object-fit: contain; background: transparent; transform: translateX(-50%) scale(.98); transform-origin: center bottom; transition: transform 420ms ease, filter 420ms ease; user-select: none; }
.character-zone.is-active .character-image { transform: translate(-50%, -5px) scale(1.04); filter: drop-shadow(0 8px 12px rgba(65,32,15,.22)) drop-shadow(0 0 8px rgba(230,180,85,.42)) drop-shadow(0 0 16px rgba(230,180,85,.22)); }
.character-zone:not(.is-active) .character-image { filter: brightness(.93) saturate(.9); }
.character-hitbox.is-feedback .character-image { animation: character-select-pop 320ms ease-out; }
.character-copy { position: absolute; left: 50%; bottom: -10%; z-index: 4; display: grid; width: min(320px, 28vw); gap: 3px; padding: 7px 12px 8px; border: 1px solid rgba(185,124,56,.85); border-radius: 5px 8px 4px 7px; background: rgba(246,228,190,.92); box-shadow: 0 5px 12px rgba(90,50,30,.17), inset 0 0 0 1px rgba(255,248,218,.6); text-align: center; transform: translateX(-50%); transition: opacity 300ms ease, transform 300ms ease; pointer-events: none; }
.character-copy strong { font: 700 clamp(16px, 1.4vw, 24px)/1.1 Georgia, 'Songti SC', serif; }
.character-copy span, .character-copy small { font: 500 clamp(11px, .82vw, 14px)/1.35 'Songti SC', serif; }
.character-copy small { color: #754329; }
.character-zone:not(.is-active) .character-copy { opacity: .72; }
.selected-badge { position: absolute; top: 12%; right: 7%; z-index: 5; display: grid; place-items: center; width: clamp(112px, 10vw, 154px); height: 64px; color: #fff3d5; filter: drop-shadow(0 4px 5px rgba(74, 45, 27, .24)); font: 700 clamp(14px, 1.05vw, 18px)/1.3 'Songti SC', serif; letter-spacing: .12em; white-space: nowrap; pointer-events: none; }
.ornament-label { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; padding: 0 16px; text-shadow: 0 1px 2px rgba(48, 23, 15, .35); }

.journey-button { position: absolute; left: 50%; bottom: 6.4%; z-index: 8; width: clamp(260px, 22vw, 420px); padding: 0; border: 0; background: transparent; cursor: pointer; transform: translateX(-50%); transition: transform 180ms ease, filter 180ms ease; animation: journey-in 650ms 240ms ease-out both; }
.journey-button img { display: block; width: 100%; height: auto; background: transparent; object-fit: contain; user-select: none; }
.journey-button:hover, .journey-button:focus-visible { filter: brightness(1.08) drop-shadow(0 0 8px rgba(241,192,93,.35)); transform: translateX(-50%) scale(1.035); }
.journey-button:active { transform: translateX(-50%) scale(.97); transition-duration: 100ms; }
.journey-button:focus-visible, .back-button:focus-visible, .character-hitbox:focus-visible { outline: 2px solid rgba(250,223,153,.9); outline-offset: 4px; }
.journey-button:disabled { cursor: default; }
.back-button { position: absolute; left: 3.5%; bottom: 5%; z-index: 9; display: grid; place-items: center; width: 140px; height: 64px; padding: 0; border: 0; color: #693f25; background: transparent; filter: drop-shadow(0 4px 5px #371b1844); cursor: pointer; font: 700 clamp(14px, 1vw, 17px)/1.2 'Songti SC', serif; transition: transform 180ms ease, filter 180ms ease; }
.back-button .ornament-label { color: #72533d; letter-spacing: .16em; text-shadow: 0 1px #fff8e8; }
.back-button:hover, .back-button:focus-visible { filter: brightness(1.1) drop-shadow(0 5px 8px #371b1866); transform: translateY(-3px); }
.back-button:active { transform: translateY(0) scale(.97); }

@keyframes backdrop-in { from { opacity: 0; transform: scale(1.015); } to { opacity: 1; transform: scale(1); } }
@keyframes character-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes character-select-pop { 0% { transform: translateX(-50%) scale(1.04); } 35% { transform: translateX(-50%) scale(.99); } 70% { transform: translateX(-50%) scale(1.05); } 100% { transform: translateX(-50%) scale(1.04); } }
@keyframes journey-in { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
@media (max-width: 900px) { .character-zone { width: 40vw; bottom: 24%; } .male-zone { left: 27%; } .female-zone { right: 27%; } .character-copy { width: min(280px, 36vw); } }
@media (max-width: 640px) { .character-select { min-height: 620px; } .character-zone { bottom: 22%; width: 48vw; height: 50vh; min-height: 300px; } .male-zone { left: 24%; } .female-zone { right: 24%; } .character-image { height: clamp(260px, 40vh, 390px); } .character-copy { bottom: -13%; width: 42vw; } .character-copy span, .character-copy small { font-size: 10px; } .selected-badge { top: 8%; right: 3%; } .journey-button { width: min(72vw, 390px); bottom: 4%; } .back-button { left: 4%; bottom: 4.8%; width: 112px; height: 56px; } }
@media (prefers-reduced-motion: reduce) { .character-select, .character-backdrop, .character-float, .journey-button, .character-image, .character-halo { animation: none; transition-duration: .01ms; } }
</style>
