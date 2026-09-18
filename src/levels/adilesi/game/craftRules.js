const CORRECT_PATTERN = 'flowing-geometric'
const DYE_ORDER = Object.freeze(['indigo', 'red', 'yellow'])
const COLOR_NAMES = Object.freeze({ indigo: '靛蓝', red: '红色', yellow: '黄色' })

export function checkPattern(id) {
  if (id === CORRECT_PATTERN) {
    return {
      correct: true,
      message: '纹样选择正确：流动、对称与节奏共同构成艾德莱斯绸的视觉记忆。',
    }
  }

  return {
    correct: false,
    message: '再观察一下：传统艾德莱斯纹样强调流动的轮廓、对称关系和连续节奏。',
  }
}

export function toggleTiePoint(points, id, limit = 3) {
  if (points.includes(id)) {
    return {
      points: points.filter((point) => point !== id),
      accepted: true,
      removed: true,
    }
  }

  if (points.length >= limit) {
    return { points: [...points], accepted: false, removed: false }
  }

  return { points: [...points, id], accepted: true, removed: false }
}

export function applyDye(sequence, color) {
  const expected = DYE_ORDER[sequence.length]
  if (color !== expected) {
    return {
      sequence: [...sequence],
      accepted: false,
      message: expected
        ? `这一层应先进入${COLOR_NAMES[expected]}染缸，颜色才会形成清晰层次。`
        : '染色已经完成，可以展开绸布了。',
    }
  }

  return {
    sequence: [...sequence, color],
    accepted: true,
    message: `${COLOR_NAMES[color]}染色完成。`,
  }
}

export function isDyeComplete(sequence) {
  return DYE_ORDER.every((color, index) => sequence[index] === color)
}
