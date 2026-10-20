# 历史素材工具

这些工具保留用于追溯旧版素材，不参与当前游戏启动和构建。

- `analyze-map-levels.mjs`：旧十区域地图的图像匹配工具。运行时需要提供含有旧版 `地图.png` 和 `地图关卡1.png` 至 `地图关卡10.png` 的完整素材目录；结果写入 `output/legacy-map-overlays/`。当前五区域地图直接维护 `src/data/mapLevels.js` 和 `src/data/mapVisuals.js`。
- `process-transparent-assets.mjs`：旧版人物与按钮的透明背景处理流程，读取 `docs/art/` 内保留的原稿，结果写入 `output/legacy-assets/`，不会覆盖当前已确认的选角素材。
