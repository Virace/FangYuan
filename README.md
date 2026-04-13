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

运行默认浏览器门禁：

```bash
pnpm test:e2e
```

运行本地视觉回归：

```bash
pnpm test:e2e:visual
```

只在确认 UI 改动本身就是预期结果时，才更新本地视觉基线：

```bash
pnpm test:e2e:update
```

常用本地变体：

```bash
pnpm test:e2e:headed
pnpm exec playwright test tests/e2e/smoke.spec.ts
pnpm exec playwright test tests/e2e/a11y.spec.ts
```

说明：

- `pnpm test:e2e` 默认不包含视觉快照测试，保证干净环境下无需提交 PNG 基线也能通过
- `pnpm test:e2e:visual` 和 `pnpm test:e2e:update` 仅作为本地视觉回归工作流使用
- `tests/e2e/visual.spec.ts-snapshots/` 已加入 `.gitignore`

更新 snapshot 前请先确认：

- UI 变化本身是有意设计，而不是偶发回归
- 已查看截图 diff，而不是只看命令通过
- 不要把无关内容改动和 snapshot 更新混在同一个提交里

## 说明

- 站点默认配置位于 `src/config.ts`
- 文章内容位于 `src/content/posts/`
- About 页面内容位于 `src/content/spec/about.md`
- 当前项目主身份统一为 `FangYuan`

## 外部 site 输入层

Phase 1 支持把真实站点输入从主题源码里拆到本地 `site/` 目录：

- `site/config.ts`：覆盖 `src/config.ts` 的同名导出；未提供的项继续回退到默认值
- `site/content/`：一旦存在且非空，`posts` 和 `spec` 两个 collection 会整体切到这里，不再混用 `src/content/`
- `site/assets/`：当前阶段只负责初始化目录，暂未接入运行时资源解析

这里的 `posts/` 和 `spec/` 只是 Astro content collection 的目录组织方式，不是两个独立开关。
切到 `site/content/` 后就视为整站内容完全切到 `site/`，不会额外检查内部哪个子目录“是否完整”。

初始化本地 `site/` 目录：

```bash
node scripts/init-site.js
```

初始化脚本会：

- 创建 `site/content/posts/`
- 创建 `site/content/spec/`
- 创建 `site/assets/`
- 复制默认 `about.md` 到 `site/content/spec/about.md`
- 在 fresh / empty `site/` 中生成一篇 `site/content/posts/welcome.md`，保证最低可 build
- 生成最小 `site/config.ts` 模板

说明：

- `site/` 已加入 `.gitignore`，用于承载本地站点输入，不进入主题仓库版本控制
- 如果 `site/` 已经存在并且里面已经有文件，`init-site` 不会再自动补 demo post
- 如果 `site/content/` 已启用但删掉了 `site/content/spec/about.md`，About 页面会直接报错，不会回退到 demo 内容

## 许可

本仓库继续使用 MIT License。
