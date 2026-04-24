# Banner 提示词库

本文档沉淀方圆默认 banner 图片的生成提示词。这里的 banner 指站点顶部背景图，不是文章封面，也不是需要完整展示主体的 hero 图。

## 目标

- 支持桌面端宽幅裁切、导航遮挡、文章卡片遮挡。
- 支持移动端和文章页只露出较窄横向区域时仍然成立。
- 避免依赖人物、书本、城市、风景、文字等必须完整可见的主体。
- 优先生成有质感、有颜色、有主题气质的背景图，而不是单纯纹理或普通摄影图。
- 默认主题气质偏浅蓝、轻量、柔和、略带 ACG 感，因此允许更鲜艳的蓝、青、紫、黄、橙、粉色。

## 通用筛选标准

| 标准 | 判断方式 |
|---|---|
| 裁切安全 | 只露出中间一条横向区域时仍然好看 |
| 无主体依赖 | 看不见某个物体、角色或城市时，画面仍然成立 |
| 颜色适配 | 能接住方圆默认浅蓝主题，不被深黑或重赛博海报感压住 |
| 质感明确 | 有颜料、画布、纸纹、笔触、色散、破碎层等可见质感 |
| 不抢内容 | 不出现文字、logo、角色脸、明显地标、广告牌或强叙事场景 |

## 风格索引

| 编号 | 风格 | 推荐程度 | 说明 |
|---|---|---|---|
| B-01 | Editorial 桌面静物 | 低 | 早期方向，裁切比人物安全，但和当前主题气质偏离 |
| B-02 | 真实照片桌面 | 低 | 容易变成生活方式摄影，主体裁切风险较高 |
| B-03 | 材质型桌面背景 | 中低 | 比静物安全，但可能偏高级灰、缺少鲜艳质感 |
| B-04 | 抽象材质表面 | 中 | 裁切安全，但需要防止变成纯渐变或过于平淡 |
| B-05 | 书写材料纹理 | 中低 | 保留内容站语义，但书本/笔容易重新变成主体 |
| B-06 | ACG 友好鲜艳颜料抽象 | 高 | 更贴当前浅蓝主题和轻二次元气质 |
| B-07 | 原版 Fuwari 式油画抽象 | 高 | 最接近原版默认 banner 的精神续作 |
| B-08 | 现代 anime 背景层抽象 | 中高 | 更轻、更年轻，但要压住星星、爱心、角色化元素 |
| B-09 | 赛博霓虹颜料抽象 | 中高 | 加入 2077 式霓虹材质，但不做夜城场景 |
| B-10 | 油画抽象 + 赛博点缀 | 高 | 保持原版油画底子，赛博只做辅助纹理 |
| B-11 | 柔和赛博霓虹抽象 | 中高 | 更明显的 cyber-neon，但仍控制为背景图 |
| B-12 | 厚涂油画与赛博破碎碰撞 | 最高 | 当前最推荐方向：有质感、有冲突、裁切安全 |
| B-13 | 油画被数字故障撕裂 | 高 | 更强破碎感，适合想要更有冲击力的默认图 |
| B-14 | 轻主题赛博故障柔化版 | 高 | 保留碰撞感，同时更贴浅蓝柔和 UI |

## B-01：Editorial 桌面静物

适用场景：早期偏安静、写作、文具感方向。现在不作为首选。

```text
Create a calm editorial website banner for a personal writing and technology blog named FangYuan.

Aspect ratio 1.4:1, suitable for a responsive homepage banner. The image must be mobile-safe: the central 45% width and the full height should remain visually complete when cropped on a narrow phone screen. Keep the main visual weight in the center-lower area, around 45% to 65% from the top. The top 25% must not be blank; add subtle paper texture, soft window light, gentle shadows, or small quiet details so it does not look like empty forehead space on mobile. The bottom 30% should have slightly richer texture and a calm darker transition because content cards may overlap it.

Scene: a refined desk-side composition with layered paper sheets, a notebook, a pen, soft window light, a small plant shadow, and subtle square and circular objects as a quiet reference to FangYuan. No people. No text. No logo. No watermark.

Style: polished semi-realistic digital illustration, editorial, quiet, modern, restrained, not marketing-like, not fantasy, not anime. Soft natural morning light, warm off-white paper, pale gray, muted cyan and teal accents, tiny hints of blue-violet matching a hue around 250. Balanced for both light and dark website themes.

Avoid: large blank sky, large empty wall, pure gradient background, distant mountain panorama, city skyline, centered portrait, face, head, big sun, high saturation purple, high saturation blue, harsh contrast, readable text, decorative bokeh blobs.
```

## B-02：真实照片桌面

适用场景：希望得到偏真实照片的桌面氛围图。当前主题下不推荐作为默认。

```text
A calm responsive homepage banner photograph for a personal writing and technology blog.

Aspect ratio 1.4:1. Mobile-safe composition: the central vertical crop must look complete on a phone screen, with no large empty top area. Main visual weight in the center-lower third. Top area has soft window light, subtle paper texture, gentle plant shadows, and quiet detail instead of blank wall or sky. Bottom area has slightly richer shadow and texture for content overlap.

Subject: a quiet desk near a window, layered papers, notebook, pen, a ceramic cup, subtle square and circular objects, soft daylight, muted cyan and teal accents, warm off-white and pale gray base colors. Refined, natural, clean, editorial, low saturation, medium contrast.

No people, no faces, no text, no logo, no watermark, no large sky, no city skyline, no empty wall, no heavy blur, no saturated purple or blue.
```

## B-03：材质型桌面背景

适用场景：比静物更安全，强调背景属性；但可能偏灰、偏生活方式。

```text
Create a calm editorial ambient backdrop for a personal writing and technology blog named FangYuan.

The image should feel like a refined desk-side material scene, but it must behave like a crop-safe background rather than a subject photo. No single object should be the main focal point. The composition must remain attractive when only a narrow horizontal strip is visible, when the top is covered by a navbar, and when the lower area is covered by content cards.

Scene elements: layered off-white paper, subtle torn paper edges, soft window light, gentle plant shadows, muted blue-gray paper pieces, faint square and circular objects, frosted glass or acrylic texture, ceramic or stone surfaces. Objects may be partially cropped at the edges. The image should have quiet detail across the whole frame, especially through the middle band, without any important subject that needs to be fully visible.

Style: polished semi-realistic editorial image, calm, modern, restrained, tactile, natural daylight, low saturation, medium-low contrast. Warm off-white, pale gray, blue-gray, muted cyan, tiny hints of blue-violet. Suitable for both light and dark website themes.
```

## B-04：抽象材质表面

适用场景：安全背景方向。需要额外要求“有手感”，避免生成平滑渐变。

```text
Create a crop-safe website banner background for a personal blog named FangYuan.

Design a tactile abstract editorial surface made from layered paper, soft shadows, translucent glass, subtle fabric grain, and quiet geometric references to squares and circles. It should look like a real photographed material composition, not a flat digital gradient. There should be no main subject and no object that needs to be fully visible. Every crop should still look intentional.

The middle horizontal band must contain the most balanced visual texture because the website often shows only a narrow strip of the image. The top area should have soft light and subtle detail, not blank space. The bottom area may be slightly darker and calmer for content overlap.

Palette: warm neutral paper white, stone gray, muted blue-gray, pale cyan, tiny blue-violet accents around hue 250. Low saturation, quiet, refined, editorial, modern.

Avoid text, logos, people, books as a central subject, laptop, coffee cup as a central subject, landscape, sky, skyline, large empty wall, pure gradient, hard poster-like contrast.
```

## B-05：书写材料纹理

适用场景：想保留“内容站 / 写作”的语义，但要避免书本或笔变成主角。

```text
A calm crop-safe editorial desk texture for a personal writing and technology blog.

Layered papers, notebook edges, pen shadows, translucent glass, ceramic surfaces, soft window light, and quiet plant shadows. The notebook and pen must not be centered or treated as the main subject; they should appear only as partial edge details within a wider material composition. The image should read as an ambient background even when heavily cropped.

No readable text, no logo, no people, no face. No single central object. Balanced texture across the whole frame. Warm paper tones, pale gray, muted blue-gray, soft cyan, subtle blue-violet accents. Semi-realistic, refined, natural, low saturation, medium contrast.
```

## B-06：ACG 友好鲜艳颜料抽象

适用场景：贴近方圆现在浅蓝、柔和、略二次元的气质。

```text
Create a vivid crop-safe abstract banner background for a soft anime-adjacent personal blog theme named FangYuan.

The image should feel like colorful acrylic paint, oil pastel, and gouache pigments spread across textured paper or canvas. It must have real tactile brush texture, visible pigment layering, soft palette-knife smears, dry-brush grain, and subtle paper fibers. The style is bright, expressive, soft, and polished, like an abstract background layer from a modern anime key visual, but with no characters and no recognizable objects.

Composition: all-over abstract composition with no central subject and no focal object. Every crop should still look intentional. It must remain attractive when only a narrow horizontal strip is visible, when the top is covered by a navbar, and when the lower part is covered by content cards. Keep visual rhythm and color variation across the entire image, especially through the middle horizontal band.

Color palette: bright sky blue, azure, soft cyan, periwinkle, lavender, lemon yellow, warm orange, coral pink, soft white, and small blue-gray shadow areas. Saturation can be medium-high, but the image should stay clean, airy, and gentle, not neon or harsh.

Mood: playful but refined, light, clear, modern, soft, slightly ACG-inspired, suitable for a rounded blue personal blog UI.

Avoid: people, faces, characters, books, desk objects, laptop, coffee cup, landscape, sky horizon, city skyline, flowers as a clear subject, text, logo, watermark, flat vector gradients, bokeh blobs, overly realistic photography, dark heavy oil painting, muddy colors, a single centered motif.
```

## B-07：原版 Fuwari 式油画抽象

适用场景：最接近原版默认 banner 的精神续作，适合作为默认候选。

```text
Create a colorful abstract oil-paint banner background for a personal blog.

The image should be a pure painterly abstract composition made from thick oil paint, acrylic smears, palette-knife strokes, soft gouache blending, and visible canvas texture. It should feel tactile and hand-painted, with rich pigment, layered brush marks, and subtle impasto texture. No subject, no object, no scene.

The composition must be crop-safe for a responsive website banner: no central focal point, no important detail near only one edge, no recognizable shape that needs to stay complete. The entire image should work as a background even when heavily cropped into a narrow strip.

Use a bright but soft palette: vivid sky blue, cyan, ultramarine touches, lavender, warm yellow, orange, coral, and creamy white. Keep the mood fresh, airy, energetic, and slightly anime-theme-friendly. Saturation should be lively, not muted, but avoid neon harshness.

Avoid photorealism, desk still life, books, pens, paper stacks, people, characters, text, logos, landscapes, horizons, pure gradients, symmetrical patterns, bokeh circles, and muddy brown colors.
```

## B-08：现代 Anime 背景层抽象

适用场景：更年轻、更轻的 ACG 气质。需要防止模型生成角色、星星、爱心等明确符号。

```text
Create a soft vivid abstract background for an anime-adjacent personal blog UI.

The image should look like the colorful painted background layer behind a modern anime illustration, but without any character, object, or scene. Use expressive hand-painted brush strokes, translucent gouache washes, oil pastel texture, paper grain, and soft luminous color transitions. It should be abstract, tactile, and full of painterly texture, not a flat gradient.

Composition must be crop-safe: no central subject, no readable silhouette, no important motif that can be cut off. The middle horizontal band should have the strongest balance of color and texture because the website often shows only a narrow banner strip. Top and bottom should also contain enough texture and color variation to avoid empty areas.

Palette: clear sky blue, cyan, periwinkle, lavender, soft violet, lemon yellow, peach orange, coral pink, and creamy white. Bright, clean, slightly playful, with medium-high saturation and soft contrast. It should match a rounded, light-blue, modern personal blog theme.

Avoid characters, faces, eyes, stars as main objects, hearts, text, logo, watermark, realistic desk, books, laptop, coffee, landscape, clouds with horizon, city, pure abstract vector shapes, neon cyberpunk, and dark moody painting.
```

## B-09：赛博霓虹颜料抽象

适用场景：加入 2077 式霓虹能量，但仍然不是城市、人物或游戏海报。

```text
Create a vivid crop-safe abstract banner background for a soft anime-adjacent personal blog theme named FangYuan, with subtle cyberpunk 2077-inspired neon energy.

The image should be an abstract painterly composition, not a city scene. Combine thick acrylic paint, oil pastel, gouache pigment, palette-knife smears, visible canvas texture, and paper grain with subtle cyberpunk materials: neon cyan glow, electric blue accents, acid yellow sparks, soft magenta-violet edges, holographic film texture, faint scanlines, tiny glitch fragments, and circuit-like strokes.

Composition: all-over abstract background with no central subject, no recognizable object, and no focal scene. It must remain attractive when heavily cropped into a narrow horizontal strip, when the top is covered by a navbar, and when the bottom is covered by content cards. The middle horizontal band should have the strongest balance of color, brush texture, and neon rhythm.

Color palette: bright sky blue, cyan, electric blue, periwinkle, lavender, violet, magenta, acid yellow, warm orange, coral pink, creamy white, and small deep blue-gray shadow areas. Medium-high saturation, clean and luminous, energetic but soft. It should match a rounded light-blue personal blog UI with a slight anime feeling.

Mood: playful, polished, modern, vivid, cyber-neon, tactile, slightly futuristic, but still gentle and readable as a website background.

Avoid: people, faces, characters, city skyline, street scene, cars, weapons, robots, cybernetic body parts, buildings, readable text, numbers, logos, brand marks, game symbols, black-and-yellow warning stripes as the main motif, pure vector gradients, bokeh blobs, dark heavy sci-fi poster look, muddy colors, a single centered motif.
```

## B-10：油画抽象 + 赛博点缀

适用场景：保持原版油画底子，只把赛博朋克变成辅助纹理。适合默认图候选。

```text
Create a colorful abstract oil-paint website banner background with subtle cyber-neon accents.

The image should feel like a pure hand-painted abstract composition made from thick oil paint, acrylic smears, gouache blending, palette-knife strokes, oil pastel texture, and visible canvas grain. Add only subtle cyberpunk-inspired details: thin neon cyan streaks, small acid yellow highlights, faint magenta-violet color fringing, soft holographic shimmer, tiny glitch-like pigment breaks, and delicate scanline texture.

No subject, no object, no scene. It should not look like a city, poster, game screenshot, or sci-fi illustration. It should remain a crop-safe abstract background for a responsive blog banner.

Composition: all-over painterly texture, no central focal point, no recognizable motif, no important detail that needs to stay complete. The whole image should still work when only a narrow strip is visible.

Palette: vivid sky blue, cyan, ultramarine touches, lavender, violet, warm yellow, orange, coral, creamy white, and a few muted navy-gray shadows. Bright and saturated, but clean, airy, and soft enough for a rounded light-blue blog theme.

Avoid characters, faces, logos, text, numbers, city skyline, streets, vehicles, weapons, robots, cyber arms, warning signs, pure black background, neon cyberpunk poster style, flat gradient, symmetrical patterns, and muddy brown colors.
```

## B-11：柔和赛博霓虹抽象

适用场景：赛博感更明显，但仍控制为轻主题背景。

```text
Create a soft cyber-neon abstract banner background for an anime-adjacent personal blog UI.

The image should look like neon pigments and holographic paint smeared across textured canvas. Use expressive hand-painted brush strokes, translucent gouache washes, oil pastel grain, acrylic smears, soft glowing cyan lines, acid yellow highlights, magenta-violet chromatic edges, faint scanlines, tiny digital glitch fragments, and subtle circuit-like marks. It should feel futuristic and vivid, but still abstract and tactile.

No city, no character, no object, no readable text. The image must be crop-safe for a responsive banner: no central subject, no horizon line, no important motif, no single area that must remain visible. Every crop should still look intentional.

Palette: electric cyan, sky blue, blue-violet, magenta, acid yellow, warm orange, coral pink, creamy white, and small deep navy patches. Medium-high saturation, luminous, clean, energetic, soft contrast.

It should match a rounded light-blue personal blog theme, not a dark cyberpunk game poster.

Avoid people, faces, eyes, city skyline, roads, signs, cars, guns, robots, mechanical limbs, logos, numbers, readable typography, yellow-black hazard stripes, dark smoky atmosphere, pure vector art, smooth AI gradient, and bokeh blobs.
```

## B-12：厚涂油画与赛博破碎碰撞

适用场景：当前最推荐方向。它把“油画涂抹”和“赛博破碎”当成两套材质系统碰撞，而不是普通赛博题材图。

```text
Create a vivid crop-safe abstract banner background for a soft anime-adjacent personal blog theme named FangYuan.

The image should be a collision between expressive abstract oil painting and fragmented cyberpunk glitch aesthetics. Use thick impasto oil paint, acrylic smears, gouache blending, palette-knife strokes, dry-brush grain, visible canvas texture, and rich pigment layering. Break the painterly surface with cyber-glitch fragments: fractured neon slices, displaced rectangular shards, chromatic aberration edges, faint scanlines, holographic cracks, pixel-smeared seams, and tiny digital noise artifacts.

The result should feel like hand-painted color being disrupted by a futuristic digital fracture layer. It must remain abstract, tactile, vivid, and crop-safe. No central subject, no recognizable scene, no single focal object. Every crop should still look intentional, especially a narrow horizontal strip through the middle.

Color palette: vivid sky blue, cyan, electric blue, ultramarine, lavender, violet, magenta, acid yellow, warm orange, coral pink, creamy white, and small deep blue-gray shadow patches. Medium-high saturation, luminous, energetic, clean, not muddy. The mood is playful, polished, futuristic, and slightly ACG-inspired, but still gentle enough for a rounded light-blue blog UI.

Composition: all-over abstract composition, balanced color rhythm across the full image, strongest painterly-glitch texture through the middle horizontal band. Brush strokes and glitch fragments should continue beyond the image edges. No horizon line. No empty top area. No important detail that needs to stay complete.

Avoid: people, faces, characters, city skyline, streets, cars, weapons, robots, cybernetic body parts, buildings, readable text, numbers, logos, brand marks, warning signs, pure black background, dark sci-fi poster look, flat vector gradients, bokeh blobs, symmetrical patterns, a single centered crack, muddy brown colors.
```

## B-13：油画被数字故障撕裂

适用场景：更强破碎感版本。适合想要更有冲击力的候选图。

```text
Create an abstract website banner background where thick colorful oil paint is shattered by cyberpunk digital glitches.

The base layer is vivid impasto painting: heavy oil paint, acrylic smears, palette-knife marks, rough canvas grain, pigment clumps, dry-brush scratches, and soft gouache color blends. Over it, add fractured cyberpunk energy: broken neon cyan cuts, acid yellow light leaks, magenta-violet chromatic splitting, offset glitch rectangles, pixel tears, scanline scratches, holographic shard reflections, and displaced color channels.

It should look like a hand-painted abstract canvas being corrupted by a futuristic digital signal. The image must stay crop-safe and background-like: no subject, no scene, no characters, no skyline, no typography, no logo, no central focal point. The whole image should work even when only a narrow horizontal strip is visible.

Use a bright saturated palette: sky blue, cyan, electric blue, violet, magenta, acid yellow, orange, coral, creamy white, and small navy-gray shadows. High energy but still clean, airy, and compatible with a soft rounded light-blue personal blog theme.

Avoid dark cyberpunk poster style, black-dominant background, neon city, readable signs, humans, robots, weapons, vehicles, hard symmetrical patterns, pure smooth gradients, and muddy colors.
```

## B-14：轻主题赛博故障柔化版

适用场景：保留油画与赛博故障碰撞，但更贴浅蓝柔和 UI，不让画面太重。

```text
Create a soft vivid abstract banner background for a rounded light-blue personal blog UI.

Blend expressive oil-paint texture with delicate cyber-glitch fragments. Use colorful acrylic and gouache smears, visible canvas grain, oil pastel scratches, palette-knife strokes, and layered pigment. Add subtle fractured neon details: thin cyan cuts, small acid yellow sparks, lavender-magenta color fringing, translucent holographic shards, faint scanlines, and tiny displaced pixels.

The cyberpunk feeling should appear as broken luminous texture inside the painting, not as a city scene or sci-fi poster. Keep it abstract, airy, playful, and crop-safe. No central subject. No object. No character. No text. The image should still look good when cropped into a narrow horizontal banner strip.

Palette: sky blue, cyan, periwinkle, lavender, violet, coral pink, warm orange, lemon yellow, creamy white, and a few soft blue-gray shadows. Medium-high saturation, clean brightness, soft contrast, tactile hand-painted feel.

Avoid black-heavy cyberpunk, city skyline, streets, signs, robots, people, faces, anime character parts, logos, readable text, flat vector gradient, large bokeh circles, and a single centered fracture.
```

## 当前建议

默认优先尝试 B-12，其次 B-10、B-13、B-14。

- B-12：最完整地表达“抽象油画涂抹和赛博朋克破碎版的碰撞”。
- B-10：更保守，适合保留原版 Fuwari 默认图的精神。
- B-13：更强冲击力，适合多生成几张作为备选。
- B-14：更轻、更贴当前浅蓝柔和 UI。

如果生成结果太像夜城、游戏海报或科幻场景，应降低 cyberpunk 题材词，保留 `fragmented cyber-glitch`、`neon slices`、`chromatic aberration`、`holographic cracks` 这类材质词。
