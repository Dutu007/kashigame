<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { masterDialogue } from '../data/dialogue.js'
import { playAmbient, stopAmbient } from '../game/ambientAudio.js'

const emit = defineEmits(['complete'])
const index = ref(0)
const visibleText = ref('')
const typing = ref(false)
let timer = null

const line = computed(() => masterDialogue[index.value])
const isMaster = computed(() => line.value.speaker === '阿依提老师傅')

function clearTyping() {
  if (timer) window.clearInterval(timer)
  timer = null
}

function beginTyping() {
  clearTyping()
  visibleText.value = ''
  typing.value = true
  let cursor = 0
  timer = window.setInterval(() => {
    cursor += 1
    visibleText.value = line.value.text.slice(0, cursor)
    if (cursor >= line.value.text.length) {
      clearTyping()
      typing.value = false
    }
  }, 28)
}

function advance() {
  if (typing.value) {
    clearTyping()
    visibleText.value = line.value.text
    typing.value = false
    return
  }
  if (index.value === masterDialogue.length - 1) {
    emit('complete')
    return
  }
  index.value += 1
}

watch(index, beginTyping, { immediate: true })
onMounted(() => playAmbient())
onBeforeUnmount(() => {
  clearTyping()
  stopAmbient()
})
</script>

<template>
  <div class="dialogue-layer" @click="advance">
    <div class="dialogue-panel" role="dialog" aria-live="polite" @click.stop="advance">
      <img
        :src="isMaster ? '/assets/characters/npc/master-ayti.png' : '/assets/characters/player/player-portrait.png'"
        :alt="line.speaker"
        :class="['dialogue-portrait', { 'dialogue-portrait--player': !isMaster }]"
      />
      <div class="dialogue-panel__body">
        <div class="speaker-name">{{ line.speaker }}</div>
        <p>{{ visibleText }}<span v-if="typing" class="typing-caret">▌</span></p>
        <div class="dialogue-panel__footer">
          <span>{{ index + 1 }} / {{ masterDialogue.length }}</span>
          <button type="button">{{ typing ? '显示全文' : index === masterDialogue.length - 1 ? '接受考验' : '继续' }} <b>›</b></button>
        </div>
      </div>
    </div>
  </div>
</template>
