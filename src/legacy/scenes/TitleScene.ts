/**
 * 标题场景。
 *
 * 显示游戏名与开始提示，接受键盘或指针输入后进入世界场景。
 */
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../config/constants'

export class TitleScene extends Phaser.Scene {
  /**
   * 开始标记。
   *
   * 键盘与指针监听同时存在，任一触发都会调用 startGame，
   * 用此标记防止世界场景被重复启动。
   */
  private started = false

  constructor() {
    super(SceneKeys.Title)
  }

  /**
   * 场景创建时调用：绘制标题文字并注册开始输入。
   *
   * @returns 无返回值。
   */
  create(): void {
    // 场景实例会被复用，重新进入时需要重置标记
    this.started = false

    const centerX = GAME_WIDTH / 2
    const centerY = GAME_HEIGHT / 2

    this.cameras.main.setBackgroundColor('#1a1410')

    this.add
      .text(centerX, centerY - 140, '喀什古城', {
        fontFamily: 'sans-serif',
        fontSize: '140px',
        color: '#e8c07d',
      })
      .setOrigin(0.5)

    this.add
      .text(centerX, centerY + 20, '横版探索 · 占位骨架', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#8a7355',
      })
      .setOrigin(0.5)

    const startHint = this.add
      .text(centerX, centerY + 260, '按任意键或点击开始', {
        fontFamily: 'sans-serif',
        fontSize: '44px',
        color: '#d9b98a',
      })
      .setOrigin(0.5)

    // 呼吸闪烁，提示可交互
    this.tweens.add({
      targets: startHint,
      alpha: 0.2,
      duration: 900,
      yoyo: true,
      repeat: -1,
    })

    this.input.keyboard?.once('keydown', () => this.startGame())
    this.input.once('pointerdown', () => this.startGame())
  }

  /**
   * 进入世界场景。重复调用会被忽略。
   *
   * @returns 无返回值。
   */
  private startGame(): void {
    if (this.started) {
      return
    }

    this.started = true
    this.scene.start(SceneKeys.World)
  }
}
