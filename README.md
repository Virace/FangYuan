# FangYuan / 方圆

FangYuan 是一个基于 Astro 的个人站点二开基线项目。当前首次提交的目标，是把上游模板仓库整理成一个干净、可回溯、便于后续继续设计主题与内容的项目起点。

## 上游说明

本项目基于 [saicaca/fuwari](https://github.com/saicaca/fuwari) 二次开发。

## 本地开发

要求：

- Node.js >= 22.12.0
- pnpm >= 9

```bash
pnpm install
pnpm dev
pnpm check
pnpm build
```

## Browser Quality Gate

```bash
pnpm test:e2e
pnpm test:e2e:visual
pnpm test:e2e:update
```

- `pnpm test:e2e` 默认不包含视觉快照测试
- `pnpm test:e2e:visual` 和 `pnpm test:e2e:update` 主要用于本地视觉回归
- 更新 snapshot 前先确认变化是预期设计，而不是偶发回归

## 项目结构

- 默认配置：`src/config.ts`
- 文章内容：`src/content/posts/`
- About 页面：`src/content/spec/about.md`
- 当前项目主身份：`FangYuan`

## 外部 site 输入层

`develop` 分支当前支持一个本地 `site/` 输入层，用于把真实站点的内容、配置和资源从主题源码中拆出。该能力仍在演进，README 只记录稳定入口与基本目录，不追踪所有开发中细节。

- `site/config.ts`：本地站点配置覆盖入口
- `site/content/`：本地内容目录
- `site/assets/`：本地图片和其他静态资源目录

初始化本地 `site/` 目录：

```bash
node scripts/init-site.js
```

初始化脚本会创建基础目录、最小配置和示例内容，方便本地启动后继续调整。

说明：

- `site/` 已加入 `.gitignore`，用于承载本地站点输入，不进入主题仓库版本控制
- 开发分支中的目录组织和字段语义仍可能继续调整
- 若 README 与当前实现存在差异，以当前代码和 `pnpm build` 行为为准

### 图片输入语义

- Markdown 正文图片继续按 Markdown 原生相对路径解析，例如 `./inline.svg`、`../images/foo.png`
- 文章 frontmatter `image` 和站点配置里的图片字段支持本地资源、`public/` 资源以及远程 URL
- `site/assets/` 与 `src/` 下现有资源目录都可以作为本地图片输入来源
- 具体解析细节仍可能随开发分支调整，以实际构建结果为准

## 许可

本仓库继续使用 MIT License。
