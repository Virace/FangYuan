# FangYuan 项目级规范

本文件约束当前仓库内的后续分支与集成流程。

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
- 项目约束、设计文档、计划文档、提交说明与评审说明中，如需引用当前仓库内目录或文件，一律优先使用相对路径，例如 `src/`、`tests/`、`public/`；不要暴露本机绝对目录。
- README 属于阶段性收口文档。开发过程中对语义仍未稳定、仍可能回退或仍需继续验证的改动，不要提前写入 README；应在阶段性总结、准备提交或准备 PR 时再统一补 README。

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
- 修改 `src/` 下代码后，如果已经知道存在 `Biome` 的 lint / format 问题，默认先执行 `pnpm run format`，先让 Biome 自动处理格式化、导入排序与 safe fixes。
- 执行 `pnpm run format` 后若仍有剩余诊断，再按剩余问题手动修复；不要明知有现成自动修复入口时还直接跳过格式化阶段。
- 只要本轮新增或修改了代码文件，交付前默认至少补跑一次与作用域匹配的修复命令；对当前仓库的前端代码，默认顺序是 `pnpm format` -> `pnpm lint`，不要只改代码不做修复回归。
- 如果 `format` / `lint --write` / 其他自动修复命令带出了不属于本轮任务的文件变更，不要混入当前提交；应先识别这些越界文件，并将其单独提交，与本轮任务提交分离。
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

### 依赖升级原则

- 依赖升级默认遵循“结果优先、最小改动、迁到新版本推荐状态”的原则。
- 升级的主要收益有两类：
  - 提升后续开发体验与维护成本
  - 让最终前端产物更健康，例如减少兼容包袱、缩小产物、改善加载表现
- 只要旧写法属于新版本的兼容层，而不是当前官方推荐写法，升级时默认应迁到新版本推荐写法，不保留 `v3/v4/v5` 混搭式兼容代码。
- 判断升级是否成功，优先看用户可见结果与最终产物，而不是“源码是否显得更显式”：
  - 视觉、交互、可访问性和运行时行为应与升级目标一致
  - 若新版本推荐写法在保持结果一致的同时能减少源码或减少前端负担，应优先采用
- 如果隐式行为、默认行为或更少的代码已经能稳定产生我们要的结果，并且符合当前版本推荐方向，应优先保留更少代码的方案，不为“显式而显式”增加约束。
- 只有在结果级验证证明隐式行为不稳定、与目标视觉不一致、或偏离新版本推荐用法时，才引入额外显式样式、额外兼容层或额外约束。
- 升级验证默认优先结果级测试：
  - 先保用户可见结果正确
  - 再用单文件/单组件门禁约束高价值模式
  - 不要用实现细节测试去反向绑死本可更简单的实现

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
- 对 `client:only="svelte"` island 中在 Swup 切页后仍必须稳定生效的 UI 行为，关键样式不要放在组件局部 `<style>` 中；应下沉到 `src/styles/main.css` 或其他全局样式入口。
- 这条规则尤其适用于 `dialog/modal/drawer/popover` 这类依赖 `dialog[open]`、`::backdrop`、动画类名、定位类名的交互；若关键样式只存在于组件局部作用域，Swup 路由切换后可能出现“弹层跑到左上角、动画丢失、backdrop 失效”这类回归。
- 组件局部 `<style>` 只适合不影响跨页交互稳定性的局部装饰；涉及切页后仍要复用的关键布局、定位、状态和过渡样式，默认走全局样式并补回归验证。
