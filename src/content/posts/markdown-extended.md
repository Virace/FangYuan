---
title: Markdown Extended Features
published: 2024-05-01
updated: 2024-11-29
description: 'Read more about Markdown features in FangYuan'
image: ''
tags: [Demo, Example, Markdown, FangYuan]
category: 'Examples'
draft: false 
---

## GitHub Repository Cards

You can add dynamic cards that link to GitHub repositories, on page load, the repository information is pulled from the GitHub API.

::github{repo="Fabrizz/MMM-OnSpotify"}

Create a GitHub repository card with the code `::github{repo="<owner>/<repo>"}`.

```markdown
::github{repo="Virace/FangYuan"}
```

## Admonitions

Following types of admonitions are supported: `note` `tip` `important` `warning` `caution`

:::note
Highlights information that users should take into account, even when skimming.
:::

:::tip
Optional information to help a user be more successful.
:::

:::important
Crucial information necessary for users to succeed.
:::

:::warning
Critical content demanding immediate user attention due to potential risks.
:::

:::caution
Negative potential consequences of an action.
:::

### Basic Syntax

```markdown
:::note
Highlights information that users should take into account, even when skimming.
:::

:::tip
Optional information to help a user be more successful.
:::
```

### Custom Titles

The title of the admonition can be customized.

:::note[MY CUSTOM TITLE]
This is a note with a custom title.
:::

```markdown
:::note[MY CUSTOM TITLE]
This is a note with a custom title.
:::
```

### GitHub Syntax

> [!TIP]
> [The GitHub syntax](https://github.com/orgs/community/discussions/16925) is also supported.

```
> [!NOTE]
> The GitHub syntax is also supported.

> [!TIP]
> The GitHub syntax is also supported.
```

### Spoiler

You can add spoilers to your text. The text also supports **Markdown** syntax.

The content :spoiler[is hidden **ayyy**]!

```markdown
The content :spoiler[is hidden **ayyy**]!

```

## Inline Highlight

Use inline highlight when a sentence needs emphasis but a full block would be too heavy.

普通强调：:hl[重点信息]{tone="note"}

建议提示：:hl[推荐做法]{tone="tip"}

强提醒：:hl[需要特别注意]{tone="warning"}

```markdown
:hl[重点信息]{tone="note"}

:hl[推荐做法]{tone="tip"}

:hl[需要特别注意]{tone="warning"}
```

## Fold

Use fold blocks for optional details, update logs, or longer examples.

:::fold{title="展开示例"}
这里是默认折叠的内容。
:::

```markdown
:::fold{title="展开示例"}
这里是默认折叠的内容。
:::
```

### Fold Options

You can control the default open state and the title icon directly in the directive.

默认关闭，不写 `open`：

:::fold{title="默认关闭示例"}
这里默认保持折叠。
:::

默认展开，显式写 `open="true"`：

:::fold{title="默认展开示例" open="true"}
这里会在页面加载时直接展开。
:::

隐藏左侧图标：

:::fold{title="无图标示例" icon="none"}
这里保留标题和箭头，但不显示左侧图标。
:::

替换图标：

:::fold{title="书签图标示例" icon="bookmark"}
可选图标包括 `file` `note` `tip` `warning` `question` `bookmark` `sparkles` `none`
:::

```markdown
:::fold{title="默认关闭示例"}
这里默认保持折叠。
:::

:::fold{title="默认展开示例" open="true"}
这里会在页面加载时直接展开。
:::

:::fold{title="无图标示例" icon="none"}
这里保留标题和箭头，但不显示左侧图标。
:::

:::fold{title="书签图标示例" icon="bookmark"}
可选图标包括 `file` `note` `tip` `warning` `question` `bookmark` `sparkles` `none`
:::
```

## Aside

Use aside blocks for side notes that should not interrupt the main narrative.

:::aside
这是一段补充说明，适合放背景、PS、或轻量提醒。
:::

```markdown
:::aside
这是一段补充说明，适合放背景、PS、或轻量提醒。
:::
```
