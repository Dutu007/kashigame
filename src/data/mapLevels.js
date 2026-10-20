import { mapVisuals } from './mapVisuals'

// Existing map entry policy: both implemented chapters are available via entry=map.
// See game/shared/app.js; do not substitute the campaign menu's progression policy.
export const mapLevels = [
  { id: 1, title: '织梦巷', subtitle: '纹脉', chapter: 'weave', detail: '走进老织坊，辨纹、扎线、染绸，找回古老的记忆。', x: 15, y: 62, status: 'available' },
  { id: 2, title: '坎儿井', subtitle: '水脉', chapter: 'karez', detail: '制作绳梯与陶灯，深入暗渠，让水流重新回到小镇。', x: 19, y: 23, status: 'available' },
  { id: 3, title: '喀什巴扎', subtitle: '市集寻味', detail: '彩棚下香料与瓜果相映，铜器与织物诉说丝路烟火。', x: 50, y: 43, status: 'developing' },
  { id: 4, title: '土陶工坊', subtitle: '指尖匠心', detail: '泥土在指尖成形，窑火映亮古城世代相传的手艺。', x: 83, y: 22, status: 'developing' },
  { id: 5, title: '木卡姆庭院', subtitle: '丝路乐声', detail: '都塔尔与达甫手鼓声声相和，歌舞点亮古城庭院。', x: 88, y: 63, status: 'developing' },
].map(level => ({ ...level, ...mapVisuals[level.id] }))
