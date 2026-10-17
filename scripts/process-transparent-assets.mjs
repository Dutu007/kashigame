import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { deflateSync, inflateSync } from 'node:zlib'

const root = resolve(import.meta.dirname, '..')
const targets = [
  ['女性角色.png', 'src/assets/processed/female-character-transparent.png'],
  ['开始旅程-角色选择.png', 'src/assets/processed/start-journey-button-transparent.png'],
]

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const result = Buffer.alloc(data.length + 12)
  result.writeUInt32BE(data.length, 0)
  name.copy(result, 4)
  data.copy(result, 8)
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8)
  return result
}

function paeth(a, b, c) {
  const estimate = a + b - c
  const da = Math.abs(estimate - a)
  const db = Math.abs(estimate - b)
  const dc = Math.abs(estimate - c)
  return da <= db && da <= dc ? a : db <= dc ? b : c
}

function decodeRgbPng(buffer) {
  if (!buffer.subarray(0, 8).equals(pngSignature)) throw new Error('Unsupported PNG signature')
  let offset = 8
  let width = 0
  let height = 0
  const compressed = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      if (data[8] !== 8 || data[9] !== 2 || data[12] !== 0) {
        throw new Error('Only non-interlaced 8-bit RGB PNG files are supported')
      }
    } else if (type === 'IDAT') compressed.push(data)
    else if (type === 'IEND') break
    offset += length + 12
  }

  const bytesPerPixel = 3
  const stride = width * bytesPerPixel
  const raw = inflateSync(Buffer.concat(compressed))
  const pixels = Buffer.alloc(width * height * bytesPerPixel)

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1)
    const filter = raw[rowStart]
    for (let x = 0; x < stride; x += 1) {
      const current = raw[rowStart + 1 + x]
      const left = x >= bytesPerPixel ? pixels[y * stride + x - bytesPerPixel] : 0
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0
      const upperLeft = y > 0 && x >= bytesPerPixel ? pixels[(y - 1) * stride + x - bytesPerPixel] : 0
      const predictor = filter === 0 ? 0
        : filter === 1 ? left
          : filter === 2 ? up
            : filter === 3 ? Math.floor((left + up) / 2)
              : filter === 4 ? paeth(left, up, upperLeft)
                : null
      if (predictor === null) throw new Error(`Unsupported PNG filter: ${filter}`)
      pixels[y * stride + x] = (current + predictor) & 255
    }
  }
  return { width, height, pixels }
}

function removeConnectedLightBackground({ width, height, pixels }) {
  const rgba = Buffer.alloc(width * height * 4)
  const visited = new Uint8Array(width * height)
  const queue = new Uint32Array(width * height)
  let head = 0
  let tail = 0

  const isBackground = (index) => {
    const offset = index * 3
    const r = pixels[offset]
    const g = pixels[offset + 1]
    const b = pixels[offset + 2]
    return Math.min(r, g, b) >= 195 && Math.max(r, g, b) - Math.min(r, g, b) <= 45
  }

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const index = y * width + x
    if (visited[index]) return
    visited[index] = 1
    if (isBackground(index)) queue[tail++] = index
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0)
    enqueue(x, height - 1)
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y)
    enqueue(width - 1, y)
  }
  while (head < tail) {
    const index = queue[head++]
    const x = index % width
    const y = Math.floor(index / width)
    enqueue(x - 1, y)
    enqueue(x + 1, y)
    enqueue(x, y - 1)
    enqueue(x, y + 1)
  }

  for (let index = 0; index < width * height; index += 1) {
    const source = index * 3
    const target = index * 4
    rgba[target] = pixels[source]
    rgba[target + 1] = pixels[source + 1]
    rgba[target + 2] = pixels[source + 2]
    if (visited[index] && isBackground(index)) {
      const lightestEdge = Math.min(pixels[source], pixels[source + 1], pixels[source + 2])
      rgba[target + 3] = Math.max(0, Math.min(255, Math.round((245 - lightestEdge) / 40 * 255)))
    } else {
      rgba[target + 3] = 255
    }
  }
  return rgba
}

function encodeRgbaPng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    pngSignature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const [inputName, outputName] of targets) {
  const input = decodeRgbPng(await readFile(resolve(root, inputName)))
  const output = encodeRgbaPng(input.width, input.height, removeConnectedLightBackground(input))
  const outputPath = resolve(root, outputName)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, output)
  console.log(`${outputName}: ${input.width}x${input.height}, ${createHash('sha1').update(output).digest('hex')}`)
}
