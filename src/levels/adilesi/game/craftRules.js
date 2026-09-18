const CORRECT_PATTERN = 'flowing-geometric'
const DYE_LIMIT = 3
export const COLOR_NAMES = Object.freeze({
  indigo: '靛蓝',
  red: '绛红',
  yellow: '暖黄',
  green: '翠绿',
  purple: '茄紫',
  orange: '橘橙',
})
export const COLOR_HEX = Object.freeze({
  indigo: '#214e86',
  red: '#b52f31',
  yellow: '#dc9d2f',
  green: '#3a7d44',
  purple: '#6b3fa0',
  orange: '#e07b2a',
})

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
  if (sequence.length >= DYE_LIMIT) {
    return {
      sequence: [...sequence],
      accepted: false,
      message: '已经选了三种颜色，可以展开绸布了。',
    }
  }
  if (sequence.includes(color)) {
    return {
      sequence: [...sequence],
      accepted: false,
      message: `${COLOR_NAMES[color]}已经选过了，换一种颜色试试。`,
    }
  }
  return {
    sequence: [...sequence, color],
    accepted: true,
    message: `${COLOR_NAMES[color]}染色完成（${sequence.length + 1} / ${DYE_LIMIT}）。`,
  }
}

export function isDyeComplete(sequence) {
  return sequence.length >= DYE_LIMIT
}

// 扎结点在绸布上的网格坐标（行 × 列），用于把"选了哪三个点"归类成扎结法类型
const TIE_GRID = {
  a: [0, 0], b: [0, 1], c: [0, 2],
  h: [1, 0], d: [1, 2],
  e: [2, 0], f: [2, 1], g: [2, 2],
}

export const TIE_TYPE_NAMES = Object.freeze({
  stripe: '条纹扎法',
  diagonal: '斜纹扎法',
  scatter: '散点扎法',
})

/**
 * 把 3 个扎结点归类为一种扎结法，并计算色带宽度与倾斜角度：
 * - widthRatio：扎结点之间的距离决定色带宽度比例（0.15~0.45）
 * - angle：扎结点主方向决定倾斜角度（0°=横条 / 45°=斜条 / 0°=散点）
 */
export function classifyTie(points) {
  if (!Array.isArray(points) || points.length !== 3) return null
  const cells = points.map((point) => TIE_GRID[point])
  if (cells.some((cell) => !cell)) return null

  const rows = new Set(cells.map(([row]) => row))
  const cols = new Set(cells.map(([, col]) => col))

  // 计算三点的平均跨度（决定色带宽度）
  const rowSpan = Math.max(...cells.map(([r]) => r)) - Math.min(...cells.map(([r]) => r))
  const colSpan = Math.max(...cells.map(([, c]) => c)) - Math.min(...cells.map(([, c]) => c))
  const span = Math.max(rowSpan, colSpan)
  // span=1 → 窄色带(0.18)；span=2 → 宽色带(0.38)
  const widthRatio = 0.18 + span * 0.10

  // 计算主方向（决定倾斜角度）
  let type = 'scatter'
  let angle = 0
  if (rows.size === 1 || cols.size === 1) {
    type = 'stripe'
    angle = rows.size === 1 ? 90 : 0 // 同行→横条(90°)；同列→竖条(0°)
  } else if (rows.size === 3 && cols.size === 3) {
    type = 'diagonal'
    // 根据三点重心偏移计算倾斜角（30°~60°）
    const cx = cells.reduce((s, [, c]) => s + c, 0) / 3
    const cy = cells.reduce((s, [r]) => s + r, 0) / 3
    angle = cx > 1.5 ? 50 : cx < 0.5 ? 40 : 45
  } else {
    type = 'scatter'
    angle = 0
  }

  return { type, widthRatio, angle }
}
