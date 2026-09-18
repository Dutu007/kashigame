/**
 * 应用入口。
 *
 * 容器壳（Vue）挂载到 #game：默认加载地图探索（主世界），
 * 在地图的特殊地点进入对应关卡，关卡退出后回到地图。
 * 所有 Phaser 游戏实例都创建在 #game 内部的容器节点上。
 */
import { createApp } from 'vue'
import App from './App.vue'
// 关卡（艾德莱斯绸）的全局样式：含场景背景、HUD、弹窗等全部关卡样式
import './levels/adilesi/styles/main.css'

createApp(App).mount('#game')
