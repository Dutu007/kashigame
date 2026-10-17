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

function createTitleMask(scene) {
  const key = 'home-title-mask'
  if (scene.textures.exists(key)) return key

  const region = { x: 560, y: 140, width: 630, height: 170 }
  const source = scene.textures.get('home-background').getSourceImage()
  const texture = scene.textures.createCanvas(key, region.width, region.height)
  const context = texture.context

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

  const pixels = context.getImageData(0, 0, region.width, region.height)
  const data = pixels.data

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index]
    const green = data[index + 1]
    const blue = data[index + 2]
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114
    const warmInk = red > green * 1.08 && green >= blue * 0.72
    const maskAlpha = warmInk ? Phaser.Math.Clamp((165 - luminance) * 2.8, 0, 255) : 0

    data[index] = 255
    data[index + 1] = 255
    data[index + 2] = 255
    data[index + 3] = maskAlpha
  }

  context.putImageData(pixels, 0, 0)
  texture.refresh()
  return key
}

function createSweepTexture(scene) {
  const key = 'home-title-sweep'
  if (scene.textures.exists(key)) return key

  const texture = scene.textures.createCanvas(key, 180, 180)
  const context = texture.context
  const gradient = context.createLinearGradient(0, 0, 180, 0)

  gradient.addColorStop(0, 'rgba(255, 215, 130, 0)')
  gradient.addColorStop(0.42, 'rgba(255, 225, 150, 0.16)')
  gradient.addColorStop(0.5, 'rgba(255, 248, 213, 0.9)')
  gradient.addColorStop(0.58, 'rgba(255, 221, 132, 0.18)')
  gradient.addColorStop(1, 'rgba(255, 205, 115, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 180, 180)
  texture.refresh()
  return key
}

function createButtonGlow(scene) {
  const key = 'home-button-glow'
  if (scene.textures.exists(key)) return key

  const texture = scene.textures.createCanvas(key, 520, 150)
  const context = texture.context
  const gradient = context.createRadialGradient(260, 75, 20, 260, 75, 255)

  gradient.addColorStop(0, 'rgba(255, 226, 142, 0.28)')
  gradient.addColorStop(0.48, 'rgba(255, 193, 93, 0.11)')
  gradient.addColorStop(1, 'rgba(255, 173, 70, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 520, 150)
  texture.refresh()
  return key
}

function addButtonPulse(scene, layout) {
  const region = { x: 620, y: 365, width: 430, height: 115 }
  const key = 'home-button-overlay'

  createMaskedRegion(scene, key, region, [
    [28, 8], [402, 8], [426, 32], [426, 83], [402, 108],
    [28, 108], [4, 83], [4, 32],
  ])

  const x = layout.offsetX + (region.x + region.width / 2) * layout.scale
  const y = layout.offsetY + (region.y + region.height / 2) * layout.scale
  const pulse = scene.add.container(x, y).setAlpha(0.7).setDepth(9)
  const glow = scene.add
    .image(0, 0, createButtonGlow(scene))
    .setScale(layout.scale)
    .setAlpha(0.12)
    .setBlendMode(Phaser.BlendModes.ADD)
  const button = scene.add
    .image(0, 0, key)
    .setScale(layout.scale)
    .setAlpha(0.2)
    .setBlendMode(Phaser.BlendModes.SCREEN)

  pulse.add([glow, button])

  scene.tweens.add({
    targets: pulse,
    alpha: 1,
    scaleX: 1.03,
    scaleY: 1.03,
    duration: 1000,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  })

  return [pulse]
}

function addTitleSweep(scene, layout) {
  const region = { x: 560, y: 140, width: 630, height: 170 }
  const maskKey = createTitleMask(scene)
  const sweepKey = createSweepTexture(scene)
  const maskX = layout.offsetX + (region.x + region.width / 2) * layout.scale
  const maskY = layout.offsetY + (region.y + region.height / 2) * layout.scale
  const maskImage = scene.add
    .image(maskX, maskY, maskKey)
    .setScale(layout.scale)
    .setVisible(false)
  const sweep = scene.add
    .image(layout.offsetX + (region.x - 100) * layout.scale, maskY, sweepKey)
    .setScale(layout.scale)
    .setAlpha(0.68)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setMask(maskImage.createBitmapMask())
    .setDepth(11)

  scene.tweens.add({
    targets: sweep,
    x: layout.offsetX + (region.x + region.width + 100) * layout.scale,
    duration: 2800,
    repeatDelay: 1200,
    ease: 'Sine.InOut',
    repeat: -1,
  })

  return [maskImage, sweep]
}

export default {
  create(scene, layout) {
    return [...addButtonPulse(scene, layout), ...addTitleSweep(scene, layout)]
  },
}
