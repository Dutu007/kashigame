import Phaser from 'phaser'
import { assets, framePath, audioAssets } from '../assetPaths.js'
import { gameBus } from '../eventBus.js'
import { resolvePlayerAnimation } from '../playerAnimation.js'
import { getNpcMarker } from '../missionGuidance.js'
import { LEVEL_STEPS } from '../levelMachine.js'

const WORLD_WIDTH = 2360
const WORLD_HEIGHT = 720
const GROUND_Y = 585

// 所有朝向使用一致的人物比例，保证左/右行走时人物大小、画风完全相同
const playerAnimationScales = {
  'idle-left': 0.78,
  'idle-right': 0.78,
  'walk-left': 0.8,
  'walk-right': 0.8,
  'run-left': 0.8,
  'run-right': 0.8,
  'jump-left': 0.78,
  'jump-right': 0.78,
}

// walk-left 与 walk-right 均由同一套行走图集拆帧/镜像生成，帧数一致
const animationDefinitions = {
  'idle-right': { frames: 4, rate: 3 },
  'idle-left': { frames: 4, rate: 3 },
  'walk-right': { frames: 6, rate: 9 },
  'walk-left': { frames: 6, rate: 9 },
  'run-right': { frames: 4, rate: 11 },
  'run-left': { frames: 4, rate: 11 },
  'jump-right': { frames: 4, rate: 8 },
  'jump-left': { frames: 4, rate: 8 },
}

// 跳跃平台：横向悬浮板（森林冰火人 / 冒险王式横板），地面完全通畅，跳上板取蚕丝
// topY 为板顶（台面），p1 木质横板，p2/p3/p4 石质横板；难度靠板高差递增
const platformLayout = [
  { key: 'p1', x: 1490, topY: 505, width: 200, height: 50, tex: 'prop-platform', silk: 'silk-blue' },
  { key: 'p2', x: 1755, topY: 452, width: 200, height: 50, tex: 'prop-platform-stone', silk: 'silk-red' },
  { key: 'p3', x: 2035, topY: 382, width: 200, height: 50, tex: 'prop-platform-stone', silk: 'silk-gold' },
  { key: 'p4', x: 2255, topY: 503, width: 200, height: 50, tex: 'prop-platform-stone', pattern: true },
]

export class WorkshopScene extends Phaser.Scene {
  constructor() {
    super('WorkshopScene')
    this.controlsEnabled = false
    this.direction = 'right'
    this.wasNearMaster = false
    this.currentStep = LEVEL_STEPS.INTRO
    this.inventory = { silk: [], pattern: false }
    this.activeTargetId = null
    this.cleanupCallbacks = []
  }

  preload() {
    this.load.image('workshop-background', assets.background)
    this.load.image('master-ayti', assets.master)
    this.load.image('prop-vat-yellow', assets.vatYellow)
    this.load.image('prop-platform', assets.platformWood)
    this.load.image('prop-platform-stone', assets.platformStone)
    this.load.image('prop-silk-blue', assets.silkBlue)
    this.load.image('prop-silk-red', assets.silkRed)
    this.load.image('prop-silk-gold', assets.silkGold)
    this.load.image('prop-pattern', assets.patternSample)
    this.load.image('prop-valve', assets.waterValve)
    this.load.audio('jump-whoosh', audioAssets.jumpWhoosh)

    Object.entries(animationDefinitions).forEach(([name, definition]) => {
      for (let frame = 1; frame <= definition.frames; frame += 1) {
        this.load.image(`${name}-${frame}`, framePath(name, frame))
      }
    })
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

    this.add.image(0, 0, 'workshop-background')
      .setOrigin(0)
      .setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT)

    this.createAmbientDetails()
    this.createAnimations()
    this.createGround()
    this.createCharacters()
    this.createWorkshopProps()
    this.createPlatforms()
    this.createMissionObjects()
    this.createInput()
    this.bindEvents()
    this.playIntro()
  }

  createGround() {
    const ground = this.add.rectangle(WORLD_WIDTH / 2, GROUND_Y + 38, WORLD_WIDTH, 76, 0x000000, 0)
    this.physics.add.existing(ground, true)
    this.ground = ground
  }

  createCharacters() {
    this.master = this.add.image(790, GROUND_Y, 'master-ayti')
      .setOrigin(0.5, 1)
      .setDisplaySize(142, 190)
      .setDepth(8)

    this.masterShadow = this.add.ellipse(790, GROUND_Y - 3, 105, 18, 0x3b1b12, 0.24)
      .setDepth(6)

    this.masterMarker = this.createNpcMarker(790, GROUND_Y - 212, '!')

    this.player = this.physics.add.sprite(240, GROUND_Y - 20, 'idle-right-1')
      .setOrigin(0.5, 1)
      .setDepth(10)
      .setCollideWorldBounds(true)
      .setScale(0.78)

    this.player.body.setSize(54, 118)
    this.player.body.setOffset(53, 76)
    this.player.body.setMaxVelocity(320, 700)
    this.player.body.setDragX(1500)
    this.physics.add.collider(this.player, this.ground)

    this.cameras.main.startFollow(this.player, true, 0.075, 0.075, -220, 50)
  }

  createNpcMarker(x, y, label) {
    return this.add.text(x, y, label, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '30px',
      color: '#fff2c2',
      backgroundColor: '#8f2f2b',
      padding: { left: 10, right: 10, top: 2, bottom: 3 },
      stroke: '#4b2118',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(18).setShadow(0, 5, '#2f160f', 6, true, true)
  }

  createWorkshopProps() {
    // 只保留黄色染缸，并放在水阀旁边；蓝、红染缸属于水阀设施的一部分。
    this.dyeVats = [
      this.add.image(1030, GROUND_Y + 2, 'prop-vat-yellow')
        .setDisplaySize(170, 128)
        .setOrigin(0.5, 1)
        .setDepth(5),
    ]

    // 水阀从进入染坊就存在，底边贴地，内部水流持续运行。
    // 素材底部有透明留白，向下补偿后让可见石台底部真正贴住地面。
    this.valve = this.add.image(1240, GROUND_Y + 54, 'prop-valve')
      .setDisplaySize(260, 220)
      .setOrigin(0.5, 1)
      .setDepth(5)

    this.createValveFlow()
  }

  createValveFlow() {
    // 只给 water-valve.png 内两处染液池的液面加波纹，水阀主体保持固定。
    const flowPoints = [
      { x: 137, y: 127, delay: 0 },
      { x: 137, y: 127, delay: 500 },
      { x: 207, y: 127, delay: 250 },
      { x: 207, y: 127, delay: 750 },
    ]
    this.valveFlow = flowPoints.map(({ x, y, delay }) => {
      const ripple = this.add.ellipse(this.valve.x - 130 + x, this.valve.y - 220 + y, 34, 10)
        .setStrokeStyle(2, 0xbcecff, 0.7)
        .setDepth(6)
        .setAlpha(0)
      const tween = this.tweens.add({
        targets: ripple,
        scaleX: 1.6,
        scaleY: 1.25,
        alpha: 0,
        duration: 1500,
        delay,
        repeat: -1,
        ease: 'Sine.easeOut',
        paused: true,
      })
      return { ripple, tween }
    })
  }

  setValveFlow(active) {
    if (!this.valveFlow) return
    this.valveFlow.forEach(({ ripple, tween }) => {
      if (active) {
        ripple.setAlpha(0.72)
        tween.resume()
      } else {
        tween.pause()
        ripple.setAlpha(0).setScale(1)
      }
    })
  }

  createPlatforms() {
    this.platforms = []
    platformLayout.forEach((layout) => {
      const centerY = layout.topY + layout.height / 2
      const platform = this.add.image(layout.x, centerY, layout.tex)
        .setDisplaySize(layout.width, layout.height)
        .setDepth(7)
      this.physics.add.existing(platform, true)
      // 物理体与木台可视范围一致：顶部即台面，站在上面与普通地面无异
      platform.body.setSize(layout.width, layout.height, true)
      this.physics.add.collider(this.player, platform)
      this.platforms.push({ ...layout, sprite: platform })
    })
  }

  createMissionObjects() {
    // 蚕丝束：放在不同高度的木台上，需要跳跃获取（新蚕丝束图，tint 区分三色）
    const silkDefinitions = [
      { id: 'silk-blue', texture: 'prop-silk-blue', tint: 0x88aaff },
      { id: 'silk-red', texture: 'prop-silk-red', tint: 0xff8888 },
      { id: 'silk-gold', texture: 'prop-silk-gold', tint: 0xffdd88 },
    ]
    this.silkBundles = silkDefinitions.map(({ id, texture, tint }, index) => {
      const layout = platformLayout[index]
      const sprite = this.add.image(layout.x, layout.topY - 22, texture)
        .setDisplaySize(74, 62)
        .setDepth(12)
        .setTint(tint)
      sprite.setData('id', id)
      sprite.setData('homeY', layout.topY - 22)
      this.tweens.add({
        targets: sprite,
        y: sprite.y - 8,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
      // 提示性微光，让玩家注意到高处有东西
      const glow = this.add.ellipse(layout.x, layout.topY - 26, 46, 22, 0xffe9b0, 0.22)
        .setDepth(11)
      this.tweens.add({ targets: glow, alpha: 0.5, scaleX: 1.15, duration: 800, yoyo: true, repeat: -1 })
      return sprite
    })

    // 纹样样本：放在最右侧的木台上
    const patternLayout = platformLayout.find((layout) => layout.pattern)
    this.patternSample = this.add.image(patternLayout.x, patternLayout.topY - 34, 'prop-pattern')
      .setDisplaySize(118, 96)
      .setDepth(13)
    this.tweens.add({ targets: this.patternSample, alpha: 0.62, duration: 800, yoyo: true, repeat: -1 })

    this.syncMissionObjects()
  }

  createAnimations() {
    Object.entries(animationDefinitions).forEach(([name, definition]) => {
      if (this.anims.exists(name)) return
      this.anims.create({
        key: name,
        frames: Array.from({ length: definition.frames }, (_, index) => ({
          key: `${name}-${index + 1}`,
        })),
        frameRate: definition.rate,
        repeat: name.startsWith('jump') ? 0 : -1,
        yoyo: name.startsWith('idle'),
      })
    })
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys()
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      run: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      interact: Phaser.Input.Keyboard.KeyCodes.E,
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
    })

    this.keys.interact.on('down', () => this.performInteraction())
    this.keys.escape.on('down', () => gameBus.emit('toggle-pause'))
  }

  bindEvents() {
    this.cleanupCallbacks.push(
      gameBus.on('controls-enabled', (enabled) => {
        this.controlsEnabled = enabled
        if (!enabled && this.player) this.player.setVelocityX(0)
      }),
      gameBus.on('level-complete', () => this.playCompletionMoment()),
      gameBus.on('restart-level', () => this.scene.restart()),
      gameBus.on('mission-updated', (state) => {
        this.currentStep = state.step
        this.inventory = state.inventory
        this.syncMissionObjects()
      }),
      gameBus.on('ui-interact', () => this.performInteraction()),
    )

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupCallbacks.forEach((cleanup) => cleanup())
      this.cleanupCallbacks = []
    })
  }

  syncMissionObjects() {
    if (!this.silkBundles) return
    this.silkBundles.forEach((bundle) => {
      const collected = this.inventory.silk.includes(bundle.getData('id'))
      if (bundle.visible && collected) {
        this.spawnCollectFx(bundle.x, bundle.y, '获得蚕丝束 +1')
      }
      bundle.setVisible(
        this.currentStep === LEVEL_STEPS.COLLECT_SILK && !collected,
      )
    })
    if (this.patternSample) {
      const patternCollected = this.inventory.pattern
      if (this.patternSample.visible && patternCollected) {
        this.spawnCollectFx(this.patternSample.x, this.patternSample.y, '取得纹样样本')
      }
      this.patternSample.setVisible(this.currentStep === LEVEL_STEPS.FIND_PATTERN && !patternCollected)
    }
    this.valve.setVisible(true)
    this.setValveFlow(true)
    this.masterMarker.setText(getNpcMarker(this.currentStep, 'master'))
  }

  spawnCollectFx(x, y, label) {
    const ring = this.add.circle(x, y, 14, 0xffd98a, 0.8)
      .setDepth(20)
    this.tweens.add({
      targets: ring,
      radius: 58,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    })
    const text = this.add.text(x, y - 40, label, {
      fontFamily: 'Noto Serif SC, serif',
      fontSize: '19px',
      color: '#7c2d24',
      fontStyle: 'bold',
      stroke: '#fff4da',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20)
    this.tweens.add({
      targets: text,
      y: text.y - 46,
      alpha: 0,
      duration: 1100,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    })
  }

  getInteractionTargets() {
    const targets = []
    if ([LEVEL_STEPS.EXPLORE, LEVEL_STEPS.RETURN_MASTER, LEVEL_STEPS.ACCEPTANCE].includes(this.currentStep)) {
      targets.push({ id: 'master', x: this.master.x, y: this.master.y, label: '与阿依提老师傅交谈' })
    }
    if (this.currentStep === LEVEL_STEPS.COLLECT_SILK) {
      this.silkBundles.filter((bundle) => bundle.visible).forEach((bundle) => targets.push({
        id: bundle.getData('id'), x: bundle.x, y: bundle.y, label: '拾取蚕丝束',
      }))
    }
    if (this.currentStep === LEVEL_STEPS.FIND_PATTERN) {
      targets.push({ id: 'pattern', x: this.patternSample.x, y: this.patternSample.y, label: '取得纹样样本' })
    }
    if (this.currentStep === LEVEL_STEPS.OPEN_VALVE) {
      targets.push({ id: 'valve', x: this.valve.x, y: this.valve.y, label: '转动水阀（纹样密码）' })
    }
    return targets
  }

  getNearestTarget() {
    return this.getInteractionTargets()
      .map((target) => ({ ...target, distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) }))
      .filter((target) => target.distance < 155)
      // 高处的蚕丝/纹样必须站到木台上才能拾取：玩家位置不得低于目标
      .filter((target) => this.player.y <= target.y + 45)
      .sort((a, b) => a.distance - b.distance)[0] || null
  }

  performInteraction() {
    if (!this.controlsEnabled) return
    const target = this.getNearestTarget()
    if (!target) return
    if (target.id.startsWith('silk-')) gameBus.emit('collect-silk', target.id)
    else if (target.id === 'pattern') gameBus.emit('collect-pattern')
    else if (target.id === 'valve') gameBus.emit('request-valve-puzzle')
    else gameBus.emit('request-npc-interaction', target.id)
  }

  playIntro() {
    this.controlsEnabled = false
    this.cameras.main.stopFollow()
    this.cameras.main.setScroll(70, 0)
    this.cameras.main.fadeIn(650, 35, 23, 16)
    this.tweens.add({
      targets: this.cameras.main,
      scrollX: 390,
      duration: 2100,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.cameras.main.startFollow(this.player, true, 0.075, 0.075, -220, 50)
        gameBus.emit('intro-finished')
      },
    })
  }

  createAmbientDetails() {
    const clothColors = [0x24599c, 0xb73737, 0xe7a327]
    ;[300, 392, 484].forEach((x, index) => {
      const cloth = this.add.rectangle(x, 252 + (index % 2) * 15, 30, 96, clothColors[index], 0.14)
        .setOrigin(0.5, 0)
        .setDepth(2)
      this.tweens.add({
        targets: cloth,
        angle: { from: -1.2, to: 1.2 },
        duration: 1500 + index * 240,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    })

    const shimmer = this.add.ellipse(1024, 530, 78, 11, 0xb9efff, 0.2).setDepth(3)
    this.tweens.add({ targets: shimmer, alpha: 0.55, scaleX: 1.18, duration: 1300, yoyo: true, repeat: -1 })

    for (let index = 0; index < 18; index += 1) {
      const mote = this.add.circle(
        Phaser.Math.Between(120, WORLD_WIDTH - 120),
        Phaser.Math.Between(170, 500),
        Phaser.Math.Between(1, 3),
        0xffe7a3,
        Phaser.Math.FloatBetween(0.18, 0.45),
      ).setDepth(4)
      this.tweens.add({
        targets: mote,
        y: mote.y - Phaser.Math.Between(25, 70),
        x: mote.x + Phaser.Math.Between(-25, 25),
        alpha: 0,
        duration: Phaser.Math.Between(2800, 5200),
        delay: Phaser.Math.Between(0, 1800),
        repeat: -1,
      })
    }
  }

  isNearMaster() {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, this.master.x, this.master.y) < 185
  }

  playCompletionMoment() {
    this.controlsEnabled = false
    this.player.setVelocity(0, 0)
    this.cameras.main.shake(240, 0.002)
    this.tweens.add({ targets: this.master, scaleX: 0.145, scaleY: 0.145, yoyo: true, duration: 260 })
  }

  update() {
    if (!this.player?.body) return

    const target = this.controlsEnabled ? this.getNearestTarget() : null
    if (target?.id !== this.activeTargetId) {
      this.activeTargetId = target?.id || null
      gameBus.emit('interactable-changed', target ? { id: target.id, label: target.label } : null)
    }

    if (!this.controlsEnabled) {
      this.player.setVelocityX(0)
      this.playPlayerAnimation(`idle-${this.direction}`)
      return
    }

    const movingLeft = this.cursors.left.isDown || this.keys.left.isDown
    const movingRight = this.cursors.right.isDown || this.keys.right.isDown
    const running = this.keys.run.isDown
    const grounded = this.player.body.blocked.down || this.player.body.touching.down
    const speed = running ? 285 : 175

    if (movingLeft && !movingRight) {
      this.direction = 'left'
      this.player.setVelocityX(-speed)
    } else if (movingRight && !movingLeft) {
      this.direction = 'right'
      this.player.setVelocityX(speed)
    } else {
      this.player.setVelocityX(0)
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.jump) && grounded) {
      // 更高的起跳速度：配合木台完成“跳跃取丝”的平台玩法
      this.player.setVelocityY(-580)
      // 跳跃破空声
      this.sound.play('jump-whoosh', { volume: 0.5 })
    }

    const animation = resolvePlayerAnimation({
      grounded,
      direction: this.direction,
      speed: this.player.body.velocity.x,
      running,
    })
    this.playPlayerAnimation(animation)
  }

  playPlayerAnimation(animation) {
    this.player.setScale(playerAnimationScales[animation])
    this.player.anims.play(animation, true)
  }
}
