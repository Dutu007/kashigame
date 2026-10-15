import Phaser from 'phaser'

const FABRIC_SHADER = 'home-fabric-wind'
const FABRIC_FRAGMENT_SHADER = `
precision mediump float;

uniform float time;
uniform float uAmplitude;
uniform sampler2D iChannel0;

varying vec2 outTexCoord;

float boxMask(vec2 point, vec2 minimum, vec2 maximum, float feather) {
  vec2 enter = smoothstep(minimum, minimum + feather, point);
  vec2 leave = 1.0 - smoothstep(maximum - feather, maximum, point);
  return enter.x * enter.y * leave.x * leave.y;
}

void main() {
  vec2 screenUv = vec2(outTexCoord.x, 1.0 - outTexCoord.y);
  vec4 original = texture2D(iChannel0, outTexCoord);

  float leftFabric = boxMask(screenUv, vec2(0.0, 0.0), vec2(0.12, 0.43), 0.018);
  float rightFabric = boxMask(screenUv, vec2(0.885, 0.0), vec2(1.0, 0.64), 0.018);
  float colorMax = max(original.r, max(original.g, original.b));
  float colorMin = min(original.r, min(original.g, original.b));
  float saturationMask = smoothstep(0.08, 0.24, colorMax - colorMin);
  float fabricMask = min(1.0, leftFabric + rightFabric) * saturationMask;

  float wave = sin(screenUv.y * 34.0 + time * 0.42)
    + sin(screenUv.y * 19.0 - time * 0.28) * 0.45;
  vec2 warpedUv = outTexCoord;
  warpedUv.x += wave * uAmplitude * 0.07 * fabricMask;
  warpedUv.y += sin(screenUv.x * 26.0 + time * 0.3) * uAmplitude * 0.018 * fabricMask;

  vec4 fabric = texture2D(iChannel0, warpedUv);
  vec3 finalColor = mix(original.rgb, fabric.rgb, fabricMask * 0.58);
  gl_FragColor = vec4(finalColor, 1.0);
}
`

function addFabricShader(scene, { width, height }) {
  if (scene.game.renderer.type !== Phaser.WEBGL) return null

  if (!scene.cache.shader.has(FABRIC_SHADER)) {
    scene.cache.shader.add(
      FABRIC_SHADER,
      new Phaser.Display.BaseShader(FABRIC_SHADER, FABRIC_FRAGMENT_SHADER, undefined, {
        uAmplitude: { type: '1f', value: 0.012 },
      }),
    )
  }

  return scene.add
    .shader(
      FABRIC_SHADER,
      width / 2,
      height / 2,
      width,
      height,
      ['home-background'],
      { wrapS: 'clamp_to_edge', wrapT: 'clamp_to_edge', flipY: true },
    )
    .setDepth(1)
}

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

function createLeafTexture(scene) {
  const key = 'home-leaf-overlay'
  if (scene.textures.exists(key)) return key

  const region = { x: 360, y: 0, width: 430, height: 180 }
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
    const colorMax = Math.max(red, green, blue)
    const colorMin = Math.min(red, green, blue)
    const isLeafOrBranch = colorMax - colorMin > 24 && blue < green * 0.94 && blue < red * 0.94

    data[index + 3] = isLeafOrBranch ? Math.min(data[index + 3], 190) : 0
  }

  context.putImageData(pixels, 0, 0)
  texture.refresh()
  return key
}

function addLantern(scene, layout) {
  const region = { x: 1366, y: 145, width: 92, height: 190 }
  const pivot = { x: 46, y: 0 }
  const key = 'home-lantern-overlay'

  createMaskedRegion(scene, key, region, [
    [43, 0], [50, 0], [51, 68], [76, 89], [75, 139], [58, 160],
    [49, 188], [39, 160], [18, 139], [18, 88], [41, 68],
  ])

  const x = layout.offsetX + (region.x + pivot.x) * layout.scale
  const y = layout.offsetY + (region.y + pivot.y) * layout.scale
  const lantern = scene.add
    .image(x, y, key)
    .setOrigin(pivot.x / region.width, 0)
    .setScale(layout.scale)
    .setAlpha(0.28)
    .setBlendMode(Phaser.BlendModes.SCREEN)
    .setDepth(5)

  scene.tweens.add({
    targets: lantern,
    angle: { from: -3, to: 3 },
    duration: 3200,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  })

  return lantern
}

function addLeaves(scene, layout) {
  const key = createLeafTexture(scene)
  const region = { x: 360, y: 0, width: 430, height: 180 }
  const pivot = { x: 52, y: 0 }
  const x = layout.offsetX + (region.x + pivot.x) * layout.scale
  const y = layout.offsetY
  const leaves = scene.add
    .image(x, y, key)
    .setOrigin(pivot.x / region.width, 0)
    .setScale(layout.scale)
    .setAlpha(0.18)
    .setBlendMode(Phaser.BlendModes.SCREEN)
    .setDepth(3)

  scene.tweens.add({
    targets: leaves,
    angle: { from: -2, to: 2 },
    duration: 4200,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  })

  return leaves
}

export default {
  create(scene, layout) {
    return [
      addFabricShader(scene, layout),
      addLantern(scene, layout),
      addLeaves(scene, layout),
    ].filter(Boolean)
  },
}
