export const LEVEL_STEPS = Object.freeze({
  TITLE: 'title',
  INTRO: 'intro',
  EXPLORE: 'explore',
  DIALOGUE: 'dialogue',
  COLLECT_SILK: 'collect-silk',
  FIND_PATTERN: 'find-pattern',
  RETURN_MASTER: 'return-master',
  OPEN_VALVE: 'open-valve',
  PATTERN: 'pattern',
  TYING: 'tying',
  DYEING: 'dyeing',
  REVEAL: 'reveal',
  ACCEPTANCE: 'acceptance',
  REWARD: 'reward',
  COMPLETE: 'complete',
})

const progression = Object.freeze({
  [LEVEL_STEPS.TITLE]: { START: LEVEL_STEPS.INTRO },
  [LEVEL_STEPS.INTRO]: { INTRO_FINISHED: LEVEL_STEPS.EXPLORE },
  [LEVEL_STEPS.EXPLORE]: { TALK_TO_MASTER: LEVEL_STEPS.DIALOGUE },
  [LEVEL_STEPS.DIALOGUE]: { DIALOGUE_FINISHED: LEVEL_STEPS.COLLECT_SILK },
  [LEVEL_STEPS.COLLECT_SILK]: {},
  [LEVEL_STEPS.FIND_PATTERN]: { COLLECT_PATTERN: LEVEL_STEPS.RETURN_MASTER },
  [LEVEL_STEPS.RETURN_MASTER]: { TALK_TO_MASTER: LEVEL_STEPS.OPEN_VALVE },
  [LEVEL_STEPS.OPEN_VALVE]: { OPEN_WATER: LEVEL_STEPS.PATTERN },
  [LEVEL_STEPS.PATTERN]: { PATTERN_COMPLETED: LEVEL_STEPS.TYING },
  [LEVEL_STEPS.TYING]: { TYING_COMPLETED: LEVEL_STEPS.DYEING },
  [LEVEL_STEPS.DYEING]: { DYEING_COMPLETED: LEVEL_STEPS.REVEAL },
  [LEVEL_STEPS.REVEAL]: { REVEAL_COMPLETED: LEVEL_STEPS.ACCEPTANCE },
  [LEVEL_STEPS.ACCEPTANCE]: { TALK_TO_MASTER: LEVEL_STEPS.REWARD },
  [LEVEL_STEPS.REWARD]: { REWARD_ACCEPTED: LEVEL_STEPS.COMPLETE },
  [LEVEL_STEPS.COMPLETE]: {},
})

export function createInitialState() {
  return {
    step: LEVEL_STEPS.TITLE,
    feedback: '',
    collectionUnlocked: false,
    inventory: { silk: [], pattern: false },
  }
}

export function transition(state, event) {
  if (event.type === 'RESET') return createInitialState()

  if (event.type === 'RETRY') {
    return { ...state, feedback: event.message || '再试一次。' }
  }

  if (state.step === LEVEL_STEPS.COLLECT_SILK && event.type === 'COLLECT_SILK') {
    const silk = event.itemId && !state.inventory.silk.includes(event.itemId)
      ? [...state.inventory.silk, event.itemId]
      : state.inventory.silk
    return {
      ...state,
      step: silk.length === 3 ? LEVEL_STEPS.FIND_PATTERN : state.step,
      inventory: { ...state.inventory, silk },
      feedback: '',
    }
  }

  if (state.step === LEVEL_STEPS.FIND_PATTERN && event.type === 'COLLECT_PATTERN') {
    return {
      ...state,
      step: LEVEL_STEPS.RETURN_MASTER,
      inventory: { ...state.inventory, pattern: true },
      feedback: '',
    }
  }

  const nextStep = progression[state.step]?.[event.type]
  if (!nextStep) {
    return { ...state, feedback: '当前步骤尚未完成，请按照任务提示继续。' }
  }

  return {
    ...state,
    step: nextStep,
    feedback: '',
    collectionUnlocked:
      state.collectionUnlocked || event.type === 'REVEAL_COMPLETED',
  }
}
