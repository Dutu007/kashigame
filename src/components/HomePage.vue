<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import Phaser from 'phaser'
import fallbackImageUrl from '../../assets/home/home_background.png'
import homeVideoUrl from '../../assets/home/首页素材1.mp4'
import startButtonUrl from '../../assets/home/开始游戏按钮.png'
import vrLogoUrl from '../../assets/home/vr-window-transparent.png'
import GameConfig from '../game/GameConfig'
import audioManager from '../utils/audioManager'
import GameNoticeButton from './home/GameNoticeButton.vue'
import GameGuideModal from './home/GameGuideModal.vue'

const gameContainer = ref(null)
const firstVideo = ref(null)
const secondVideo = ref(null)
const activeVideoIndex = ref(0)
const videoFailed = ref(false)
const buttonReady = ref(false)
const isStarting = ref(false)
const isGuideOpen = ref(false)
const isVrOpen = ref(false)
const guideButton = ref(null)
const vrButton = ref(null)
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
  if (isVrOpen.value) audioManager.restoreVolume()
  isVrOpen.value = false
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

function openVrVideo() {
  if (isStarting.value) return
  isVrOpen.value = true
  audioManager.duck()
}

function closeVrVideo() {
  isVrOpen.value = false
  audioManager.restoreVolume()
  nextTick(() => vrButton.value?.focus())
}

function handleDocumentKeydown(event) {
  if (event.key !== 'Escape') return
  if (isVrOpen.value) closeVrVideo()
  else if (isGuideOpen.value) closeGuide()
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

  const buttonImage = new Image()
  buttonImage.onload = () => { buttonReady.value = true }
  buttonImage.onerror = () => { buttonReady.value = true }
  buttonImage.src = startButtonUrl

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
  if (isGuideOpen.value || isVrOpen.value) audioManager.restoreVolume(0)
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
    <button
      class="start-button"
      :class="{ 'is-ready': buttonReady }"
      type="button"
      aria-label="开始游戏"
      :style="{ '--button-mask': `url('${startButtonUrl}')` }"
      @pointerenter="playUiSound('hover')"
      :disabled="isStarting"
      @click="handleStartGame"
    >
      <span class="button-art">
        <img :src="startButtonUrl" alt="" draggable="false" decoding="async" fetchpriority="high" />
      </span>
    </button>
    <GameNoticeButton ref="guideButton" @click="openGuide" />
    <button
      ref="vrButton"
      class="vr-button"
      type="button"
      aria-label="播放 VR 体验视频"
      @click="openVrVideo"
    >
      <img :src="vrLogoUrl" alt="" aria-hidden="true" />
    </button>
    <Transition name="guide-fade">
      <GameGuideModal v-if="isGuideOpen" @close="closeGuide" />
    </Transition>
    <Transition name="vr-fade">
      <section v-if="isVrOpen" class="vr-overlay" role="dialog" aria-modal="true" aria-labelledby="vr-title">
        <div class="vr-dialog">
          <header class="vr-header">
            <h2 id="vr-title">VR 体验</h2>
            <button class="vr-close" type="button" aria-label="关闭视频窗口" @click="closeVrVideo">×</button>
          </header>
          <div class="vr-player">
            <iframe
              src="https://player.bilibili.com/player.html?bvid=BV16mGM6xEBA&p=1&danmaku=0"
              title="喀什小镇 VR 体验视频"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"
              allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"
            />
          </div>
          <footer class="vr-footer">
            <a
              class="vr-external-link"
              href="https://www.bilibili.com/video/BV16mGM6xEBA/"
              target="_blank"
              rel="noreferrer"
            >在哔哩哔哩打开</a>
            <button class="vr-start-button" type="button" @click="handleStartGame">开始游戏</button>
          </footer>
        </div>
      </section>
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
.vr-fade-enter-active, .vr-fade-leave-active { transition: opacity 220ms ease; }
.vr-fade-enter-from, .vr-fade-leave-to { opacity: 0; }

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

.vr-button { position: absolute; top: calc(clamp(120px, 15vh, 180px) + 104px); right: clamp(24px, 3vw, 58px); z-index: 24; display: grid; place-items: center; width: 96px; height: 96px; padding: 0; border: 0; background: transparent; cursor: pointer; transition: transform 220ms ease, filter 220ms ease; }
.vr-button img { display: block; width: 100%; height: 100%; object-fit: contain; }
.vr-button:hover, .vr-button:focus-visible { transform: translateY(-3px) scale(1.06); filter: drop-shadow(0 5px 8px rgba(69, 38, 17, .35)); }
.vr-button:focus-visible, .vr-close:focus-visible, .vr-start-button:focus-visible, .vr-external-link:focus-visible { outline: 2px solid #f4d48e; outline-offset: 4px; }

.vr-overlay { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 24px; background: rgba(18, 13, 10, .78); backdrop-filter: blur(5px); }
.vr-dialog { width: min(980px, 100%); overflow: hidden; border: 1px solid rgba(225, 177, 94, .8); border-radius: 8px; background: #241912; box-shadow: 0 22px 70px rgba(0, 0, 0, .55), inset 0 0 0 1px rgba(255, 236, 190, .12); }
.vr-header, .vr-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 16px; color: #f4dfb5; }
.vr-header { border-bottom: 1px solid rgba(225, 177, 94, .25); }
.vr-header h2 { margin: 0; font: 700 18px/1.25 'Songti SC', Georgia, serif; }
.vr-close { display: grid; place-items: center; width: 36px; height: 36px; padding: 0; border: 1px solid rgba(244, 212, 142, .48); border-radius: 4px; color: #f4dfb5; background: rgba(255, 255, 255, .06); font: 26px/1 sans-serif; cursor: pointer; }
.vr-player { width: 100%; aspect-ratio: 16 / 9; background: #000; }
.vr-player iframe { display: block; width: 100%; height: 100%; border: 0; }
.vr-footer { border-top: 1px solid rgba(225, 177, 94, .25); }
.vr-external-link { color: #e7c78c; font: 14px/1.4 'Songti SC', Georgia, serif; }
.vr-start-button { min-height: 40px; padding: 0 20px; border: 1px solid #e9bd69; border-radius: 4px; color: #3e2714; background: linear-gradient(180deg, #f8d991, #dca64e); box-shadow: inset 0 0 0 1px rgba(255, 250, 220, .45); font: 700 15px/1 'Songti SC', Georgia, serif; cursor: pointer; }
.vr-start-button:hover { filter: brightness(1.08); }

@media (max-width: 700px) {
  .vr-button { top: calc(11vh + 84px); right: 18px; width: 78px; height: 78px; }
}

.start-button {
  position: absolute;
  z-index: 20;
  top: 38%;
  left: 50%;
  width: clamp(320px, 29vw, 450px);
  aspect-ratio: 3 / 1;
  padding: 0;
  border: 0;
  background: transparent;
  opacity: 0;
  cursor: pointer;
  transform: translateX(-50%);
  transition: opacity 260ms ease, filter 200ms ease;
  -webkit-tap-highlight-color: transparent;
}

.start-button.is-ready {
  opacity: 1;
}

.button-art {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  transform: translateY(0);
  animation: button-float 3.6s ease-in-out infinite;
  transition: transform 120ms ease-out, filter 180ms ease;
}

.button-art img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
}

.button-art::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  opacity: 0;
  background: linear-gradient(105deg, transparent 39%, rgba(255, 245, 201, 0.26) 50%, transparent 61%);
  -webkit-mask-image: var(--button-mask);
  mask-image: var(--button-mask);
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  transform: translateX(-110%);
}

.start-button:hover .button-art,
.start-button:focus-visible .button-art {
  animation: button-glow 1.3s ease-in-out infinite;
  transform: translateY(-3px) scale(1.045);
}

.start-button:hover .button-art::after,
.start-button:focus-visible .button-art::after {
  animation: button-sheen 850ms ease-out 1;
}

.start-button:active .button-art {
  animation: none;
  transform: translateY(0) scale(0.98);
  filter: brightness(1.06);
  transition-duration: 100ms;
}

.start-button:focus-visible {
  outline: none;
}

.start-button:focus-visible .button-art {
  filter: brightness(1.12) drop-shadow(0 0 10px rgba(247, 200, 112, 0.55));
}

@keyframes button-float {
  0%, 100% { transform: translateY(2px); }
  50% { transform: translateY(-2px); }
}

@keyframes button-glow {
  0%, 100% {
    filter: brightness(1.08) drop-shadow(0 0 5px rgba(247, 200, 112, 0.32));
  }
  50% {
    filter: brightness(1.15) drop-shadow(0 0 12px rgba(247, 200, 112, 0.48));
  }
}

@keyframes button-sheen {
  0% { opacity: 0; transform: translateX(-110%); }
  25% { opacity: 1; }
  75% { opacity: 1; }
  100% { opacity: 0; transform: translateX(110%); }
}

@media (max-width: 600px) {
  .vr-overlay { padding: 14px; }
  .vr-header, .vr-footer { padding: 10px 12px; }
  .vr-header h2 { font-size: 16px; }
  .vr-external-link { font-size: 12px; }
  .vr-start-button { min-height: 36px; padding: 0 14px; font-size: 14px; }
  .start-button {
    top: 38%;
    width: min(74vw, 390px);
  }
}

@media (max-height: 800px) and (min-width: 601px) {
  .start-button { top: 37%; }
}

@media (prefers-reduced-motion: reduce) {
  .start-button,
  .button-art,
  .button-art::after {
    animation: none !important;
    transition-duration: 0.01ms;
  }

  .start-button:hover .button-art,
  .start-button:focus-visible .button-art {
    transform: translateY(-2px);
    filter: brightness(1.1) drop-shadow(0 0 6px rgba(247, 200, 112, 0.4));
  }
}
</style>
