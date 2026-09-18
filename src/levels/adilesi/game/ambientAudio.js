// 对话场景的林间风声 + 篝火白噪音：单例循环，避免多个对话组件重复播放
let audio = null

export function playAmbient() {
  if (audio) return
  audio = new Audio('/assets/audio/sfx/ambient-wind-fire.wav')
  audio.loop = true
  audio.volume = 0.4
  audio.preload = 'auto'
  audio.setAttribute('data-ambient', 'true')
  document.body.appendChild(audio)
  audio.play().catch((error) => {
    // 浏览器自动播放策略可能在无手势时拦截；用户点击推进对话即恢复
    console.warn('[ambient] play blocked:', error)
  })
}

export function stopAmbient() {
  if (!audio) return
  audio.pause()
  audio.currentTime = 0
  audio.remove()
  audio = null
}
