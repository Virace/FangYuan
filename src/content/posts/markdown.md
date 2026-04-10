---
title: Markdown Baseline Sample
published: 2024-04-01
description: 用于校验 FangYuan 默认 Markdown 渲染效果的基础示例。
tags: [Markdown, FangYuan, Example]
category: Notes
draft: false
---

# Markdown Baseline Sample

This note keeps a compact but practical Markdown sample for FangYuan, so later theme changes can quickly verify typography, spacing, lists, tables, quotes, and code blocks.

## Text

Paragraphs are separated by a blank line.

You can mix _italic_, **bold**, `inline code`, and [links](https://astro.build) in the same paragraph without any special handling.

> A short quote block is useful for callouts, excerpts, or migration notes.

## Lists

1. Prepare a topic
2. Write the frontmatter
3. Publish when the note is ready

- unordered items also work well
- especially for small checklists
- or short content summaries

## Code

```ts
export function siteName(): string {
	return "FangYuan";
}
```

## Table

| Item | Purpose |
| :-- | :-- |
| `title` | Display name of the post |
| `description` | Summary shown in listings |
| `draft` | Keeps the post hidden until ready |

## Math

Inline math looks like $\omega = d\phi / dt$.

Display math can also be used:

$$I = \int \rho R^{2} dV$$
