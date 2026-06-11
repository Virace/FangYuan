---
title: FangYuan 简明指南
published: 2026-01-19
description: "说明如何使用这个博客模板。"
image: "./cover.jpeg"
tags: ["FangYuan", "写作", "自定义"]
category: 指南
draft: false
---

> 封面图来源：[来源链接](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/208fc754-890d-4adb-9753-2c963332675d/width=2048/01651-1456859105-(colour_1.5),girl,_Blue,yellow,green,cyan,purple,red,pink,_best,8k,UHD,masterpiece,male%20focus,%201boy,gloves,%20ponytail,%20long%20hair,.jpeg)

这个博客模板基于 [Astro](https://astro.build/) 构建。指南里没有展开说明的部分，通常都可以在 [Astro Docs](https://docs.astro.build/) 里找到答案。

## 文章 Frontmatter

```yaml
---
title: 我的第一篇博客文章
published: 2026-01-12
description: 这是我新的 Astro 博客中的第一篇文章。
image: ./cover.jpg
tags: [示例, 前端]
category: 前端
draft: false
---
```

| 字段 | 说明 |
|------|------|
| `title` | 文章标题。 |
| `published` | 文章发布时间。 |
| `description` | 文章简介，会展示在列表页。 |
| `image` | 文章封面图路径。<br/>1. 以 `http://` 或 `https://` 开头：使用网络图片<br/>2. 以 `./` 或 `../` 开头：表示相对当前 Markdown 文件的路径<br/>3. 外部站点根目录的共享图片写成 `assets/...` |
| `tags` | 文章标签。 |
| `category` | 文章分类。 |
| `draft` | 是否为草稿。草稿文章不会展示给访客。 |

## 文章文件应该放在哪里

文章文件应该放在 `src/content/posts/` 目录下。你也可以按需创建子目录，用来更好地组织文章和配套资源。

```
src/content/posts/
├── post-1.md
└── post-2/
    ├── cover.png
    └── index.md
```
