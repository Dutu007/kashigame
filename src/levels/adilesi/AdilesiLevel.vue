<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/** 通知容器返回地图探索（关卡由容器卸载，卸载时会自动销毁 Phaser 实例）。 */
const emit = defineEmits(['exit'])
import CraftWorkshop from './components/CraftWorkshop.vue'
import CultureDiscovery from './components/CultureDiscovery.vue'
import DialoguePanel from './components/DialoguePanel.vue'
import ExitConfirm from './components/ExitConfirm.vue'
import GameHud from './components/GameHud.vue'
import PauseMenu from './components/PauseMenu.vue'
import QuestDialogue from './components/QuestDialogue.vue'
import RewardPanel from './components/RewardPanel.vue'
import StartScreen from './components/StartScreen.vue'
import ValvePuzzle from './components/ValvePuzzle.vue'
import { createGame } from './game/createGame.js'
import { gameBus } from './game/eventBus.js'
import { createInitialState, LEVEL_STEPS, transition } from './game/levelMachine.js'
import { getMasterHint } from './game/missionGuidance.js'
import { cultureDiscoveries, npcScenes } from './data/missionContent.js'

const level = ref(createInitialState())
const gameContainer = ref(null)
const gameVisible = ref(false)
const nearTarget = ref(null)
const questDialogue = ref(null)
const questDialogueEvent = ref(null)
const cultureDiscovery = ref(null)
const valvePuzzle = ref(false)
const craftResult = ref({ style: {}, className: '' })
const paused = ref(false)
const exitConfirm = ref(false)
const introCardVisible = ref(false)
const cleanups = []
let game = null

const step = computed(() => level.value.step)
const isCrafting = computed(() => [
  LEVEL_STEPS.PATTERN,
  LEVEL_STEPS.TYING,
  LEVEL_STEPS.DYEING,
  LEVEL_STEPS.REVEAL,
].includes(step.value))
const isModalStep = computed(() => [
  LEVEL_STEPS.DIALOGUE,
  LEVEL_STEPS.PATTERN,
  LEVEL_STEPS.TYING,
  LEVEL_STEPS.DYEING,
  LEVEL_STEPS.REVEAL,
  LEVEL_STEPS.REWARD,
  LEVEL_STEPS.COMPLETE,
].includes(step.value))

function send(type, payload = {}) {
  level.value = transition(level.value, { type, ...payload })
  gameBus.emit('mission-updated', level.value)
}

async function startLevel() {
  send('START')
  gameVisible.value = true
  introCardVisible.value = true
  await nextTick()
  game = createGame(gameContainer.value)
  window.setTimeout(() => { introCardVisible.value = false }, 1850)
}

function finishDialogue() {
  send('DIALOGUE_FINISHED')
}

function openQuestDialogue(scene, nextEvent = null, portrait = '/assets/characters/npc/master-ayti.png') {
  questDialogue.value = { ...scene, portrait }
  questDialogueEvent.value = nextEvent
}

function finishQuestDialogue() {
  const event = questDialogueEvent.value
  questDialogue.value = null
  questDialogueEvent.value = null
  if (event) send(event)
}

function handleNpcInteraction(npc) {
  if (npc === 'master' && step.value === LEVEL_STEPS.EXPLORE) {
    send('TALK_TO_MASTER')
    return
  }
  if (npc === 'master' && step.value === LEVEL_STEPS.RETURN_MASTER) {
    openQuestDialogue(npcScenes.returnMaster, 'TALK_TO_MASTER')
    return
  }
  if (npc === 'master' && step.value === LEVEL_STEPS.ACCEPTANCE) {
    openQuestDialogue(npcScenes.acceptance, 'TALK_TO_MASTER')
    return
  }
  if (npc === 'master') {
    openQuestDialogue({
      speaker: '阿依提老师傅',
      text: getMasterHint(step.value, level.value.inventory),
      action: '继续任务',
    })
  }
}

function openValvePuzzle() {
  valvePuzzle.value = true
}

function finishValvePuzzle() {
  valvePuzzle.value = false
  send('OPEN_WATER')
}

function collectSilk(itemId) {
  const firstBundle = level.value.inventory.silk.length === 0
  send('COLLECT_SILK', { itemId })
  // 每次拾取都播放收集音效，第一个额外弹出文化线索弹窗
  const pickup = new Audio('/assets/audio/pickup.wav')
  pickup.volume = 0.8
  pickup.play().catch(() => {})
  if (firstBundle) cultureDiscovery.value = cultureDiscoveries.silk
}

function collectPattern() {
  send('COLLECT_PATTERN')
  cultureDiscovery.value = cultureDiscoveries.pattern
}

function finishReveal(result) {
  craftResult.value = {
    style: result?.style || {},
    className: result?.className || '',
  }
  send('REVEAL_COMPLETED')
  gameBus.emit('level-complete')
}

function openExitConfirm() {
  exitConfirm.value = true
}

function closeExitConfirm() {
  exitConfirm.value = false
}

function resumeGame() {
  paused.value = false
}

function togglePause() {
  if (!gameVisible.value || isModalStep.value || exitConfirm.value || valvePuzzle.value) return
  paused.value = !paused.value
}

function destroyGame() {
  game?.destroy(true)
  game = null
  gameVisible.value = false
  nearTarget.value = null
  questDialogue.value = null
  cultureDiscovery.value = null
  valvePuzzle.value = false
  craftResult.value = { style: {}, className: '' }
  paused.value = false
  exitConfirm.value = false
}

function returnToTitle() {
  // 容器模式下：退出关卡回到地图探索，Phaser 实例由组件卸载时的 onBeforeUnmount 清理
  emit('exit')
}

async function restartLevel() {
  destroyGame()
  send('RESET')
  await nextTick()
  startLevel()
}

watch(
  [step, paused, exitConfirm, questDialogue, cultureDiscovery, valvePuzzle],
  () => {
    const worldSteps = [
      LEVEL_STEPS.EXPLORE,
      LEVEL_STEPS.COLLECT_SILK,
      LEVEL_STEPS.FIND_PATTERN,
      LEVEL_STEPS.RETURN_MASTER,
      LEVEL_STEPS.OPEN_VALVE,
      LEVEL_STEPS.ACCEPTANCE,
    ]
    const enabled = worldSteps.includes(step.value)
      && !paused.value && !exitConfirm.value && !questDialogue.value && !cultureDiscovery.value && !valvePuzzle.value
    gameBus.emit('controls-enabled', enabled)
  },
  { flush: 'post' },
)

onMounted(() => {
  cleanups.push(
    gameBus.on('intro-finished', () => {
      if (step.value === LEVEL_STEPS.INTRO) send('INTRO_FINISHED')
    }),
    gameBus.on('interactable-changed', (target) => { nearTarget.value = target }),
    gameBus.on('request-npc-interaction', handleNpcInteraction),
    gameBus.on('collect-silk', collectSilk),
    gameBus.on('collect-pattern', collectPattern),
    gameBus.on('request-valve-puzzle', openValvePuzzle),
    gameBus.on('toggle-pause', togglePause),
  )
})

onBeforeUnmount(() => {
  cleanups.forEach((cleanup) => cleanup())
  destroyGame()
})
</script>

<template>
  <main class="app-shell">
    <StartScreen v-if="step === LEVEL_STEPS.TITLE" @start="startLevel" @back="emit('exit')" />

    <section v-show="gameVisible" class="game-stage" aria-label="艾德莱斯绸染坊关卡">
      <div ref="gameContainer" class="phaser-container"></div>
      <div class="cinematic-vignette" aria-hidden="true"></div>

      <GameHud
        v-if="step !== LEVEL_STEPS.INTRO"
        :step="step"
        :inventory="level.inventory"
        :near-target="nearTarget"
        @exit="openExitConfirm"
      />

      <Transition name="chapter-card">
        <div v-if="introCardVisible" class="intro-card">
          <span>第一章</span>
          <h2>艾德莱斯绸</h2>
          <p>色彩的记忆</p>
        </div>
      </Transition>

      <DialoguePanel v-if="step === LEVEL_STEPS.DIALOGUE" @complete="finishDialogue" />
      <QuestDialogue
        v-if="questDialogue && step !== LEVEL_STEPS.DIALOGUE"
        :scene="questDialogue"
        :portrait="questDialogue.portrait"
        @complete="finishQuestDialogue"
      />
      <CultureDiscovery
        v-if="cultureDiscovery"
        :item="cultureDiscovery"
        @close="cultureDiscovery = null"
      />
      <ValvePuzzle
        v-if="valvePuzzle"
        @complete="finishValvePuzzle"
      />
      <CraftWorkshop
        v-if="isCrafting"
        :step="step"
        @pattern-complete="send('PATTERN_COMPLETED')"
        @tying-complete="send('TYING_COMPLETED')"
        @dyeing-complete="send('DYEING_COMPLETED')"
        @reveal-complete="finishReveal"
      />
      <RewardPanel
        v-if="step === LEVEL_STEPS.REWARD || step === LEVEL_STEPS.COMPLETE"
        :complete="step === LEVEL_STEPS.COMPLETE"
        :fabric-style="craftResult.style"
        :fabric-class="craftResult.className"
        @accept="send('REWARD_ACCEPTED')"
        @return="returnToTitle"
      />
      <PauseMenu v-if="paused" @resume="resumeGame" @restart="restartLevel" @exit="returnToTitle" />
      <ExitConfirm v-if="exitConfirm" @cancel="closeExitConfirm" @confirm="returnToTitle" />
    </section>
  </main>
</template>
