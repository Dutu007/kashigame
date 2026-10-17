import Phaser from 'phaser'

function createMaskedRegion(scene, key, region, polygon) {
  if (scene.textures.exists(key)) return

  const source = scene.textures.get('home-background').getSourceImage()
  const texture = scene.textures.createCanvas(key, region.width, region.height)
  const context = texture.context

  context.save()
  context.beginPath()
  polygon.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  })
  context.closePath()
  context.clip()
  context.drawImage(
    source,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height,
  )
  context.restore()
  texture.refresh()
}

function addOverlay(scene, layout, config) {
  createMaskedRegion(scene, config.key, config.region, config.polygon)

  const { region } = config
  const x = layout.offsetX + (region.x + region.width / 2) * layout.scale
  const y = layout.offsetY + (region.y + region.height) * layout.scale

  return scene.add
    .image(x, y, config.key)
    .setOrigin(0.5, 1)
    .setScale(layout.scale)
    .setAlpha(config.alpha)
    .setBlendMode(Phaser.BlendModes.SCREEN)
    .setDepth(6)
}

export default {
  create(scene, layout) {
    const boy = addOverlay(scene, layout, {
      key: 'home-character-boy',
      alpha: 0.16,
      region: { x: 150, y: 420, width: 330, height: 340 },
      polygon: [
        [120, 28], [250, 20], [305, 78], [310, 145], [278, 188],
        [315, 262], [278, 335], [85, 334], [24, 286], [44, 206],
        [70, 140], [98, 96],
      ],
    })
    const girl = addOverlay(scene, layout, {
      key: 'home-character-girl',
      alpha: 0.16,
      region: { x: 400, y: 448, width: 310, height: 330 },
      polygon: [
        [52, 20], [176, 12], [224, 62], [214, 112], [305, 125],
        [308, 162], [226, 184], [218, 325], [66, 328], [18, 278],
        [38, 180], [31, 86],
      ],
    })
    const cat = addOverlay(scene, layout, {
      key: 'home-character-cat',
      alpha: 0.25,
      region: { x: 590, y: 620, width: 120, height: 170 },
      polygon: [
        [54, 4], [72, 30], [100, 48], [87, 90], [99, 142],
        [80, 168], [25, 168], [4, 148], [19, 96], [15, 48], [38, 28],
      ],
    })

    scene.tweens.add({
      targets: [boy, girl],
      scaleX: layout.scale * 1.008,
      scaleY: layout.scale * 1.015,
      duration: 2600,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
      delay: scene.tweens.stagger(280),
    })

    scene.tweens.add({
      targets: cat,
      y: cat.y - 2.5,
      scaleX: layout.scale * 1.008,
      scaleY: layout.scale * 1.012,
      duration: 1800,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    })

    return [boy, girl, cat]
  },
}
