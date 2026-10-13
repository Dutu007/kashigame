# 时间织城 · 第二关「坎儿井」

基于 [Phaser 3](https://phaser.io/) 的横版 2D 关卡原型（灰盒版）：地表场景 + 坎儿井井下探索、
陶灯制作与点灯、暗渠淤堵修复等多段玩法。纯前端、零构建，直接用浏览器打开即可运行。

## 快速开始

方式一（推荐，禁用缓存，刷新必定拿到最新文件）：

```bash
python server.py 8080
# 然后浏览器打开 http://localhost:8080/
```

方式二：Windows 下双击 `启动游戏.bat`（端口已被占用时不会重复启动，只打开页面）。

> 不要直接双击 `index.html`：Phaser 加载图片素材属于跨域请求，`file://` 协议下会被浏览器拦截，
> 必须经由本地 HTTP 服务访问。

## 操作

| 按键 | 作用 |
| --- | --- |
| `A` / `D` | 左右移动 |
| `空格` | 跳跃 |
| `E` | 互动 / 推进对话 |
| `Shift` | 加速（调试用） |
| `F2` | 打开调试面板 |

## 目录结构

```
index.html            页面入口，按顺序加载 js/ 下各模块
server.py             开发用静态服务器（禁用缓存，可指定端口）
启动游戏.bat          Windows 一键启动
js/                   游戏源码
  main.js             常量、全局状态 G、工具函数
  SurfaceScene.js     地表场景（守井人、土陶作坊、水井）
  TunnelScene.js      井下场景（坎儿井暗渠、淤堵修复、点灯）
  LadderWorkshop.js   木梯子制作
  LampForming.js      陶灯塑形
  LampFiring.js       陶灯烧制
  LampAssemblyLayout.js  陶灯部件装配布局
  LampWorkshop.js     陶灯作坊主逻辑
  ui.js               UI 组件（对话框、目标提示、弹窗）
  game.js             游戏配置与场景注册
  phaser.min.js       Phaser 3 引擎
map-assets/           全部美术素材（地表/井下背景、道具、UI 九宫格等）
tests/                Node 单元测试（制作类玩法数值与流程）
UIdesign/            界面设计稿
游戏说明.md            玩法与设计说明
时间织城_第二关坎儿井_完整确定方案_V1.0.docx   关卡完整设计方案
水脉任务剧情草案.md / _v0.2.md                 剧情草案
```

## 跑测试

```bash
node tests/lamp-forming.test.cjs
node tests/lamp-firing.test.cjs
node tests/lamp-craft.test.cjs
node tests/ladder-craft.test.cjs
```

## 开发提示

- 素材与脚本都走相对路径，新增 js 模块后记得在 `index.html` 里加一行 `<script>`；
  改完推荐顺手把该行末尾的 `?v=N` 数字加一，避免浏览器拿到旧文件。
- 摆件位置微调工具：访问 `http://localhost:8080/?tools=1`，或按 `F2` 在调试面板里开启（会记在
  `localStorage`）；`?tools=0` 可关闭并清除记忆。
- `tmp/`、`output/`、`rubbish/` 都是本地调试产物，已在 `.gitignore` 中忽略，不入库。
