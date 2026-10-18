# 守井人设计

第二关坎儿井的年长维护师傅。沿用现有人物的手绘绘本画风和约四头身比例，用青色工作马甲、绳索和皮革工具袋体现日常维护工作。面向画面右侧，表情沉稳、亲切。

## 运行素材

- 文件：`keeper_idle.png`，保留生成的原始透明 PNG。
- 原图：1024×1536；`body` 帧矩形为 `(189, 95, 660, 1389)`，按 alpha > 32 的有效轮廓测量。替换图片时同步更新 `BootScene.create()` 中的帧矩形。
- 素材更新：递增 `BootScene.preload()` 中 `keeper_idle.png` 的 `?v=1`，并递增 `karez.html` 中 `main.js` 的脚本版本号。
- 场景：`js/SurfaceScene.js`，纹理键 `npc`、有效帧 `body`。
- 显示：有效人物轮廓高 184 逻辑单位，等比缩放，以靴底贴合地表步行线。
- 风格参考：`../amuti/amuti_sprite.png`、`../aide/idle/aide_idle_00.png`。守井人是独立角色。

## 生成记录

2026-10-17 使用 Codex 内置 imagegen 生成并调整。先生成造型，再以现有人物为风格参考调整比例和透明轮廓。提示词保留如下，供后续动作、表情素材保持一致。

### 初始造型提示词

```text
Use case: stylized-concept.
Asset type: a single production-ready transparent PNG character sprite for a 2D illustrated adventure game, the well keeper of the karez irrigation chapter.
Primary request: design one original older male irrigation-maintenance craftsman, around 60 years old, dependable and kindly, ready to guide the young protagonists. Match a warm hand-painted storybook RPG character style: crisp organic contours, soft painterly cel shading, slightly oversized expressive head, approximately four heads tall, tactile fabric and leather, finely drawn features that remain legible at a displayed height of 184 pixels.
Subject: weathered warm tan face, strong kind eyebrows, dark brown eyes, short salt-and-pepper beard and moustache, a little gray hair beneath a modest dark teal fabric cap with a narrow understated rust-and-cream geometric woven trim. A practical sand-colored long-sleeved linen work shirt, faded muted teal sleeveless work vest with modest woven edging, a worn reddish-brown sash, dark brown loose work trousers tucked into sturdy worn leather boots. A compact coil of work rope at his belt and a small leather tool pouch make his trade clear. One hand loosely rests near the rope and the other hangs naturally, hands anatomically correct.
Composition/framing: ONE character only, full body from the top of the cap through both boot soles, centered, three-quarter front view with face and torso turned slightly to the viewer's RIGHT, relaxed grounded standing pose, both feet on one baseline, strong clean silhouette, about 80% of the image height, narrow even transparent padding around the entire character, no cut-off parts. Render a tall portrait-oriented sprite.
Lighting/mood: warm neutral daylight, gentle self shading, calm welcoming expression, convincing older adult character rather than a child.
Color palette: weathered sandstone cream, muted deep teal, terracotta red accents, earthy brown leather; clothing practical and modest.
Constraints: genuinely transparent alpha background, preserve complete silhouette, no landscape, no props outside the character, no base or floor, no cast shadow outside the silhouette, no checkerboard painted into the image, no text, no borders, no labels, no watermark. No modern clothes, no armor or weapons, no exaggerated fantasy accessories, no saturated neon colors, no multiple views or sprite sheet.
```

### 最终素材调整提示词

第一张输入是初始守井人造型；第二张是阿木提全身图；第三张是艾德待机图。

```text
Use case: style-transfer.
Image 1 is the edit target: the new karez well keeper. Images 2 and 3 are STYLE AND CHARACTER-PROPORTION REFERENCES ONLY (existing game characters); do not copy their identities or clothing.
Convert the well keeper in Image 1 into one finished GAMEPLAY CHARACTER SPRITE in the same charming hand-painted storybook RPG style and stylized proportions as Images 2 and 3. Keep his identity and design: older warm tan male, salt-and-pepper short beard, kind brows and eyes, teal cloth cap with woven terracotta trim, cream work shirt, practical faded teal vest, terracotta sash, dark loose work trousers, sturdy boots, rope coil and tool pouch at belt. Keep the calm, capable caretaker personality and slight three-quarter turn toward the viewer's RIGHT.
Make the entire character approximately FOUR HEADS TALL with a slightly oversized expressive head, compact body and sturdy short limbs, readable painterly shapes and clean soft outlines like the reference sprites. The existing game uses these characters at 184 pixels tall, so the face, clothes, rope and boots must read at that scale. Avoid photographic adult proportions. Reduce overly realistic skin and fabric microtexture to the polished illustrated finish of the references.
ONE character, complete full body with both boots and cap visible, centered with about 8% transparent padding top and bottom, soles sharing a clear ground baseline, natural relaxed hands and standing pose. No additional panels, views, text or labels.
CRITICAL: Output a genuinely transparent PNG cutout. All pixels OUTSIDE the character silhouette must be fully transparent (alpha 0), including the space between the legs and arms. Remove ALL surrounding brown/teal glow, vignette, fog, dark background, floor and cast shadow. The character itself must be opaque, with only edge antialiasing. No checkerboard pattern painted into the image, no backdrop, no watermark.
```
