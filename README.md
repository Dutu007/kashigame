# 时间织城 · 喀什小镇

项目包含首页、角色选择、加载动画、小镇地图，以及「织梦巷」和「坎儿井」两关游戏。首页使用 Vue 和 Vite；两关游戏位于 `game/`，共用角色素材和浏览器存档。

小镇地图包含五个区域：织梦巷、坎儿井可进入游戏；喀什巴扎、土陶工坊、木卡姆庭院可欣赏风景插画，玩法尚未开放。点击地图区域或标牌可进入，悬停或键盘聚焦可查看介绍；桌面端完整展示地图，手机端可横向浏览。从地图选择的艾德或阿依苏会带入游戏，退出关卡后返回小镇地图。第二关最后的守井人汇报和「水脉有记」转场播完后，自动回到小镇地图。

首次进入织梦巷时播放章节序章（约 11 秒），结束后自动进入关卡；继续旅程、重新进入或刷新时直接接续当前进度，避免反复等待序章。序章资源位于 `game/levels/weave-lane/intro/`。

织梦巷入口及巷内各地图切换使用统一的织结发光转场：静止街巷背景、左下织结、金色延展线与光点，每次播放完整的 3.4 秒循环，等目标地图就绪后淡出。其他区域仍使用原转场；织梦巷文字序章继续保留。转场资源位于 `game/shared/map-transition/`。

织梦巷的白坯拼图、拼合完成弹窗、成品预览及成绸对比使用参考图装饰，纹样与配色由实际 Canvas 渲染。样式在 `game/levels/weave-lane/css/finished-reference.css`，框架素材在 `game/levels/weave-lane/assets/ui/workshop/`；可使用 `scripts/assets/prepare-weave-reference-ui.py` 从原参考图片重新生成。

## 启动完整项目

需要 Node.js 22 和 npm。在项目根目录执行：

```bash
npm ci
npm run dev
```

打开终端显示的本地地址。Windows 也可双击 `启动游戏.bat`；首次启动会安装依赖，然后在 8080 端口启动 Vite 并打开浏览器。

参考视频位于 `docs/references/`。其中 `2025届数媒比赛国一作品.mp4` 使用 Git LFS 保存，需要时可执行 `git lfs pull` 获取该文件；参考资料不参与游戏打包。

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
src/
  components/              首页、选角、加载动画、地图和公共界面
  data/                    五区域地图、区域介绍与风景配置
  utils/                   公共音频管理
  assets/                  运行素材：home、characters、loading、guide、map、scenery、audio
game/                      织梦巷与坎儿井游戏工程
  index.html               两关目录、继续旅程和通关衔接
  levels/weave-lane/        第一关：织梦巷
  karez.html / js/          第二关：坎儿井
  shared/                  共用角色、跨关卡状态和入口适配
  assets/characters/       两关共用的人物动作与头像
  tests/                   制作、角色和存档测试
  docs/                    游戏流程与素材维护说明
docs/
  art/                     设计提示词、地图草稿、人物原稿与旧版参考
  previews/                已有界面效果记录
  references/              参考视频与视频原稿
scripts/assets/            当前美术素材处理工具
scripts/archive/           旧十区域地图等历史工具，不参与构建
tests/                     完整项目的地图、选角与两关衔接检查
vite.config.js             首页构建及游戏文件复制
启动游戏.bat               Windows 完整项目启动入口
```

`node_modules/`、`dist/`、`output/` 和 `tmp/` 不随源码提交。新增运行素材放入对应的素材目录，通过模块导入使用；设计草稿和参考资料放在 `docs/`。详见 [素材目录说明](docs/art/README.md)。

## 测试

```bash
npm test
```

测试覆盖制作玩法、共用角色素材、关卡存档和旧存档兼容。可选浏览器整合测试的配置见 [游戏工程说明](game/README.md)；测试完整项目中的游戏目录时，将 `GAME_URL` 设置为 Vite 地址下的 `/game/`，例如 `http://localhost:5173/game/`。

安装 Chrome 和 Playwright、构建并启动 `npm run preview` 后，可运行 `node tests/map.browser.cjs` 检查首页、选角、风景弹窗和两关衔接；`node tests/map-art.browser.mjs` 检查五个区域的鼠标与键盘交互、手机端横向浏览和减少动态效果设置。两者默认使用预览地址 `http://localhost:4173/`，可分别用 `GAME_URL` 和 `MAP_URL` 指定其他地址；截图保存到已忽略的 `output/`。

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
