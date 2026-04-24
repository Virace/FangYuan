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
