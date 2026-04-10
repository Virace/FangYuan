---
title: FangYuan Baseline Notes
published: 2024-04-01
description: "Notes for evolving the FangYuan site from its initial fork baseline."
image: "./cover.jpeg"
tags: ["FangYuan", "Notes", "Baseline"]
category: Guides
draft: false
---

> Cover image source: [Source](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/208fc754-890d-4adb-9753-2c963332675d/width=2048/01651-1456859105-(colour_1.5),girl,_Blue,yellow,green,cyan,purple,red,pink,_best,8k,UHD,masterpiece,male%20focus,%201boy,gloves,%20ponytail,%20long%20hair,.jpeg)

FangYuan keeps the existing Astro-based project structure as its fork baseline. This guide records the minimum content conventions worth keeping around while the visual theme is still evolving.

## Post Frontmatter

```yaml
---
title: My First FangYuan Post
published: 2024-04-11
description: Notes for the FangYuan site baseline.
image: ./cover.jpg
tags: [FangYuan, Notes]
category: Notes
draft: false
---
```

| Attribute | Description |
| :-- | :-- |
| `title` | The title shown on the post page and index. |
| `published` | The publish date used for sorting. |
| `description` | A short summary shown in listings and meta output. |
| `image` | The cover image path for the post. |
| `tags` | The keyword set used for grouping and browsing. |
| `category` | The main content bucket of the post. |
| `draft` | Whether the post should stay hidden from public pages. |

## Content Placement

Place post files in `src/content/posts/`. You can also create sub-directories to keep related assets and long-form notes together.

```text
src/content/posts/
├── note.md
└── guide/
    ├── cover.jpeg
    └── index.md
```
