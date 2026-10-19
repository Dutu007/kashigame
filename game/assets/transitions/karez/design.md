# 坎儿井转场素材

六张 PNG 由内置 imagegen 参考项目现有场景生成，原始输出保留，未重绘现有角色。成图约 16:9；实际人物叠层、字幕、淡入淡出与缓慢推镜由游戏完成。

色彩延续暖赭石岩壁、土黄地面和低饱和青绿水流。开场为白天，结尾保持相同时间与棚屋环境；不新增剧情角色、文字设定或额外的修复步骤。

首次上下井播放 2.8 秒，再次播放 0.65 秒；其余节点播放约 3 秒且每份存档只显示一次。空格 / Enter / Esc 或右上角按钮可跳过。首次井底点灯仍需玩家按 F。

## 触发与构图

- `descend.png`：首次沿绳梯下井完整播放；再次下井短播。手部近景，不绘制火焰，不自动点亮油灯。
- `ascend.png`：首次沿绳梯回到地表完整播放；再次上井短播。沿井筒仰望出口，保留相同袖口和绳梯。
- `silt-cleared.png`：中段清淤完成、对话结束后。仅中段恢复，不能暗示下游已修补。
- `water-restored.png`：清淤和修补均完成，并完成下游复查对话后。保留原渠缘的小规模修补。
- `arrival.png`：初次抵达坎儿井；尚未与守井人对话。地面棚屋与三口井，现有角色 PNG 另行叠加。
- `maintenance-record.png`：向守井人汇报、维护记录保存后，章节完成界面前。现有艾德、阿依苏、守井人 PNG 另行叠加。

## 实际生成提示词

生成方式：`image_gen.imagegen`；`transparent_background: false`。以下保留实际发送的英文提示词与参考图路径，便于后续延展画面。路径均相对 `game/`。

### descend.png

参考图：`map-assets/SCN_L2_S.png`、`map-assets/SCN_L2_UA.png`、`map-assets/LADDER_RUNG.png`、`assets/characters/aysu/idle/aysu_idle_00.png`

```text
Use case: compositing. Asset type: one finished fullscreen still for the existing 2D illustrated karez adventure game. Recompose the supplied environment into a LANDSCAPE 16:9 illustration (prefer 1920x1080), without stretching the panoramic source. Match its loose hand-painted brushwork, warm ochre sandstone, irregular earthen rock, dark brown shadows and restrained turquoise water. This is an approachable storybook game, not a photograph or 3D render. One continuous cinematic scene, no comic panels, no text or letters, no UI, no borders, no logos, no watermark. Keep key action in the central 75% with quiet space along the lowest 12% for captions added by the game. Image 1 is the environment edit target and the stone well identity. Image 2 supplies the underground wall style only. Image 3 is the exact wooden rung material and two rope-hole reference. Image 4 supplies ONLY the illustrated cream sleeves and woven embroidery style; show NO face or full character. Create a first-person close view looking diagonally DOWN over the rough LOW stone well rim into an earthen vertical shaft. Two natural young hands in cream sleeves with small red/blue woven cuffs securely grip a wooden rung in the foreground. Two thick brown rope side rails pass through both end holes of four visible wooden rungs and continue into shadow. The upper rope ends are securely looped and knotted around a sturdy wooden beam spanning the stone rim, so the ladder has visible support. Desert daylight lights the rim and hands while the shaft deepens into cool dark brown. The player has not lit the clay oil lamp yet: NO flame, no illuminated handheld lantern, no glow from below. No other people, no tools or fault locations revealed, no masonry dungeon, no metal ladder.
```

### ascend.png

参考图：`map-assets/SCN_L2_UA.png`、`map-assets/SCN_L2_S.png`、`map-assets/LADDER_RUNG.png`、`assets/characters/aysu/idle/aysu_idle_00.png`

```text
Use case: compositing. Asset type: one finished fullscreen still for the existing 2D illustrated karez adventure game. Recompose the supplied environment into a LANDSCAPE 16:9 illustration (prefer 1920x1080), without stretching the panoramic source. Match its loose hand-painted brushwork, warm ochre sandstone, irregular earthen rock, dark brown shadows and restrained turquoise water. This is an approachable storybook game, not a photograph or 3D render. One continuous cinematic scene, no comic panels, no text or letters, no UI, no borders, no logos, no watermark. Keep key action in the central 75% with quiet space along the lowest 12% for captions added by the game. Image 1 is the earthen shaft environment edit target. Image 2 supplies the low rough sandstone well rim and daytime sky. Image 3 is the exact wooden rung material and rope-hole reference. Image 4 supplies ONLY cream sleeve embroidery style, no face. A first-person view looking UP from inside a modest earthen well shaft toward a bright oval opening and blue sky with pale clouds. Two natural young hands with cream embroidered cuffs grip an upper wooden rung as the climber returns toward daylight. The rustic rope ladder has TWO brown rope side rails threaded through holes at both ends of every rung; rungs grow smaller toward the opening in perspective, with secure attachment at the rim. Dark rough rock surrounds the foreground; warm daylight falls across the hands and ladder, suggesting the last steps toward the surface. No visible face or complete person, no modern safety gear, no metal stairs, no flame or spooky glowing features. The opening is a small ordinary desert well, not a giant cave.
```

### silt-cleared.png

参考图：`map-assets/SCN_L2_UB.png`、`map-assets/SCN_L2_UB_SILT.png`

```text
Use case: compositing. Asset type: one finished fullscreen still for the existing 2D illustrated karez adventure game. Recompose the supplied environment into a LANDSCAPE 16:9 illustration (prefer 1920x1080), without stretching the panoramic source. Match its loose hand-painted brushwork, warm ochre sandstone, irregular earthen rock, dark brown shadows and restrained turquoise water. This is an approachable storybook game, not a photograph or 3D render. One continuous cinematic scene, no comic panels, no text or letters, no UI, no borders, no logos, no watermark. Keep key action in the central 75% with quiet space along the lowest 12% for captions added by the game. Image 1 is the edit target AFTER local silt removal. Image 2 identifies the former local blockage and rock material, not a state to preserve. Reframe at low three-quarter water level inside this same earthen channel. A small clear turquoise stream now passes through the former sandy obstruction; modest glints and ripples move to the right. Removed rounded stones and damp clumps of sand rest harmlessly on the near dry bank, leaving the channel open. Keep the rough hand-cut ochre wall and the familiar warm shaft light slightly left of center, with dark tunnel continuing beyond the scene. This is only the middle section returning to flow: keep distant conditions unknown. No people, no repair stones in a different section, no dam or sluice machinery, no flooding or waterfall, no magical light effects.
```

### water-restored.png

参考图：`map-assets/SCN_L2_UC_FIXED.png`、`map-assets/SCN_L2_UC.png`

```text
Use case: compositing. Asset type: one finished fullscreen still for the existing 2D illustrated karez adventure game. Recompose the supplied environment into a LANDSCAPE 16:9 illustration (prefer 1920x1080), without stretching the panoramic source. Match its loose hand-painted brushwork, warm ochre sandstone, irregular earthen rock, dark brown shadows and restrained turquoise water. This is an approachable storybook game, not a photograph or 3D render. One continuous cinematic scene, no comic panels, no text or letters, no UI, no borders, no logos, no watermark. Keep key action in the central 75% with quiet space along the lowest 12% for captions added by the game. Image 1 is the edit target AFTER lower-channel repair. Image 2 identifies the small missing EARTHEN BANK EDGE near the left side before repair. A calm low three-quarter close view of that same repaired channel edge: three modest fitted weathered stones form a firm continuous bank edge, with packed earthen seams and subtle wet marks; a shallow, steady turquoise stream runs BELOW and ALONG the repaired bank. Keep the characteristic ochre rock wall, low human-scale tunnel and a warm shaft beam at the RIGHT. The bank patch is an ordinary small repair, not a bridge, dam, arch or giant retaining wall. The atmosphere is quiet relief and careful workmanship, with settled water reflections rather than spectacle. No people, no mechanical gates, no flood, no magical symbols.
```

### arrival.png

参考图：`map-assets/SCN_L2_S.png`

```text
Use case: compositing. Asset type: one finished fullscreen still for the existing 2D illustrated karez adventure game. Recompose the supplied environment into a LANDSCAPE 16:9 illustration (prefer 1920x1080), without stretching the panoramic source. Match its loose hand-painted brushwork, warm ochre sandstone, irregular earthen rock, dark brown shadows and restrained turquoise water. This is an approachable storybook game, not a photograph or 3D render. One continuous cinematic scene, no comic panels, no text or letters, no UI, no borders, no logos, no watermark. Keep key action in the central 75% with quiet space along the lowest 12% for captions added by the game. The reference image is the environment edit target. Reframe the same desert location into a 16:9 establishing shot: small rustic caretaker shelter beneath the rocky outcrop on the LEFT, THREE low rough circular stone well rims receding gently across the middle ground toward the right, dry shrubs, warm sandy footpath and the same open pale-blue sky with soft white clouds. Maintain the modest well scale and handmade shelter, no village skyline or new buildings. Leave a clear patch of ground in the lower RIGHT and another in front of the left shelter so the game's existing character PNG layers can be placed there. Draw NO PEOPLE or silhouettes. Inviting but quiet, the travelers have just arrived and do not yet know why the flow is reduced. Do not show the underground, debris blockage, repaired channel or a cutaway diagram.
```

### maintenance-record.png

参考图：`map-assets/SCN_L2_S.png`、`map-assets/ITM_L2_LAMP_R_OFF.png`

```text
Use case: compositing. Asset type: one finished fullscreen still for the existing 2D illustrated karez adventure game. Recompose the supplied environment into a LANDSCAPE 16:9 illustration (prefer 1920x1080), without stretching the panoramic source. Match its loose hand-painted brushwork, warm ochre sandstone, irregular earthen rock, dark brown shadows and restrained turquoise water. This is an approachable storybook game, not a photograph or 3D render. One continuous cinematic scene, no comic panels, no text or letters, no UI, no borders, no logos, no watermark. Keep key action in the central 75% with quiet space along the lowest 12% for captions added by the game. Image 1 is the environment edit target: a closer view at the same LEFT-hand rustic shelter, with the rocky outcrop behind it and a glimpse of sandy desert and a low well rim to the right. Image 2 is the small terracotta oil lamp PROP identity. A broad simple weathered wooden workbench fills the lower third of the frame, its far/top edge nearly horizontal at about 68% of frame height. An open cream paper maintenance ledger lies at the center of the bench. The page contains ONLY a tiny simple unlabeled diagram of three circles and one thin blue line, NO writing or legible symbols. A neat coil of brown work rope and the small terracotta oil lamp rest to the sides; show the lamp from an angle that hides the wick. Leave the space ABOVE the bench, especially the central 60% of the picture, calm and uncluttered, so the game can layer its existing three character sprites behind the table. Draw NO PEOPLE, hands, or silhouettes. Warm neutral DAYLIGHT as in the environment, not sunset; a grounded, peaceful completion of maintenance, not a feast or fantasy ceremony.
```

