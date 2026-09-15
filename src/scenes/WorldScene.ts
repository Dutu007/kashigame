/**
 * 世界场景。
 *
 * 负责装配一条街区：视差背景层、可行走带、角色与界面提示。
 *
 * 当前为占位实现，全部使用色块绘制，目的仅是验证渲染管线、输入响应与相机跟随是否正常。
 * 街区正式落地时，这里会改为读取 `src/data/districts/` 下的数据来装配背景层、交互物与触发区，
 * 而场景类本身不再随街区数量增长。
 */
import Phaser from 'phaser'
import { Depth, GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../config/constants'

/** 占位世界的横向宽度（像素），约 2.5 屏，用于验证相机跟随与视差效果。 */
const WORLD_WIDTH = 4800

/** 地面带上边缘的世界 y 坐标，角色站在这条线之上。 */
const GROUND_TOP_Y = 880

/** 角色行走速度（像素/秒）。 */
const WALK_SPEED = 420

/** 角色占位宽度（像素）。 */
const PLAYER_WIDTH = 70

/** 角色占位高度（像素）。 */
const PLAYER_HEIGHT = 150

/**
 * 占位配色。
 *
 * 取自喀什古城常见的夯土墙与沙色天空，仅在美术资源到位前使用。
 */
const PALETTE = {
  /** 天空底色。 */
  sky: 0xf0d9b5,
  /** 远景土房剪影。 */
  farBuilding: 0xc2a077,
  /** 中景主街建筑。 */
  midBuilding: 0xd8b98c,
  /** 建筑门窗。 */
  window: 0x6b4a30,
  /** 地面。 */
  ground: 0xb08c5f,
  /** 地面高光线。 */
  groundLine: 0x8a6a45,
  /** 角色静止时的颜色。 */
  playerIdle: 0xe4572e,
  /** 角色行走时的颜色。 */
  playerWalking: 0xf2a03d,
} as const

/**
 * 单排占位建筑的样式与布局参数。
 */
interface BuildingRowOptions {
  /** 视差系数，0 表示完全固定，1 表示与相机等速。 */
  scrollFactor: number
  /** 建筑填充色。 */
  color: number
  /** 建筑底边所在的世界 y 坐标。 */
  baseY: number
  /** 单栋建筑高度区间 `[最小, 最大]`（像素）。 */
  heightRange: [number, number]
  /** 单栋建筑宽度区间 `[最小, 最大]`（像素）。 */
  widthRange: [number, number]
  /** 该排建筑的渲染深度。 */
  depth: number
}

export class WorldScene extends Phaser.Scene {
  /** 角色占位图形。 */
  private player!: Phaser.GameObjects.Rectangle

  /** 方向键。 */
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

  /** A 键，方向键的替代输入。 */
  private keyA!: Phaser.Input.Keyboard.Key

  /** D 键，方向键的替代输入。 */
  private keyD!: Phaser.Input.Keyboard.Key

  /** 当前朝向，-1 向左、0 静止、1 向右。 */
  private facingDirection = 0

  constructor() {
    super(SceneKeys.World)
  }

  /**
   * 场景创建时调用：设置世界边界，装配背景与角色，并让相机跟随角色。
   *
   * @returns 无返回值。
   */
  create(): void {
    this.facingDirection = 0

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT)
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT)

    this.buildBackground()
    this.createPlayer()
    this.createHud()

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
  }

  /**
   * 每帧调用：按输入更新角色的水平速度与朝向表现。
   *
   * 纵向速度不予处理，因为占位关卡不涉及跳跃与坠落，角色始终停留在可行走带上。
   *
   * @returns 无返回值。
   */
  override update(): void {
    const goingLeft = this.cursors.left.isDown || this.keyA.isDown
    const goingRight = this.cursors.right.isDown || this.keyD.isDown

    let direction = 0
    if (goingLeft !== goingRight) {
      direction = goingRight ? 1 : -1
    }

    this.getPlayerBody().setVelocityX(direction * WALK_SPEED)

    // 仅在朝向变化时改色，避免每帧调用 setFillStyle
    if (direction !== this.facingDirection) {
      this.facingDirection = direction
      const color = direction === 0 ? PALETTE.playerIdle : PALETTE.playerWalking
      this.player.setFillStyle(color)
    }
  }

  /**
   * 装配占位背景：天空、两层视差建筑与地面带。
   *
   * @returns 无返回值。
   */
  private buildBackground(): void {
    // 天空固定不随相机移动
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.sky)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(Depth.Sky)

    // 远景土房剪影，视差系数最小，移动最慢，营造纵深
    this.buildBuildingRow({
      scrollFactor: 0.3,
      color: PALETTE.farBuilding,
      baseY: GROUND_TOP_Y - 60,
      heightRange: [220, 420],
      widthRange: [180, 380],
      depth: Depth.Far,
    })

    // 中景主街建筑
    this.buildBuildingRow({
      scrollFactor: 0.65,
      color: PALETTE.midBuilding,
      baseY: GROUND_TOP_Y,
      heightRange: [300, 560],
      widthRange: [220, 460],
      depth: Depth.Mid,
    })

    // 地面带
    this.add
      .rectangle(0, GROUND_TOP_Y, WORLD_WIDTH, GAME_HEIGHT - GROUND_TOP_Y, PALETTE.ground)
      .setOrigin(0, 0)
      .setDepth(Depth.Ground)

    // 地面高光线，标出可行走带的上边缘
    this.add
      .rectangle(0, GROUND_TOP_Y, WORLD_WIDTH, 6, PALETTE.groundLine)
      .setOrigin(0, 0)
      .setDepth(Depth.Ground)
  }

  /**
   * 计算某一视差层需要覆盖的横向世界坐标范围。
   *
   * 视差层实际参与位移的距离为「(世界宽度 - 一屏宽度) × 视差系数」，
   * 再加上一屏本身的可见宽度，即为该层需要生成的跨度。
   *
   * @param scrollFactor 视差系数，0 表示完全固定，1 表示与相机等速。
   * @returns 该层需要生成的横向像素跨度。
   */
  private layerSpan(scrollFactor: number): number {
    return (WORLD_WIDTH - GAME_WIDTH) * scrollFactor + GAME_WIDTH
  }

  /**
   * 生成一排占位建筑。
   *
   * 仅在美术资源到位前用于验证视差与相机跟随，后续由街区数据替换。
   *
   * @param options 该排建筑的样式与布局参数。
   * @returns 无返回值，矩形对象直接加入场景。
   */
  private buildBuildingRow(options: BuildingRowOptions): void {
    const { scrollFactor, color, baseY, heightRange, widthRange, depth } = options
    const span = this.layerSpan(scrollFactor)

    let cursorX = 0

    while (cursorX < span) {
      const width = Phaser.Math.Between(widthRange[0], widthRange[1])
      const height = Phaser.Math.Between(heightRange[0], heightRange[1])
      const topY = baseY - height

      this.add
        .rectangle(cursorX, topY, width, height, color)
        .setOrigin(0, 0)
        .setScrollFactor(scrollFactor)
        .setDepth(depth)

      // 建筑过窄时省略门窗细节，避免挤成一团
      if (width >= 260) {
        const windowSize = Math.round(width * 0.16)
        const windowY = topY + height * 0.3
        const windowCount = Phaser.Math.Between(1, 2)

        for (let index = 0; index < windowCount; index += 1) {
          const windowX = cursorX + width * (0.3 + index * 0.4) - windowSize / 2

          this.add
            .rectangle(windowX, windowY, windowSize, windowSize, PALETTE.window)
            .setOrigin(0, 0)
            .setScrollFactor(scrollFactor)
            .setDepth(depth + 1)
        }
      }

      cursorX += width + Phaser.Math.Between(16, 64)
    }
  }

  /**
   * 创建角色占位图形并启用物理刚体与输入监听。
   *
   * @returns 无返回值。
   */
  private createPlayer(): void {
    const startX = GAME_WIDTH / 2
    const centerY = GROUND_TOP_Y - PLAYER_HEIGHT / 2

    this.player = this.add
      .rectangle(startX, centerY, PLAYER_WIDTH, PLAYER_HEIGHT, PALETTE.playerIdle)
      .setDepth(Depth.Player)

    this.physics.add.existing(this.player)
    this.getPlayerBody().setCollideWorldBounds(true)

    // 浏览器环境一定存在键盘插件，此处断言为安全用法
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
  }

  /**
   * 创建固定在屏幕上的操作提示。
   *
   * @returns 无返回值。
   */
  private createHud(): void {
    this.add
      .text(GAME_WIDTH / 2, 48, '占位骨架 · 按 ← → 或 A D 沿街巷行走', {
        fontFamily: 'sans-serif',
        fontSize: '36px',
        color: '#5c4326',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(Depth.Ui)
  }

  /**
   * 获取角色对应的 Arcade 刚体。
   *
   * @returns 角色的 Arcade 刚体，用于设置速度与边界碰撞。
   */
  private getPlayerBody(): Phaser.Physics.Arcade.Body {
    return this.player.body as Phaser.Physics.Arcade.Body
  }
}
