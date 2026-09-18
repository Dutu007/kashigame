/**
 * 启动场景。
 *
 * 承担最早期的初始化工作，当前不加载任何资源以保持启动最快，随后立即切换到标题场景。
 * 后续如需读取本地存档、初始化全局系统，都在这里完成。
 */
import Phaser from 'phaser'
import { SceneKeys } from '../config/constants'

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot)
  }

  /**
   * 场景创建时调用。当前无初始化任务，直接跳转标题场景。
   *
   * @returns 无返回值。
   */
  create(): void {
    this.scene.start(SceneKeys.Title)
  }
}
