# kashigame

喀什古城主题 2D 横版探索游戏（H5 / 网页端）。

## 项目定位

| 项 | 内容 |
| --- | --- |
| 类型 | 探索 / 步行模拟 |
| 视角 | 横版侧视 |
| 玩法 | 文化元素收集 + 主线叙事推进 + 轻解谜解锁 |
| 美术 | AI 生成 + 后期修整 |

## 技术栈

### 核心

| 层 | 选型 | 版本 | 作用 |
| --- | --- | --- | --- |
| 游戏引擎 | Phaser 3 | 3.90.0 | 场景、渲染、输入、Arcade 物理、音频 |
| 语言 | TypeScript | 6.x | Phaser 自带完整类型定义，编辑器提示与重构安全 |
| 构建 / 开发服务器 | Vite | 8.x | 秒级冷启动、HMR、生产构建、资源处理 |
| 包管理 | npm | 随 Node LTS | 依赖管理 |
| Node | LTS | 20+ | 构建环境（当前 v22.15.0） |

> 注意：`npm install phaser` 默认会装 Phaser 4。本项目锁定 Phaser 3，安装/升级时须显式指定 `phaser@^3`。

### 运行时

| 项 | 取值 | 说明 |
| --- | --- | --- |
| 渲染器 | WebGL 2，Canvas 兜底 | Phaser 默认策略，保留旧设备兼容 |
| 物理 | Arcade Physics | 只需平面碰撞，不用 Matter |
| 分辨率 | 1920×1080 设计尺寸 | 匹配 AI 出图原生分辨率 |
| 缩放 | `Scale.FIT` + 居中 | 适配 H5 各种窗口比例 |
| 音频 | Phaser 内置 Web Audio，HTML5 Audio 兜底 | 无需引入 Howler |
| 存档 | `localStorage` | Phaser 无内置，自行封装 |

### 资源管线

| 环节 | 工具 |
| --- | --- |
| 素材生成 | AI 出图（背景、角色、道具） |
| 抠图 / 统一尺寸 / 批量处理 | Node 脚本（`sharp`） |
| 图集打包 | free-texture-packer 或 TexturePacker |
| 构建期图片压缩 | `vite-plugin-image-optimizer` |
| 音频压缩 | 构建前手动压至 ogg / m4a 双格式 |

### 工程化

| 项 | 工具 |
| --- | --- |
| 代码规范 | ESLint 10 + Prettier 3 |
| 类型检查 | `tsc --noEmit`（TypeScript 6） |
| 单元测试 | Vitest 5（仅测不依赖 Phaser 的纯逻辑：存档、收集、剧情状态） |
| 提交规范 | Conventional Commits（可选） |

### 部署

**待定。**

候选方案：静态托管（GitHub Pages / Vercel / Netlify）或自有服务器。
确定前不影响开发，`vite build` 产物为纯静态文件，可部署到任意静态托管。

> 注意：若最终选择 GitHub Pages 且仓库名非 `<user>.github.io`，Vite 需配置 `base: '/kashigame/'`。

## 开发命令

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器（HMR）
npm run build    # 类型检查 + 生产构建
npm run preview  # 预览构建产物
npm run typecheck # 仅类型检查
npm run test     # 运行单元测试
npm run lint     # 代码检查
npm run format   # 代码格式化
```
