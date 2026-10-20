# 美术素材与参考资料

前端运行素材统一放在 `src/assets/`，通过 Vue / JavaScript 模块导入，由 Vite 处理最终部署路径。

| 目录 | 内容 |
| --- | --- |
| `src/assets/home/` | 首页视频和静态封面 |
| `src/assets/characters/` | 选角人物、背景和开始旅程按钮 |
| `src/assets/loading/` | 加载画面的背景和纹理 |
| `src/assets/guide/` | 玩法公告和五区域地图说明 |
| `src/assets/map/` | 当前正式小镇地图 |
| `src/assets/scenery/` | 巴扎、土陶工坊和木卡姆庭院风景 |
| `src/assets/audio/` | 前端背景音乐 |

两关游戏继续独立维护：共享人物动作在 `game/assets/characters/`，第二关转场在 `game/assets/transitions/karez/`，场景与道具在各关现有素材目录。目录调整不改变存档键和关卡标识。

当前五区域地图的数据在 `src/data/mapLevels.js`，区域范围与效果在 `src/data/mapVisuals.js`。进入游戏时使用 `weave`、`karez` 标识；地图区域编号仅用于地图展示，不能替代关卡标识。

本目录保存设计资料：`prompts/` 为原设计提示词，`map-drafts/` 为地图草稿，`character-sources/` 和 `ui-sources/` 为原始美术，`legacy/` 为旧版地图与素材参考。原始提示词中的历史文件名保留供追溯。已有界面记录放在 `docs/previews/`，参考视频放在 `docs/references/`；这些资料不参与打包。

`scripts/assets/prepare-weave-reference-ui.py` 用于生成第一关工作台的参考图框。`scripts/archive/` 保存历史工具，使用范围见该目录说明。新的验证截图写入已忽略的 `output/`，避免将临时结果当成运行素材提交。
