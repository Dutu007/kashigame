/**
 * 应用入口。
 *
 * 创建 Phaser 游戏实例并注册全部场景，是浏览器加载的唯一入口模块。
 */
import Phaser from 'phaser'
import { createGameConfig } from './config/gameConfig'
import { BootScene } from './scenes/BootScene'
import { TitleScene } from './scenes/TitleScene'
import { WorldScene } from './scenes/WorldScene'

/**
 * 全局游戏实例。
 *
 * 导出以便在浏览器控制台调试，例如执行 `game.scene.start('World')` 直接跳到世界场景。
 */
export const game = new Phaser.Game(createGameConfig([BootScene, TitleScene, WorldScene]))
