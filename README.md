# FangYuan / 方圆

FangYuan 是一个基于 Astro 的个人站点二开仓库，主要用于自用主题、内容与站点能力的持续演进。

当前仓库采用轻量发布约定：

- `develop` 用于日常开发与集成
- `main` 只保留“可直接构建使用”的稳定结果
- 不强制维护对外语义化版本号
- 不强制发布 Git tag 或 GitHub Release

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
pnpm test:node
```

## 浏览器质量门禁

```bash
pnpm test:node
pnpm test:e2e
pnpm test:e2e:visual
pnpm test:e2e:update
```

- `pnpm test:node` 运行仓库内 Node 级回归测试
- `pnpm test:e2e` 默认不包含视觉快照测试
- `pnpm test:e2e:visual` 和 `pnpm test:e2e:update` 主要用于本地视觉回归
- 更新快照前先确认变化是预期设计，而不是偶发回归

## 分支约定

- `main` 的目标不是“正式发版历史”，而是“当前可直接使用的稳定分支”
- 合入 `main` 前至少应保证 `pnpm build` 与当前基线测试没有明显问题
- 如果后续需要做内部可追溯标记，优先使用提交 ID 或日期加提交短 SHA，而不是强行维护数字版本号

## 项目结构

- 默认配置：`src/config.ts`
- 文章内容：`src/content/posts/`
- 关于页面：`src/content/spec/about.md`
- 当前项目主身份：`FangYuan`

## 外部 site 输入层

- 配置文件：`site/site.config.yaml`
- 内容目录：`site/content/`
- 资源目录：`site/assets/`

初始化本地 `site/` 目录：

```bash
node scripts/site/init-site.js
```

更多说明：

- `docs/site-config.md`
- `docs/init-site.md`
- `docs/scripts.md`

说明：

- `site/` 已加入 `.gitignore`，用于承载本地站点输入，不进入主题仓库版本控制
- 初始化脚本会复制维护中的 `scripts/site/template.config.yaml` 模板，并替换少量初始化占位符
- 生成后的 `site/site.config.yaml` 需要直接维护，而不是回写运行时代码

### 图片输入语义

- Markdown 正文图片继续按 Markdown 原生相对路径解析，例如 `./inline.svg`、`../images/foo.png`
- 文章 frontmatter `image` 和站点配置里的图片字段支持本地资源、`public/` 资源以及远程 URL
- `site/assets/` 与 `src/` 下现有资源目录都可以作为本地图片输入来源
- 具体解析细节仍可能随开发分支调整，以实际构建结果为准

### 资源策略

- 正文字体与代码字体通过 Astro Font API 注册，不再依赖直接 `@fontsource/*` CSS import
- `astro.config.mjs` 中保留了一组可选的全局图片编码默认值，但默认关闭，避免把不同图片用法强行收口到一套统一参数
- `public/**` 图片路径继续按直接静态资源处理
- 远程图片 URL 默认继续透传；只有未来单独规划并授权的可信来源，才会进一步纳入 Astro 处理
- 浏览器视觉快照若因字体分发策略调整而变化，应先确认是预期设计结果，再决定是否更新基线

## 许可

本仓库继续使用 MIT 许可证。
