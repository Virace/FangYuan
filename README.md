# 方圆 / FangYuan

方圆是一个基于 Astro 的个人站点主题，关注内容、配置与站点能力的清晰边界，同时保留轻量、柔和、可持续演进的阅读体验。

- 方：边界、秩序、结构、配置、内容治理。
- 圆：柔和、阅读、交互、视觉、个人表达。

## 上游说明

本项目基于 [saicaca/fuwari](https://github.com/saicaca/fuwari) 二次开发。

## 相对原版的主要差异

### 体验侧

- 默认站点身份、演示内容、关于页和中文文案已经围绕方圆重新整理，不再只是原版主题的英文 demo。
- 写作体验更接近真实内容站点：正常编写 Markdown，并把文章图片放在文章目录或站点资源目录中即可，构建时由主题处理资源解析。
- 评论、页面反馈和页面统计可以接入 `QingYan`；当后端未配置或运行时关闭时，前端会直接隐藏对应区块，不展示冗余占位组件。
- 内容组织能力更适合长期维护：固定链接、归档排序、置顶文章、内容页目录与 Markdown 扩展都已经接入当前主题主线。

### 代码结构侧

- 新增了外部 `site/` 输入层，站点配置、文章内容和资源文件可以从仓库外置输入，主题源码和真实站点内容可以分开维护。
- 外部站点配置集中到严格的 `site/site.config.yaml`，并提供 `node scripts/site/init-site.js` 初始化脚手架。
- 图片输入语义扩展到了 `site/assets/`、`src/`、主题 `public/` 和远程 URL，适配真实内容站点而不是只服务仓库内 demo。
- 固定链接、页面路由、分页、置顶排序和部分站点能力都通过配置与工具层收口，减少页面中重复拼接规则。
- 字体与样式体系做了进一步本地化和工程化收口，例如 Astro Font API、Markdown 扩展、代码块增强、内容页目录与反馈区等能力都已经接入当前主题主线。

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
- `docs/markdown-extensions.md`

说明：

- `site/` 已加入 `.gitignore`，用于承载本地站点输入，不进入主题仓库版本控制
- 初始化脚本会复制维护中的 `scripts/site/template.config.yaml` 模板，并替换少量初始化占位符
- 初始化脚本会在 `site/assets/README.md` 写入安全资源目录说明
- 生成后的 `site/site.config.yaml` 需要直接维护，而不是回写运行时代码
- 如果你接入 `QingYan`，通常只需要在这里填写站点 key、API 基础路径和开发期代理目标

### 图片输入语义

- Markdown 正文图片继续按 Markdown 原生相对路径解析，例如 `./inline.svg`、`../images/foo.png`
- 文章 frontmatter `image` 和站点配置里的图片字段支持本地资源、主题 `public/` 资源以及远程 URL
- 外部站点自有图片的安全目录是 `site/assets/`，初始化后的数据源内引用写成 `assets/...`
- `site/assets/` 与 `src/` 下现有资源目录都可以作为本地图片输入来源
- 远程 `https://...` 图片会原样透传，不会被本地构建打包、压缩或校验

### 资源策略

- 正文字体与代码字体通过 Astro Font API 注册，不再依赖直接 `@fontsource/*` CSS import
- `astro.config.mjs` 中保留了一组可选的全局图片编码默认值，但默认关闭，避免把不同图片用法强行收口到一套统一参数
- `public/**` 图片路径继续按主题仓库静态资源处理；不要把外部站点自有图片放进外部根目录 `public/` 并假设会自动发布
- 远程图片 URL 默认继续透传；只有未来单独规划并授权的可信来源，才会进一步纳入 Astro 处理
- 浏览器视觉快照若因字体分发策略调整而变化，应先确认是预期设计结果，再决定是否更新基线

## 许可

本仓库继续使用 MIT 许可证。
