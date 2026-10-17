import Phaser from 'phaser'

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene')
  }

  create() {
    const { width, height } = this.scale

    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)')
    this.cameras.main.setBounds(0, 0, width, height)
    this.cameras.main.centerOn(width / 2, height / 2)
  }
}
