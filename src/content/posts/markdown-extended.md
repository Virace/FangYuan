---
title: Markdown 扩展功能
published: 2026-02-02
updated: 2026-04-24
description: "了解 FangYuan 中支持的 Markdown 扩展能力。"
image: ""
tags: [示例, Markdown, FangYuan]
category: "示例"
draft: false
---

## GitHub 仓库卡片

可以在文章里插入链接到 GitHub 仓库的动态卡片。页面加载时，会自动从 GitHub API 拉取仓库信息。

::github{repo="Fabrizz/MMM-OnSpotify"}

使用 `::github{repo="<owner>/<repo>"}` 就能创建一张 GitHub 仓库卡片。

```markdown
::github{repo="Virace/FangYuan"}
```

## Bilibili 视频

提供视频的 BV 号即可插入 Bilibili 播放器，`p` 用于指定分 P，`title` 用于辅助说明。

::bilibili{bvid="BV1fK4y1s7Qf" p="1" title="Bilibili 视频示例"}

```markdown
::bilibili{bvid="BV1fK4y1s7Qf" p="1" title="Bilibili 视频示例"}
```

## 外链卡片

外链卡片适合友链页面。只提供标题、描述和链接时，会按外链域名使用 favicon fallback；如果有站点 logo，也可以显式传入一个完整图片 URL。

::link-card{url="https://astro.build" title="Astro" description="适合构建内容站点的 Web 框架。"}

::link-card{url="https://github.com/Virace/FangYuan" title="FangYuan" description="当前站点主题仓库。" logo="https://github.githubassets.com/favicons/favicon.svg"}

```markdown
::link-card{url="https://astro.build" title="Astro" description="适合构建内容站点的 Web 框架。"}

::link-card{url="https://github.com/Virace/FangYuan" title="FangYuan" description="当前站点主题仓库。" logo="https://github.githubassets.com/favicons/favicon.svg"}
```

### 多列友链

多张卡片可以放进 `link-grid` 容器中，布局会根据屏幕宽度自动换列。

:::link-grid
::link-card{url="https://astro.build" title="Astro" description="适合构建内容站点的 Web 框架。"}

::link-card{url="https://svelte.dev" title="Svelte" description="用于构建交互组件的前端框架。"}

::link-card{url="https://vite.dev" title="Vite" description="现代前端工具链。"}
:::

```markdown
:::link-grid
::link-card{url="https://astro.build" title="Astro" description="适合构建内容站点的 Web 框架。"}

::link-card{url="https://svelte.dev" title="Svelte" description="用于构建交互组件的前端框架。"}

::link-card{url="https://vite.dev" title="Vite" description="现代前端工具链。"}
:::
```

## 提示块

当前支持以下几种提示块类型：`note`、`tip`、`important`、`warning`、`caution`

:::note
即使只是快速浏览，也应该注意这类信息。
:::

:::tip
这类补充信息可以帮助读者更顺利地完成操作。
:::

:::important
这类信息通常是顺利完成任务所必需的关键内容。
:::

:::warning
这类内容通常与潜在风险有关，需要读者立即关注。
:::

:::caution
这类内容用于提醒某个操作可能带来的负面后果。
:::

### 基础语法

```markdown
:::note
即使只是快速浏览，也应该注意这类信息。
:::

:::tip
这类补充信息可以帮助读者更顺利地完成操作。
:::
```

### 自定义标题

提示块标题也可以自定义。

:::note[自定义标题]
这是一个带自定义标题的 `note` 类型提示块。
:::

```markdown
:::note[自定义标题]
这是一个带自定义标题的 `note` 类型提示块。
:::
```

### GitHub 语法

> [!TIP]
> 也兼容 [GitHub 提示块语法](https://github.com/orgs/community/discussions/16925)。

```
> [!NOTE]
> 也兼容 GitHub 的提示块语法。

> [!TIP]
> 也兼容 GitHub 的提示块语法。
```

### 剧透

可以在正文里插入剧透内容，剧透内部同样支持 **Markdown** 语法。

这段内容 :spoiler[会被隐藏 **嘿嘿**]！

```markdown
这段内容 :spoiler[会被隐藏 **嘿嘿**]！
```

行内高亮、折叠块和 Aside 这几类 FangYuan 后续补充的内容指令，已经单独整理到《内容指令扩展示例》里，方便分别查看效果。
