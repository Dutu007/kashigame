# 时间织城 · 喀什小镇

项目包含首页、角色选择、加载动画、小镇地图，以及「织梦巷」和「坎儿井」两关游戏。首页使用 Vue 和 Vite；两关游戏位于 `game/`，共用角色素材和浏览器存档。

地图第 3 个区域进入织梦巷，第 7 个区域进入坎儿井；其余区域目前展示关卡图片预览。从地图选择的角色会带入游戏，退出关卡后返回小镇地图。第二关最后的守井人汇报和「水脉有记」转场播完后，自动回到小镇地图。

## 启动完整项目

需要 Node.js 22 和 npm。在项目根目录执行：

```bash
npm ci
npm run dev
```

打开终端显示的本地地址。Windows 也可双击 `启动游戏.bat`；首次启动会安装依赖，然后在 8080 端口启动 Vite 并打开浏览器。

参考视频 `2025届数媒比赛国一作品.mp4` 使用 Git LFS 保存，需要时可执行 `git lfs pull` 获取该文件。

## 构建

```bash
npm run build
npm run preview
```

构建结果位于 `dist/`，包含首页和 `dist/game/` 下的两关游戏，可部署到静态 HTTP 服务。

## 单独运行两关游戏

需要 Python 3。在项目根目录执行：

```bash
python game/server.py 8080
```

然后打开 `http://localhost:8080/`。这时从两关目录开始或继续旅程。不要直接双击 HTML 文件，浏览器会限制本地素材加载。

两关的操作、制作玩法、主线流程和存档说明见 [游戏工程说明](game/README.md)、[当前游戏说明](game/docs/游戏说明.md)和[素材说明](game/docs/素材说明.md)。

## 目录

```text
src/                       首页、选角、加载动画和地图
src/components/MapPage.vue  地图区域与两关游戏的衔接
assets/                    首页工程素材
game/                      织梦巷与坎儿井游戏工程
  index.html               两关目录、继续旅程和通关衔接
  levels/weave-lane/        第一关：织梦巷
  karez.html / js/          第二关：坎儿井
  shared/                  共用角色、跨关卡状态和入口适配
  assets/characters/       两关共用的人物动作与头像
  tests/                   制作、角色和存档测试
  docs/                    游戏流程与素材维护说明
tests/map.browser.cjs      首页、地图和关卡衔接的浏览器检查
vite.config.js             首页构建及游戏文件复制
启动游戏.bat               Windows 完整项目启动入口
```

`node_modules/`、`dist/`、临时截图和浏览器测试数据不随源码提交。

## 测试

```bash
npm test
```

测试覆盖制作玩法、共用角色素材、关卡存档和旧存档兼容。可选浏览器整合测试的配置见 [游戏工程说明](game/README.md)；测试完整项目中的游戏目录时，将 `GAME_URL` 设置为 Vite 地址下的 `/game/`，例如 `http://localhost:5173/game/`。

验证生产构建的首页、选角、地图入口和返回后的存档恢复时，先运行 `npm run preview`，再按以下方式运行可选检查：

```powershell
npm install --prefix tmp/browser-test --no-save --no-package-lock playwright
$env:NODE_PATH = "$PWD/tmp/browser-test/node_modules"
$env:GAME_URL = "http://localhost:4173/"
node tests/map.browser.cjs
```

浏览器检查使用独立上下文，不读写玩家日常浏览器存档。

## 存档

同一浏览器、同一站点地址下，原有的 `twc_campaign_v1`、`twc_l1_save` 和 `twc_l2_save` 存档可继续使用。更换浏览器、主机地址或端口时，存档不会自动互通。
