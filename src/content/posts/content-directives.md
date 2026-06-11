---
title: 内容指令扩展示例
published: 2026-02-09
updated: 2026-04-24
description: "集中展示 FangYuan 后续补充的内容指令组件。"
image: ""
tags: [示例, FangYuan, 指令, Markdown]
category: "示例"
draft: false
---

这篇文章集中展示 FangYuan 后续补充的内容指令组件，便于单独检查它们的渲染和交互效果。

## 行内高亮

当一句话里只需要强调某个短语，而不希望用整块提示区域时，可以使用行内高亮。

普通强调：:hl[重点信息]{tone="note"}

建议提示：:hl[推荐做法]{tone="tip"}

强提醒：:hl[需要特别注意]{tone="warning"}

```markdown
:hl[重点信息]{tone="note"}

:hl[推荐做法]{tone="tip"}

:hl[需要特别注意]{tone="warning"}
```

## 折叠块

折叠块适合放可选细节、更新记录，或者不想默认展开的较长示例。

:::fold{title="展开示例"}
这里是默认折叠的内容。
:::

```markdown
:::fold{title="展开示例"}
这里是默认折叠的内容。
:::
```

### 折叠块选项

可以直接在指令参数里控制默认展开状态以及标题图标。

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

## 补充说明块

`Aside` 适合放不会打断正文主线的补充说明、附言或轻量提醒。

:::aside
这是一段补充说明，适合放背景、PS 或轻量提醒。
:::

```markdown
:::aside
这是一段补充说明，适合放背景、PS 或轻量提醒。
:::
```
