# FangYuan / 方圆

FangYuan 是一个基于 Astro 的个人站点二开仓库，主要用于自用主题、内容与站点能力的持续演进。

## 上游说明

本项目基于 [saicaca/fuwari](https://github.com/saicaca/fuwari) 二次开发。

## 相对原版的主要差异

- 新增了外部 `site/` 输入层，站点配置、文章内容和资源文件可以从仓库外置输入，而不是只改主题仓库本身。
- 外部站点配置改为严格的 `site/site.config.yaml`，并提供 `node scripts/site/init-site.js` 初始化脚手架，不再沿用旧的 `site/config.ts` 约定。
- 评论、页面反馈和页面统计可以接入 `QingYan`；当后端未配置或运行时关闭时，前端会直接隐藏对应区块，不展示冗余占位组件。
- 固定链接、页面路由和部分站点能力支持通过外部 YAML 配置覆盖，方便二开站点在不改主题源码的情况下调整站点行为。
- 图片输入语义扩展到了 `site/assets/`、`src/`、`public/` 和远程 URL，适配真实内容站点而不是只服务仓库内 demo。
- 字体与样式体系做了进一步本地化和工程化收口，例如 Astro Font API、Markdown 扩展、置顶排序、内容页目录与反馈区等能力都已经接入当前主题主线。

## 快速开始

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
- 如果你接入 `QingYan`，通常只需要在这里填写站点 key、API 基础路径和开发期代理目标

### 图片输入语义

- Markdown 正文图片继续按 Markdown 原生相对路径解析，例如 `./inline.svg`、`../images/foo.png`
- 文章 frontmatter `image` 和站点配置里的图片字段支持本地资源、`public/` 资源以及远程 URL
- `site/assets/` 与 `src/` 下现有资源目录都可以作为本地图片输入来源

### 资源策略

- 正文字体与代码字体通过 Astro Font API 注册，不再依赖直接 `@fontsource/*` CSS import
- `astro.config.mjs` 中保留了一组可选的全局图片编码默认值，但默认关闭，避免把不同图片用法强行收口到一套统一参数
- `public/**` 图片路径继续按直接静态资源处理
- 远程图片 URL 默认继续透传；只有未来单独规划并授权的可信来源，才会进一步纳入 Astro 处理
- 浏览器视觉快照若因字体分发策略调整而变化，应先确认是预期设计结果，再决定是否更新基线

## 许可

本仓库继续使用 MIT 许可证。
