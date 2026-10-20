import musicUrl from '../assets/audio/background.mp3'

const DEFAULT_VOLUME = 0.24
const FADE_IN_DURATION = 1500

let audio = null
let fadeFrame = null
let unlockCleanup = null
let fadeToken = 0
let isFadingOut = false
let volumeBeforeDuck = null

function getAudio() {
  if (audio) return audio

  audio = new Audio(musicUrl)
  audio.loop = true
  audio.preload = 'auto'
  audio.volume = 0
  audio.addEventListener('error', () => {
    console.error('背景音乐加载失败：视频背景音乐.mp3')
  })

  return audio
}

function cancelFade() {
  fadeToken += 1
  if (fadeFrame !== null) {
    window.cancelAnimationFrame(fadeFrame)
    fadeFrame = null
  }
}

function fadeTo(target, duration, onComplete) {
  const player = getAudio()
  const startVolume = player.volume
  const startedAt = performance.now()
  const token = ++fadeToken

  if (duration <= 0 || startVolume === target) {
    player.volume = target
    onComplete?.()
    return
  }

  const step = (now) => {
    if (token !== fadeToken) return

    const progress = Math.min(1, (now - startedAt) / duration)
    const eased = progress * progress * (3 - 2 * progress)
    player.volume = Math.max(0, Math.min(DEFAULT_VOLUME, startVolume + (target - startVolume) * eased))

    if (progress < 1) {
      fadeFrame = window.requestAnimationFrame(step)
    } else {
      fadeFrame = null
      onComplete?.()
    }
  }

  fadeFrame = window.requestAnimationFrame(step)
}

function removeUnlockListeners() {
  unlockCleanup?.()
  unlockCleanup = null
}

function play(options = {}) {
  const player = getAudio()
  const fadeIn = options.fadeIn !== false
  isFadingOut = false

  cancelFade()
  if (fadeIn) player.volume = 0
  else player.volume = DEFAULT_VOLUME

  const result = player.play()
  if (!result || typeof result.then !== 'function') {
    if (fadeIn) fadeTo(DEFAULT_VOLUME, FADE_IN_DURATION)
    removeUnlockListeners()
    return Promise.resolve(true)
  }

  return result.then(() => {
    removeUnlockListeners()
    if (fadeIn && !isFadingOut) fadeTo(DEFAULT_VOLUME, FADE_IN_DURATION)
    return true
  }).catch(() => {
    // Autoplay can be rejected until the user interacts with the page.
    return false
  })
}

function bindUserInteraction(target = document) {
  removeUnlockListeners()

  const tryUnlock = () => {
    play({ fadeIn: true })
  }
  const events = ['pointerdown', 'touchstart', 'keydown']
  events.forEach((eventName) => target.addEventListener(eventName, tryUnlock, { capture: true, once: true }))

  unlockCleanup = () => {
    events.forEach((eventName) => target.removeEventListener(eventName, tryUnlock, { capture: true }))
  }

  return unlockCleanup
}

function fadeOut(duration = 800) {
  const player = getAudio()
  isFadingOut = true
  removeUnlockListeners()
  cancelFade()
  fadeTo(0, duration, () => {
    player.pause()
    player.currentTime = 0
  })
}

function duck(factor = 0.88, duration = 240) {
  const player = getAudio()
  volumeBeforeDuck ??= player.volume > 0 ? player.volume : DEFAULT_VOLUME
  cancelFade()
  fadeTo(volumeBeforeDuck * factor, duration)
}

function restoreVolume(duration = 240) {
  const target = volumeBeforeDuck ?? DEFAULT_VOLUME
  volumeBeforeDuck = null
  cancelFade()
  fadeTo(target, duration)
}

function cleanup() {
  removeUnlockListeners()
  cancelFade()
  isFadingOut = false
  if (audio) {
    audio.pause()
    audio.currentTime = 0
    audio.volume = 0
  }
  volumeBeforeDuck = null
}

export default {
  play,
  bindUserInteraction,
  fadeOut,
  duck,
  restoreVolume,
  cleanup,
}
