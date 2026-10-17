import Phaser from 'phaser'

const DUST_TEXTURE = 'home-dust-particle'

function createDustTexture(scene) {
  if (scene.textures.exists(DUST_TEXTURE)) return

  const texture = scene.textures.createCanvas(DUST_TEXTURE, 16, 16)
  const context = texture.context
  const gradient = context.createRadialGradient(8, 8, 0, 8, 8, 8)

  gradient.addColorStop(0, 'rgba(255, 238, 176, 0.9)')
  gradient.addColorStop(0.35, 'rgba(255, 214, 130, 0.45)')
  gradient.addColorStop(1, 'rgba(255, 196, 96, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 16, 16)
  texture.refresh()
}

export default {
  create(scene, { width, height }) {
    createDustTexture(scene)

    return scene.add
      .particles(0, 0, DUST_TEXTURE, {
        x: { min: width * 0.08, max: width * 0.94 },
        y: { min: height * 0.12, max: height * 0.9 },
        lifespan: { min: 11000, max: 16000 },
        speedX: { min: 2, max: 7 },
        speedY: { min: -9, max: -3 },
        scale: { start: 0.45, end: 0.08 },
        alpha: { start: 0.22, end: 0 },
        tint: [0xffe8a8, 0xffd88b, 0xffefc4],
        quantity: 1,
        frequency: 520,
        maxParticles: 30,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(8)
  },
}
