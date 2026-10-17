import Phaser from 'phaser'

export default {
  create(scene, { width }) {
    const mist = scene.add
      .graphics()
      .setAlpha(0.045)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setDepth(2)

    mist.fillStyle(0xfff8e9, 0.58)
    mist.fillEllipse(80, 62, 260, 34)
    mist.fillEllipse(280, 82, 360, 42)
    mist.fillEllipse(620, 55, 300, 30)
    mist.fillEllipse(1030, 84, 410, 44)
    mist.fillEllipse(1410, 54, 330, 34)
    mist.fillEllipse(width + 120, 76, 300, 38)
    mist.fillStyle(0xffffff, 0.32)
    mist.fillEllipse(455, 94, 430, 26)
    mist.fillEllipse(1240, 96, 480, 28)

    scene.tweens.add({
      targets: mist,
      x: { from: -110, to: 110 },
      duration: 60000,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    })

    scene.tweens.add({
      targets: mist,
      alpha: 0.075,
      duration: 9000,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    })

    return mist
  },
}
