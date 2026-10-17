import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { cp } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

export default defineConfig({
  plugins: [vue(), {
    name: 'copy-game-pages',
    async writeBundle(options) {
      await cp(resolve(import.meta.dirname, 'game'), resolve(options.dir || 'dist', 'game'), {
        recursive: true,
        filter: source => !['.git', 'tests', 'output', 'tmp', '.DS_Store'].includes(basename(source)),
      })
    },
  }],
})
