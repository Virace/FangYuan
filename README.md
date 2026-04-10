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

## 许可

本仓库继续使用 MIT License。
