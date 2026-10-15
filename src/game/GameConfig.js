import Phaser from 'phaser'
import HomeScene from './scenes/HomeScene'

const GameConfig = {
  type: Phaser.AUTO,
  width: 16 * 100,
  height: 9 * 100,
  transparent: true,
  scene: [HomeScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1600,
    height: 900,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
}

export default GameConfig
