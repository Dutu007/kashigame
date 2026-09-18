/**
 * 关卡注册表。
 *
 * 新增一个关卡只需要两步：
 * 1. 在 src/levels/<id>/ 下实现关卡组件（挂载时创建自己的 Phaser 实例，卸载时销毁，
 *    通过 emit('exit') 通知容器返回地图探索）。
 * 2. 在这里登记一条记录，并在地图探索场景的 locations 里加上对应的地点入口。
 *
 * 地图探索组件通过 emit('enter-level', levelId) 通知容器进入关卡。
 */
import AdilesiLevel from './adilesi/AdilesiLevel.vue'

export const levels = [
  {
    id: 'adilesi',
    title: '艾德莱斯绸',
    desc: '色彩的记忆 · 丝路染坊扎染体验',
    component: AdilesiLevel,
  },
  // 未来新增关卡在此追加，例如：
  // {
  //   id: 'copper',
  //   title: '铜色记忆',
  //   desc: '铜器坊纹样修复',
  //   component: CopperLevel,
  // },
]
