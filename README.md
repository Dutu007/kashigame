# kashigame

喀什古城主题游戏**关卡容器**（H5 / 网页端）。

## 项目定位

| 项 | 内容 |
| --- | --- |
| 类型 | 关卡容器：地图探索（主世界）+ 文化关卡 |
| 视角 | 横版侧视 |
| 玩法 | 在地图探索中走到特殊地点，进入对应文化关卡（如艾德莱斯绸染坊） |
| 技术栈 | Vue 3 + Phaser 3 + JavaScript + Vite |
| 分工 | 容器壳与关卡：本仓库；地图探索：另一位同学制作后接入 |

## 架构

```
index.html
  └─ #game                          ← 唯一挂载点（Vue 与所有 Phaser 实例都在其内）
      └─ src/main.js                ← Vue 应用入口
          └─ src/App.vue            ← 容器壳：地图探索 ↔ 关卡 状态切换
              ├─ 地图探索（待接入）    ← 另一位同学交付后挂载；emit('enter-level', id) 进入关卡
              └─ 关卡组件            ← src/levels/<id>/，emit('exit') 返回地图
```

- **地图探索**是主世界，游戏内容所在；走到特殊地点（如丝绸染坊门口）触发对应关卡。
- **关卡**是独立模块：挂载时创建自己的 Phaser 实例并挂到 `#game` 内容器，卸载时销毁；通过 `emit('exit')` 返回地图探索。
- 当前地图尚未交付，壳默认显示「地图探索接入位」提示页，并提供临时测试入口以便单独验证各关卡。

## 目录结构

```
src/
├── main.js                 # Vue 入口，挂载 #game
├── App.vue                 # 容器壳（地图探索 ↔ 关卡 切换）
├── levels/
│   ├── registry.js         # 关卡注册表（登记一个关卡 = 加入一条记录）
│   └── adilesi/            # 关卡一：艾德莱斯绸（染坊扎染体验）
│       ├── AdilesiLevel.vue    # 关卡组件入口（原独立项目的 App.vue，退出改为 emit('exit')）
│       ├── components/         # 关卡 UI 组件
│       ├── game/               # Phaser 场景与纯逻辑（WorkshopScene / levelMachine / craftRules …）
│       ├── data/               # 对话与任务内容
│       └── styles/main.css     # 关卡样式
└── legacy/                 # 旧 TypeScript 骨架（早期占位探索，保留备查，不参与构建）
```

关卡资源统一放在 `public/assets/` 下，由各关卡 `assetPaths.js` 通过 `import.meta.env.BASE_URL` 引用。

## 新增一个关卡

1. 在 `src/levels/<id>/` 下实现关卡组件，约定：
   - 挂载时创建自己的 `Phaser.Game`，`parent` 指向模板内容器（位于 `#game` 内）；
   - 卸载时 `game.destroy(true)`；
   - 需要退出/返回地图时 `emit('exit')`。
2. 在 `src/levels/registry.js` 登记一条记录（id / title / desc / component）。
3. 地图探索交付后，在其场景中为关卡添加对应地点入口，触发 `emit('enter-level', <id>)`。

## 地图探索接入

正式地图（另一位同学制作，Vue + Phaser + JS）交付后：

1. 将地图组件放入 `src/levels/map-explore/`（或替换 `App.vue` 中「地图探索接入位」视图）；
2. 地图组件挂载时创建 Phaser 实例，卸载时销毁；
3. 地图走到特殊地点时 `emit('enter-level', <levelId>)` 进入关卡；
4. 关卡返回时容器自动切回地图。

## 开发命令

```bash
npm install      # 安装依赖（首次或依赖变更后）
npm run dev      # 启动开发服务器（HMR，端口 5173）
npm run build    # 生产构建
npm run preview  # 预览构建产物
npm run test     # 运行单元测试
```

> 注意：`npm install phaser` 默认会装 Phaser 4。本项目锁定 Phaser 3，安装/升级时须显式指定 `phaser@^3`。

## 部署

**待定。** `vite build` 产物为纯静态文件，可部署到任意静态托管。
若选择 GitHub Pages 且仓库名非 `<user>.github.io`，需配置 `base: '/kashigame/'`。
