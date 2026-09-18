const root = `${import.meta.env.BASE_URL}assets`

export const assets = {
  background: `${root}/backgrounds/workshop-street.png`,
  master: `${root}/characters/npc/master-ayti.png`,
  playerPortrait: `${root}/characters/player/player-portrait.png`,
  props: `${root}/props/workshop-props.png`,
  storefront: `${root}/props/workshop-storefront.png`,
  uiKit: `${root}/ui/workshop-ui-kit.png`,
  // 新绘制的染坊道具（透明底、手绘卡通风）
  vatBlue: `${root}/props/vat-blue.png`,
  vatRed: `${root}/props/vat-red.png`,
  vatYellow: `${root}/props/vat-yellow.png`,
  platformWood: `${root}/props/platform-wood.png`,
  platformStone: `${root}/props/platform-stone.png`,
  silkBlue: `${root}/props/clue-silk-bundle.png`,
  silkRed: `${root}/props/clue-silk-bundle.png`,
  silkGold: `${root}/props/clue-silk-bundle.png`,
  patternSample: `${root}/props/clue-pattern-sample.png`,
  waterValve: `${root}/props/water-valve.png`,
}

export function framePath(animation, frame) {
  return `${root}/characters/player/${animation}-${String(frame).padStart(2, '0')}.png`
}

export const audioAssets = {
  jumpWhoosh: `${root}/audio/sfx/jump-whoosh.wav`,
  pickup: `${root}/audio/sfx/pickup.wav`,
  ambient: `${root}/audio/sfx/ambient-wind-fire.wav`,
}
