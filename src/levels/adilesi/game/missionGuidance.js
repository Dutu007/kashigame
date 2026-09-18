import { LEVEL_STEPS } from './levelMachine.js'

const objectiveCopy = {
  [LEVEL_STEPS.INTRO]: '走进丝路染坊',
  [LEVEL_STEPS.EXPLORE]: '靠近阿依提老师傅并按 E 交谈',
  [LEVEL_STEPS.DIALOGUE]: '聆听老师傅讲述艾德莱斯绸',
  [LEVEL_STEPS.FIND_PATTERN]: '到最右侧的木台上取回纹样样本',
  [LEVEL_STEPS.RETURN_MASTER]: '把材料和纹样样本交给老师傅',
  [LEVEL_STEPS.OPEN_VALVE]: '到染缸旁按口诀转动水阀',
  [LEVEL_STEPS.PATTERN]: '辨认传统流动纹样',
  [LEVEL_STEPS.TYING]: '选择三个位置完成扎结',
  [LEVEL_STEPS.DYEING]: '按“靛蓝—红色—黄色”顺序染色',
  [LEVEL_STEPS.REVEAL]: '展开绸布，见证纹样显现',
  [LEVEL_STEPS.ACCEPTANCE]: '请老师傅验收成品',
  [LEVEL_STEPS.REWARD]: '领取《艾德莱斯绸图鉴》',
  [LEVEL_STEPS.COMPLETE]: '前往染坊出口完成第一章',
}

export function getObjective(step, inventory = { silk: [] }) {
  if (step === LEVEL_STEPS.COLLECT_SILK) {
    const count = inventory.silk?.length || 0
    return count === 0
      ? '蚕丝束被风挂上了高处的木台——跳上去取回它们（0 / 3）'
      : `收集蚕丝束：跳上木台逐个取回（${count} / 3）`
  }
  return objectiveCopy[step] || '探索染坊'
}

export function getNpcMarker(step, npc) {
  if (npc !== 'master') return ''
  if (step === LEVEL_STEPS.EXPLORE) return '!'
  if ([LEVEL_STEPS.RETURN_MASTER, LEVEL_STEPS.ACCEPTANCE].includes(step)) return '?'
  return '…'
}

export function getMasterHint(step, inventory = { silk: [] }) {
  if (step === LEVEL_STEPS.COLLECT_SILK) {
    const count = inventory.silk?.length || 0
    if (count === 0) return '蚕丝束悬在高处的木台上：第一束在左侧矮台，第二束在中段木台，最高那束要踩着前两个木台一路跳过去。'
    if (count === 1) return '中段的木台稍高一些，起跳前先助跑几步，落点会更稳。'
    return '最后一束在最高的染架上——先跳上中段木台，再向高处起跳。'
  }
  if (step === LEVEL_STEPS.FIND_PATTERN) return '纹样样本就在最右侧的木台上，同样需要跳上去取。'
  if (step === LEVEL_STEPS.OPEN_VALVE) return '水阀的纹样锁按“水波—石榴—巴旦木”的次序转动三枚纹样轮即可开启。'
  if ([LEVEL_STEPS.PATTERN, LEVEL_STEPS.TYING, LEVEL_STEPS.DYEING].includes(step)) {
    return '慢慢来，艾德莱斯绸的纹样正是由扎结与分层染色共同形成的。'
  }
  return '老师傅会告诉你下一步。'
}
