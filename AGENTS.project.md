# FangYuan 项目级规范

本文件约束 `H:\Programming\Web\FangYuan` 仓库内的后续分支与集成流程。

## 项目技术形态

- 当前项目是 `Astro + TypeScript + Svelte` 的静态站点仓库。
- 页面与布局骨架主要放在 `Astro` 文件中，交互型小部件使用 `Svelte` island。
- 内容主线来自 `src/content/` 的 Markdown content collections，而不是数据库或后端接口。
- 搜索、RSS、sitemap、Markdown 扩展与代码块增强都已经接入，新增功能时优先沿用现有集成点，不要重复造轮子。

## 分支角色

- `main`：正式版分支。仅接受经过最终校验后的合并结果，不直接承载日常开发。
- `develop`：开发集成分支。作为当前项目的默认日常开发基线，用于承接功能分支与修复分支的阶段性集成。
- 其他子分支：统一从 `develop` 拉出，用于具体功能开发、问题修复或局部实验。

## 后续开发流程

1. 日常开发默认在 `develop` 基础上创建子分支，不直接在 `main` 上开发。
2. 子分支完成开发后，先向 `develop` 发起 PR。
3. `develop` 作为最后集成与校验分支，先完成联调、检查与必要验证。
4. 确认 `develop` 状态无问题后，再从 `develop` 向 `main` 发起 PR。
5. `main` 合并后的内容视为正式版基线。

## 执行约束

- 非明确紧急场景下，不直接向 `main` 提交代码。
- 若存在多个并行子分支，统一先汇入 `develop`，再由 `develop` 汇入 `main`。
- 与分支流转相关的说明、提交和 PR 讨论，默认以“`develop` 为集成分支，`main` 为正式分支”为前提。

## 编码与命名习惯

### 包管理与命令

- 统一使用 `pnpm`，不引入 `npm` / `yarn` / `bun` 作为并行包管理入口。
- 常用验证命令以 `package.json` 现有脚本为准：
  - `pnpm check`
  - `pnpm build`
  - `pnpm dev`
  - `pnpm format`
  - `pnpm lint`

### 格式化与静态检查

- `src/` 下代码默认受 `Biome` 约束：
  - 使用 `tab` 缩进
  - JavaScript / TypeScript 默认双引号
  - 开启 organize imports
- `format` 和 `lint` 脚本当前都只针对 `src/`，因此仓库根配置文件与 `scripts/` 下文件默认维持现状，不为“表面统一”做无关风格清洗。
- `.astro` / `.svelte` 文件存在针对未使用变量、未使用导入等规则的局部放宽；修改这些文件时，优先遵循当前项目现状，不要为了迎合通用 lint 习惯硬改结构。

### 目录与职责分层

- `src/pages/`：路由入口与页面级 Astro 文件。
- `src/layouts/`：页面布局骨架。
- `src/components/`：可复用 UI 组件。
  - `control/`：按钮、分页、返回顶部等控制型组件。
  - `misc/`：通用渲染辅助组件。
  - `widget/`：侧栏、TOC、分类、主题设置等面板型组件。
- `src/utils/`：URL、内容、日期、设置等工具函数。
- `src/constants/`：常量和预设。
- `src/plugins/`：Markdown / rehype / remark / expressive-code 插件扩展。
- `src/content/`：内容集合定义与 Markdown 内容。
- `src/styles/`：全局样式、变量和 markdown / transition / scrollbar 等专项样式。

### 文件命名

- Astro / Svelte 组件文件使用 `PascalCase`，例如 `Navbar.astro`、`Search.svelte`、`DisplaySettings.svelte`。
- 工具、常量、插件文件使用描述性文件名，现状以 `kebab-case` 为主，例如：
  - `content-utils.ts`
  - `url-utils.ts`
  - `link-presets.ts`
  - `remark-reading-time.mjs`
- 内容文件与路由文件按 Astro 约定命名；文章目录允许使用嵌套目录并把资源与文章同目录放置。

### 标识符命名

- 标识符统一使用英文。
- 配置对象使用显式语义名，例如 `siteConfig`、`navBarConfig`、`profileConfig`、`licenseConfig`。
- 工具函数倾向于动词开头的 `camelCase`，并保持职责直接清楚，例如：
  - `getSortedPosts`
  - `getSortedPostsList`
  - `getTagList`
  - `getCategoryUrl`
  - `getPostUrlBySlug`
- 类型名使用 `PascalCase`，例如 `PostForList`、`Tag`、`Category`、`NavBarLink`。

### 导入与类型使用

- 优先复用现有路径别名：
  - `@components/*`
  - `@assets/*`
  - `@constants/*`
  - `@utils/*`
  - `@i18n/*`
  - `@layouts/*`
  - `@/*`
- 同目录或近邻文件可继续使用相对路径；不要为了“全都统一成一种写法”而做无关改动。
- TypeScript 场景优先显式 `type` 导入和已有类型定义，避免重新声明与 schema 不一致的局部类型。

### 页面与交互实现习惯

- 静态结构、路由和页面拼装优先放在 `Astro` 文件。
- 需要浏览器态交互的局部功能，优先做成 `Svelte` 组件，并通过 island 方式接入 Astro 页面。
- 现有项目已经大量通过 `src/config.ts`、`src/utils/` 和 `src/content/config.ts` 集中管理配置、URL 和内容 schema；新增实现优先接入这些中心点，不要在页面里复制规则。
- 构建站内链接、文章链接、标签链接和分类链接时，优先复用 `src/utils/url-utils.ts` 中的 helper，不要手写基础 URL 拼接。

### 内容与 Frontmatter 约束

- 文章内容放在 `src/content/posts/`。
- 类页面内容放在 `src/content/spec/`。
- `src/content/config.ts` 已定义 `posts` collection schema；新增文章默认遵循现有 frontmatter 结构：
  - `title`
  - `published`
  - `updated`
  - `draft`
  - `description`
  - `image`
  - `tags`
  - `category`
  - `lang`
- `category` 当前 schema 允许空值 / `null` 语义；写类型和过滤逻辑时要和 schema 保持一致，不要自行收窄成更严格但不兼容的类型。

### 静态资源与样式

- 站点共享图片资源放在 `src/assets/images/`。
- 与文章强绑定的图片资源优先和文章 Markdown 同目录共置，例如 `src/content/posts/<slug>/cover.jpeg`。
- 需要公开绝对路径访问的静态资源放在 `public/`，当前典型用法是 favicon。
- 样式以 Tailwind utility class 为主，配合 `src/styles/` 下的全局 CSS / Stylus 文件；新增样式时优先复用现有变量和样式入口，不新开重复主题系统。
