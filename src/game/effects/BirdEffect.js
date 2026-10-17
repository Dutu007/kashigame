import Phaser from 'phaser'

const BIRD_TEXTURE = 'home-bird'

function createBirdTexture(scene) {
  if (scene.textures.exists(BIRD_TEXTURE)) return

  const graphics = scene.make.graphics({ add: false })

  graphics.lineStyle(2, 0x68452f, 0.9)
  graphics.beginPath()
  graphics.moveTo(1, 10)
  graphics.lineTo(8, 4)
  graphics.lineTo(15, 10)
  graphics.lineTo(22, 4)
  graphics.lineTo(29, 10)
  graphics.strokePath()
  graphics.generateTexture(BIRD_TEXTURE, 30, 14)
  graphics.destroy()
}

export default {
  create(scene, { width }) {
    createBirdTexture(scene)

    const flock = scene.add.container(-120, 105).setAlpha(0.62).setDepth(4)
    const birds = [
      scene.add.image(0, 0, BIRD_TEXTURE).setScale(0.62),
      scene.add.image(-42, 13, BIRD_TEXTURE).setScale(0.5),
      scene.add.image(-76, -5, BIRD_TEXTURE).setScale(0.43),
    ]

    flock.add(birds)

    birds.forEach((bird, index) => {
      scene.tweens.add({
        targets: bird,
        scaleY: bird.scaleY * 0.58,
        duration: 420 + index * 70,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      })
    })

    let restartTimer = null
    let flightTween = null

    const fly = () => {
      const baseY = Phaser.Math.Between(70, 150)

      flock.setPosition(-120, baseY)
      flightTween = scene.tweens.add({
        targets: flock,
        x: width + 130,
        duration: Phaser.Math.Between(28000, 34000),
        ease: 'Linear',
        onUpdate: (tween) => {
          flock.y = baseY + Math.sin(tween.progress * Math.PI * 4) * 5
        },
        onComplete: () => {
          restartTimer = scene.time.delayedCall(Phaser.Math.Between(16000, 26000), fly)
        },
      })
    }

    restartTimer = scene.time.delayedCall(2500, fly)

    return {
      destroy() {
        restartTimer?.remove(false)
        flightTween?.stop()
      },
    }
  },
}
