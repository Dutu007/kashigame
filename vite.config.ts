/**
 * Vite 构建与开发服务器配置。
 *
 * 部署方式尚未确定，因此 `base` 使用相对路径 `./`，
 * 保证构建产物可以放在任意目录层级下而不需要重新配置。
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

export default defineConfig({
  base: './',

  // Vue 组件（关卡容器壳与各关卡 UI）需要该插件编译
  // 构建期压缩图片资源，抵消 AI 生成素材体积偏大的问题
  plugins: [vue(), ViteImageOptimizer()],

  server: {
    port: 5173,
    open: true,
    watch: {
      // public/assets 是静态素材，无需热更新；忽略以规避 Windows 文件锁导致的 EBUSY 崩溃
      ignored: ['**/public/assets/**'],
    },
  },

  build: {
    target: 'es2022',
    // Phaser 单包体积较大，放宽警告阈值避免每次构建都刷警告
    chunkSizeWarningLimit: 2000,
  },
})
