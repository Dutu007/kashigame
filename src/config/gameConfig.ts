/**
 * Phaser 游戏实例配置。
 *
 * 只负责组装配置对象，不含任何游戏逻辑。场景列表由调用方注入，
 * 避免配置模块反向依赖具体场景，也让尺寸等常量可被单独引用与测试。
 */
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './constants'

/**
 * 创建 Phaser 游戏配置。
 *
 * @param scene 场景列表，数组中的第一个场景会被自动启动。
 * @returns 可直接传给 `new Phaser.Game()` 的配置对象。
 */
export function createGameConfig(
  scene: Phaser.Types.Core.GameConfig['scene'],
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#1a1410',

    scale: {
      // 按比例缩放并保持宽高比，适配 H5 各种窗口尺寸
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },

    physics: {
      default: 'arcade',
      arcade: {
        // 步行模拟不涉及跳跃与坠落，纵向不受重力影响
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },

    scene,
  }
}
