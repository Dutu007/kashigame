import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { deflateSync, inflateSync } from 'node:zlib'

const root = resolve(import.meta.dirname, '..')
const baseName = '地图.png'
const outputDir = resolve(root, 'src/assets/map-overlays')
const positionsPath = resolve(root, 'src/data/levelPositions.json')
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const levels = Array.from({ length: 10 }, (_, index) => index + 1)

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const output = Buffer.alloc(data.length + 12)
  output.writeUInt32BE(data.length, 0)
  name.copy(output, 4)
  data.copy(output, 8)
  output.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8)
  return output
}

function paeth(a, b, c) {
  const estimate = a + b - c
  const da = Math.abs(estimate - a)
  const db = Math.abs(estimate - b)
  const dc = Math.abs(estimate - c)
  return da <= db && da <= dc ? a : db <= dc ? b : c
}

function decodeRgbPng(buffer) {
  if (!buffer.subarray(0, 8).equals(pngSignature)) throw new Error('Unsupported PNG')
  let offset = 8
  let width = 0
  let height = 0
  const idat = []
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      if (data[8] !== 8 || data[9] !== 2 || data[12] !== 0) throw new Error('Only RGB 8-bit PNG is supported')
    }
    if (type === 'IDAT') idat.push(data)
    if (type === 'IEND') break
    offset += length + 12
  }
  const stride = width * 3
  const raw = inflateSync(Buffer.concat(idat))
  const pixels = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y += 1) {
    const row = y * (stride + 1)
    const filter = raw[row]
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 3 ? pixels[y * stride + x - 3] : 0
      const up = y ? pixels[(y - 1) * stride + x] : 0
      const upperLeft = y && x >= 3 ? pixels[(y - 1) * stride + x - 3] : 0
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, upperLeft)
      pixels[y * stride + x] = (raw[row + x + 1] + predictor) & 255
    }
  }
  return { width, height, pixels }
}

function isLight(pixels, index) {
  const offset = index * 3
  const r = pixels[offset]
  const g = pixels[offset + 1]
  const b = pixels[offset + 2]
  return Math.min(r, g, b) >= 210 && Math.max(r, g, b) - Math.min(r, g, b) <= 45
}

function foregroundBox(image) {
  let minX = image.width
  let minY = image.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (isLight(image.pixels, y * image.width + x)) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

function sample(image, x, y) {
  const px = Math.max(0, Math.min(image.width - 1, Math.round(x)))
  const py = Math.max(0, Math.min(image.height - 1, Math.round(y)))
  const offset = (py * image.width + px) * 3
  return [image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2]]
}

function matchTemplate(base, source, box, seed) {
  const scales = [0.2, 0.24, 0.28, 0.32, 0.36]
  const grid = 18
  let best = { score: -1, x: 0, y: 0, width: 0, height: 0 }
  for (const scale of scales) {
    const width = Math.round(box.width * scale)
    const height = Math.round(box.height * scale)
    const template = []
    for (let gy = 0; gy < grid; gy += 1) {
      for (let gx = 0; gx < grid; gx += 1) template.push(sample(source, box.x + (gx + .5) * box.width / grid, box.y + (gy + .5) * box.height / grid))
    }
    const seedX = seed.x * base.width
    const seedY = seed.y * base.height
    const minX = Math.max(0, Math.round(seedX - 300 - width / 2))
    const minY = Math.max(0, Math.round(seedY - 260 - height / 2))
    const maxX = Math.min(base.width - width, Math.round(seedX + 300 - width / 2))
    const maxY = Math.min(base.height - height, Math.round(seedY + 260 - height / 2))
    for (let y = minY; y <= maxY; y += 8) {
      for (let x = minX; x <= maxX; x += 8) {
        let error = 0
        let i = 0
        for (let gy = 0; gy < grid; gy += 1) {
          for (let gx = 0; gx < grid; gx += 1) {
            const actual = sample(base, x + (gx + .5) * width / grid, y + (gy + .5) * height / grid)
            const expected = template[i++]
            error += Math.abs(actual[0] - expected[0]) + Math.abs(actual[1] - expected[1]) + Math.abs(actual[2] - expected[2])
          }
        }
        const score = 1 - error / (grid * grid * 3 * 255)
        if (score > best.score) best = { score, x, y, width, height }
      }
    }
  }
  return best
}

function encodeRgbaPng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([pngSignature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

function buildOverlay(source, box, position, base) {
  const rgba = Buffer.alloc(base.width * base.height * 4)
  for (let y = 0; y < position.height; y += 1) {
    for (let x = 0; x < position.width; x += 1) {
      const sx = box.x + (x + .5) * box.width / position.width
      const sy = box.y + (y + .5) * box.height / position.height
      const [r, g, b] = sample(source, sx, sy)
      const targetX = position.x + x
      const targetY = position.y + y
      if (targetX < 0 || targetY < 0 || targetX >= base.width || targetY >= base.height) continue
      const light = Math.min(r, g, b) >= 210 && Math.max(r, g, b) - Math.min(r, g, b) <= 45
      const offset = (targetY * base.width + targetX) * 4
      rgba[offset] = r
      rgba[offset + 1] = g
      rgba[offset + 2] = b
      rgba[offset + 3] = light ? 0 : 255
    }
  }
  return rgba
}

const base = decodeRgbPng(await readFile(resolve(root, baseName)))
const mapLevelsSource = await readFile(resolve(root, 'src/data/mapLevels.js'), 'utf8')
const seeds = Object.fromEntries([...mapLevelsSource.matchAll(/\{ id: (\d+).*?x: ([\d.]+), y: ([\d.]+)/g)].map((match) => [Number(match[1]), { x: Number(match[2]) / 100, y: Number(match[3]) / 100 }]))
const positions = {}
await mkdir(outputDir, { recursive: true })
for (const id of levels) {
  const source = decodeRgbPng(await readFile(resolve(root, `地图关卡${id}.png`)))
  const box = foregroundBox(source)
  const match = matchTemplate(base, source, box, seeds[id])
  const seedCenter = { x: seeds[id].x * base.width, y: seeds[id].y * base.height }
  const matchCenter = { x: match.x + match.width / 2, y: match.y + match.height / 2 }
  const distance = Math.hypot(matchCenter.x - seedCenter.x, matchCenter.y - seedCenter.y)
  const useMatch = match.score >= 0.79 && distance <= 180
  const width = match.width
  const height = match.height
  const x = useMatch ? match.x : Math.max(0, Math.min(base.width - width, Math.round(seedCenter.x - width / 2)))
  const y = useMatch ? match.y : Math.max(0, Math.min(base.height - height, Math.round(seedCenter.y - height / 2)))
  const position = { x, y, width, height, confidence: Number(match.score.toFixed(4)), method: useMatch ? 'template-match' : 'seed-fallback' }
  positions[`level${id}`] = position
  await writeFile(resolve(outputDir, `level-${id}.png`), encodeRgbaPng(base.width, base.height, buildOverlay(source, box, position, base)))
  console.log(`level${id}: ${JSON.stringify(position)}`)
}
await mkdir(dirname(positionsPath), { recursive: true })
await writeFile(positionsPath, `${JSON.stringify({ baseWidth: base.width, baseHeight: base.height, positions }, null, 2)}\n`)
