---
title: FangYuan Markdown Extensions
published: 2024-05-01
updated: 2024-11-29
description: "用于记录 FangYuan 当前启用的 Markdown 扩展能力。"
image: ""
tags: [Markdown, FangYuan, Extensions]
category: Notes
draft: false
---

This page keeps the extended Markdown syntax that ships with the FangYuan baseline, so later theme work can always verify that these features still render correctly.

## GitHub Repository Cards

Use repository cards when a note needs a compact project reference.

::github{repo="Virace/FangYuan"}

```markdown
::github{repo="Virace/FangYuan"}
```

## Admonitions

The following admonition types are enabled: `note`, `tip`, `important`, `warning`, and `caution`.

:::note
Use callouts to highlight migration notes, temporary constraints, or future theme work.
:::

:::tip
Small reminders like command shortcuts or content conventions fit well in `tip` blocks.
:::

:::important
Keep legal attribution visible after the site identity switches to FangYuan.
:::

## Custom Titles

:::note[Baseline Reminder]
This page exists so the fork baseline can verify Markdown extensions after future UI changes.
:::

## GitHub Syntax

> [!TIP]
> The GitHub-style syntax is also supported and can be used when copying notes from issue threads or PR discussions.

## Spoiler

The content :spoiler[can stay hidden until the reader opens it].

```markdown
The content :spoiler[can stay hidden until the reader opens it].
```
