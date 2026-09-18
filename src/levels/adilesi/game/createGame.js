import Phaser from 'phaser'
import { WorkshopScene } from './scenes/WorkshopScene.js'

export function createGame(parent) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    transparent: true,
    pixelArt: false,
    antialias: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 980 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      powerPreference: 'high-performance',
      roundPixels: true,
    },
    scene: [WorkshopScene],
  })
}
