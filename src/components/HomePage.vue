<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import Phaser from 'phaser'
import fallbackImageUrl from '../../assets/home/home-video-poster.png'
import homeVideoUrl from '../../首页素材1.mp4'
import GameConfig from '../game/GameConfig'
import audioManager from '../utils/audioManager'
import GameGuideModal from './home/GameGuideModal.vue'

const gameContainer = ref(null)
const firstVideo = ref(null)
const secondVideo = ref(null)
const activeVideoIndex = ref(0)
const videoFailed = ref(false)
const isStarting = ref(false)
const isGuideOpen = ref(false)
const guideButton = ref(null)
const emit = defineEmits(['start'])
let game = null
let fadeCleanupTimer = null
let isCrossfading = false
let audioContext = null

const FADE_DURATION = 380
const HOME_TRANSITION_DURATION = 560

function playUiSound(kind) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return

  // Hover cannot unlock audio in browsers that require a click or key press.
  if (kind === 'hover' && navigator.userActivation && !navigator.userActivation.hasBeenActive) return

  try {
    audioContext ??= new AudioContextClass()
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => playTone(kind)).catch(() => {})
    } else {
      playTone(kind)
    }
  } catch {
    // Audio is optional; input must remain usable even when audio is blocked.
  }
}

function playTone(kind) {
  if (!audioContext || audioContext.state !== 'running') return

  const now = audioContext.currentTime
  const isClick = kind === 'click'
  const duration = isClick ? 0.2 : 0.13
  const gain = audioContext.createGain()
  const fundamental = audioContext.createOscillator()
  const overtone = audioContext.createOscillator()

  fundamental.type = 'sine'
  overtone.type = 'sine'
  fundamental.frequency.setValueAtTime(isClick ? 392 : 587, now)
  fundamental.frequency.exponentialRampToValueAtTime(isClick ? 523 : 659, now + duration)
  overtone.frequency.setValueAtTime(isClick ? 784 : 1174, now)
  overtone.frequency.exponentialRampToValueAtTime(isClick ? 1046 : 1318, now + duration)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(isClick ? 0.035 : 0.018, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  fundamental.connect(gain)
  overtone.connect(gain)
  gain.connect(audioContext.destination)
  fundamental.start(now)
  overtone.start(now)
  fundamental.stop(now + duration)
  overtone.stop(now + duration)
  overtone.onended = () => gain.disconnect()
}

function handleStartGame() {
  if (isStarting.value) return
  isStarting.value = true
  playUiSound('click')
  // Keep the shared music bed playing while the character selection page opens.
  window.setTimeout(() => emit('start'), HOME_TRANSITION_DURATION)
}

function openGuide() {
  if (isStarting.value) return
  isGuideOpen.value = true
  audioManager.duck()
}

function closeGuide() {
  isGuideOpen.value = false
  audioManager.restoreVolume()
  nextTick(() => guideButton.value?.focus())
}

function handleDocumentKeydown(event) {
  if (event.key !== 'Escape') return
  if (isGuideOpen.value) closeGuide()
}

function releaseVideo() {
  ;[firstVideo.value, secondVideo.value].forEach((video) => {
    if (!video) return

    video.pause()
    video.removeAttribute('src')
    video.load()
  })

  if (fadeCleanupTimer) {
    window.clearTimeout(fadeCleanupTimer)
    fadeCleanupTimer = null
  }
}

function handleVideoError() {
  videoFailed.value = true
  releaseVideo()
}

function getVideo(index) {
  return index === 0 ? firstVideo.value : secondVideo.value
}

async function handleVideoEnded(index) {
  if (videoFailed.value || isCrossfading || index !== activeVideoIndex.value) return

  const nextIndex = index === 0 ? 1 : 0
  const currentVideo = getVideo(index)
  const nextVideo = getVideo(nextIndex)

  if (!currentVideo || !nextVideo) return

  isCrossfading = true
  nextVideo.currentTime = 0
  nextVideo.muted = true
  nextVideo.defaultMuted = true
  nextVideo.playsInline = true

  try {
    await nextVideo.play()
    activeVideoIndex.value = nextIndex
    fadeCleanupTimer = window.setTimeout(() => {
      currentVideo.pause()
      currentVideo.currentTime = 0
      fadeCleanupTimer = null
    }, FADE_DURATION + 40)
  } catch {
    handleVideoError()
  } finally {
    isCrossfading = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleDocumentKeydown)
  audioManager.bindUserInteraction()
  audioManager.play({ fadeIn: true })

  const video = firstVideo.value

  if (video) {
    video.muted = true
    video.defaultMuted = true
    video.playsInline = true
    video.play().catch(() => {
      if (video.error) handleVideoError()
    })
  }

  game = new Phaser.Game({
    ...GameConfig,
    parent: gameContainer.value,
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleDocumentKeydown)
  if (isGuideOpen.value) audioManager.restoreVolume(0)
  releaseVideo()
  audioContext?.close().catch(() => {})
  audioContext = null
  game?.destroy(true)
  game = null
})
</script>

<template>
  <main class="home-page" :class="{ 'is-exiting': isStarting }" aria-label="喀什小镇游戏首页">
    <img
      v-if="videoFailed"
      class="home-media is-active"
      :src="fallbackImageUrl"
      alt=""
      aria-hidden="true"
    />
    <video
      v-else
      ref="firstVideo"
      class="home-media"
      :class="{ 'is-active': activeVideoIndex === 0 }"
      :src="homeVideoUrl"
      :poster="fallbackImageUrl"
      autoplay
      muted
      playsinline
      preload="auto"
      aria-hidden="true"
      @error="handleVideoError"
      @ended="handleVideoEnded(0)"
    />
    <video
      v-if="!videoFailed"
      ref="secondVideo"
      class="home-media"
      :class="{ 'is-active': activeVideoIndex === 1 }"
      :src="homeVideoUrl"
      :poster="fallbackImageUrl"
      muted
      playsinline
      preload="auto"
      aria-hidden="true"
      @error="handleVideoError"
      @ended="handleVideoEnded(1)"
    />
    <div ref="gameContainer" class="game-layer" />
    <nav class="home-menu-buttons" aria-label="首页功能">
      <button
        class="home-menu-button home-menu-button--start"
        type="button"
        aria-label="开始探索"
        :disabled="isStarting"
        @pointerenter="playUiSound('hover')"
        @focus="playUiSound('hover')"
        @click="handleStartGame"
      >
        <span class="menu-ribbon" aria-hidden="true"></span>
        <span class="menu-label">开始探索</span>
        <span class="menu-ornament" aria-hidden="true"></span>
      </button>
      <button
        ref="guideButton"
        class="home-menu-button"
        type="button"
        aria-label="查看游戏玩法公告"
        @pointerenter="playUiSound('hover')"
        @focus="playUiSound('hover')"
        @click="openGuide"
      >
        <span class="menu-ribbon" aria-hidden="true"></span>
        <span class="menu-label">玩法公告</span>
        <span class="menu-ornament" aria-hidden="true"></span>
      </button>
    </nav>
    <Transition name="guide-fade">
      <GameGuideModal v-if="isGuideOpen" @close="closeGuide" />
    </Transition>
  </main>
</template>

<style scoped>
.home-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
  opacity: 1;
  transition: opacity 560ms ease;
}

.home-page.is-exiting { opacity: 0; pointer-events: none; }

.guide-fade-enter-active, .guide-fade-leave-active { transition: opacity 260ms ease; }
.guide-fade-enter-from, .guide-fade-leave-to { opacity: 0; }

.home-media {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  pointer-events: none;
  transition: opacity 380ms ease-in-out;
}

.home-media.is-active {
  opacity: 1;
}

.game-layer {
  position: absolute;
  inset: 0;
  z-index: 10;
}

.game-layer :deep(canvas) {
  display: block;
}

.home-menu-buttons {
  position: absolute;
  top: clamp(30%, 34vh, 40%);
  left: 50%;
  z-index: 24;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(18px, 2.2vh, 30px);
  width: min(440px, calc(100vw - 34px));
  transform: translateX(-50%);
}

.home-menu-button {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: min(100%, 400px);
  min-height: 76px;
  padding: 5px 24px 13px;
  border: 0;
  color: #fff0c8;
  background: transparent;
  cursor: pointer;
  isolation: isolate;
  transition: transform 240ms cubic-bezier(.22,.61,.36,1), color 220ms ease, filter 220ms ease;
}

.menu-label {
  position: relative;
  z-index: 2;
  display: block;
  font: 700 clamp(28px, 3vw, 42px)/1.15 'STKaiti', 'KaiTi', 'Songti SC', serif;
  letter-spacing: .2em;
  text-shadow: 0 3px 4px rgba(34, 18, 8, .72), 0 0 12px rgba(255, 218, 134, .2);
  transition: transform 220ms ease, color 220ms ease, text-shadow 220ms ease;
}

.menu-ornament {
  position: relative;
  z-index: 2;
  display: block;
  width: min(320px, 82%);
  height: 17px;
  margin-top: 10px;
  background: linear-gradient(90deg, transparent, rgba(204, 142, 57, .58) 8%, #c28738 22%, #ffe7a5 40%, #fff7d0 50%, #ffe7a5 60%, #c28738 78%, rgba(204, 142, 57, .58) 92%, transparent);
  clip-path: polygon(0 48%, 34% 48%, 40% 0, 44% 48%, 50% 18%, 56% 48%, 60% 0, 66% 48%, 100% 48%, 92% 62%, 68% 62%, 62% 100%, 57% 62%, 43% 62%, 38% 100%, 32% 62%, 8% 62%);
  filter: drop-shadow(0 2px 3px rgba(22, 10, 3, .72));
  transition: transform 240ms ease, filter 240ms ease;
}

.menu-ornament::before, .menu-ornament::after {
  position: absolute;
  top: 4px;
  width: 8px;
  height: 8px;
  content: '';
  border: 1px solid #fff0b9;
  border-radius: 50%;
  background: #9d5b29;
  box-shadow: 0 0 0 1px rgba(77, 35, 13, .6), 0 1px 3px rgba(22, 10, 3, .5);
}
.menu-ornament::before { left: 8%; }
.menu-ornament::after { right: 8%; }

.menu-ribbon {
  position: absolute;
  z-index: 1;
  top: 8px;
  left: 50%;
  width: 78%;
  height: 43px;
  border-radius: 45% 55% 48% 52% / 54% 46% 54% 46%;
  background-color: rgba(246, 205, 122, .24);
  background-image:
    repeating-linear-gradient(116deg, rgba(255, 245, 205, .28) 0 3px, transparent 3px 14px),
    linear-gradient(90deg, rgba(255, 220, 139, .08), rgba(255, 235, 170, .54) 30%, rgba(255, 248, 214, .68) 50%, rgba(255, 235, 170, .54) 70%, rgba(255, 220, 139, .08));
  opacity: 0;
  filter: blur(2.8px) saturate(.78) drop-shadow(0 2px 4px rgba(72, 42, 14, .2));
  transform: translateX(-50%) rotate(-1.5deg) scaleX(.24) skewX(-5deg);
  transition: opacity 220ms ease, transform 520ms cubic-bezier(.22,.61,.36,1);
  pointer-events: none;
}

.home-menu-button:hover, .home-menu-button:focus-visible { color: #fff8df; transform: translateY(-4px) scale(1.035); filter: drop-shadow(0 5px 10px rgba(24, 12, 5, .38)); }
.home-menu-button:hover .menu-ribbon, .home-menu-button:focus-visible .menu-ribbon { opacity: .66; transform: translateX(-50%) rotate(-1.5deg) scaleX(1) skewX(-5deg); }
.home-menu-button:hover .menu-label, .home-menu-button:focus-visible .menu-label { transform: translateY(-1px); color: #fff8d9; text-shadow: 0 3px 4px rgba(34, 18, 8, .72), 0 0 18px rgba(255, 221, 127, .72); }
.home-menu-button:hover .menu-ornament, .home-menu-button:focus-visible .menu-ornament { transform: scaleX(1.04); filter: drop-shadow(0 0 7px rgba(255, 215, 117, .75)); }
.home-menu-button:active { transform: translateY(-1px) scale(.99); }
.home-menu-button:disabled { cursor: default; }
.home-menu-button:focus-visible { outline: 2px solid #f4d48e; outline-offset: 5px; }
@media (max-width: 700px) {
  .home-menu-buttons { top: 31%; gap: 12px; width: calc(100vw - 28px); }
  .home-menu-button { min-height: 68px; }
  .menu-label { font-size: clamp(25px, 7vw, 35px); letter-spacing: .14em; }
  .menu-ornament { margin-top: 7px; }
}

@media (max-width: 600px) {
}

@media (prefers-reduced-motion: reduce) {
  .home-menu-button, .menu-label, .menu-ornament, .menu-ribbon { transition-duration: 0.01ms; }
}
</style>
