---
title: Expressive Code Baseline Notes
published: 2024-04-10
description: 用于预览 FangYuan 默认代码块样式与标记效果。
tags: [Markdown, FangYuan, Code]
category: Notes
draft: false
---

This note keeps a small set of [Expressive Code](https://expressive-code.com/) examples in one place, so FangYuan can verify code-block rendering before and after future theme updates.

## Syntax Highlighting

```ts
export function projectName(): string {
	return "FangYuan";
}
```

## Terminal Frames

```powershell title="PowerShell"
pnpm check
pnpm build
```

## Line Markers

```ts title="fork-baseline.ts" del={2} ins={3} {5}
export function oldName() {
	return "TemplateName";
}

export function projectName() {
	return "FangYuan";
}
```

## Diff Blocks

```diff
- Default template identity
+ FangYuan fork baseline
```

## Line Numbers

```ts showLineNumbers startLineNumber=10
export const currentStage = "baseline";
export const upstream = "fork-source";
```
