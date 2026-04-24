---
title: 内容与主题分离，以及评论接入
published: 2026-04-24
updated: 2026-04-24
description: 说明 FangYuan 如何把主题仓库、站点内容和评论能力拆开维护。
tags: [FangYuan, 架构, 评论, QingYan]
category: 指南
draft: false
---

FangYuan 现在更适合按“双仓”来维护：公开仓库存放主题源码和 demo，私有仓库存放正式站点内容。这样做的重点不是把东西拆散，而是让主题演进和内容运营各自独立。

## 主题负责什么

主题仓库主要负责站点本身的结构和能力，包括：

- `src/components/`、`src/layouts/`、`src/styles/` 里的界面与样式
- `src/plugins/` 和 `src/utils/` 里的 Markdown 扩展、路由规则和工具函数
- `src/default-config.ts` 里的 demo 默认配置
- `src/content/` 里的内置演示文章

这层更像“可复用的站点外壳”。它可以持续迭代，但不必和真实内容仓库绑死在一起。

## 内容负责什么

真实站点内容更适合放在外部 `site/` 输入层里维护：

- `site/site.config.yaml`
- `site/content/`
- `site/assets/`

这样一来，主题仓库可以继续公开，正式文章、页面和站点配置则可以单独放在私有仓库里，再通过同步或挂载方式进入构建流程。

## 两种开发模式

当前仓库已经内置了内部演示模式和外部内容模式：

```bash
pnpm dev:internal
pnpm dev:external

pnpm build:internal
pnpm build:external
```

- `internal`：使用仓库内 `src/content/` 和默认配置，适合主题演示、功能测试和公开 demo
- `external`：使用 `site/` 下的真实内容与配置，适合联调正式站点

这样可以保证“同一套主题代码”既能展示 demo，又能服务正式站点。

## 评论、反馈和统计

评论相关能力已经按可选模块处理，不要求每个站点都必须启用。

- 评论使用 `commentConfig`
- 页面反馈使用 `pageFeedbackConfig`
- 页面统计使用 `pageMetricsConfig`

这些能力都可以接入 `QingYan`。如果后端没有配置完成，前端会直接隐藏对应区块，而不是留下空壳组件。

对于 demo 站点，这种做法很合适：可以先展示主题本身和内容结构，等正式站点准备好评论后端后，再在外部站点配置里接入。

## 适合的工作流

如果把这套方案落成双仓，比较顺的分工通常是：

1. 公开仓库维护主题、演示内容和 Pages 站点
2. 私有仓库维护正式文章、页面、资源和站点配置
3. 正式部署时走外部内容模式
4. 主题更新时，先在 demo 验证，再同步到正式站点

这样既能保留一个稳定的公开演示入口，也不会把真实内容直接暴露在主题仓库里。
