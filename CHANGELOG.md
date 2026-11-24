# Changelog

## 0.3.1 - 2026-11-24

- 站内切页时，液态光幕覆盖正文并配合回顶和顶图脉冲。开启减少动态效果时跳过光幕；动画持续掉帧时，后续切页改用淡入淡出。
- 首页分页使用首页索引标签，内置演示站提供第二页。修复滚到文章深处再切页时侧栏跳动、旧目录短暂可见，以及光幕盖住页脚的问题。
- 页面和块级公式使用原生滚动，传统桌面滚动条环境下显示可拖动的浮动滑块。修复硬刷新时原生滚动条短暂占位导致整页横移，以及深色导航栏入场时顶部出现横线的问题。

## 0.3.0 - 2026-11-23

- 新增可交互的光学顶图与背景。站点可以在 `siteConfig.banner.optics` 中指定透镜夹层和分光元件。
- 新增全局通知，统一评论与文章反馈，并支持调整通知位置和排列顺序。
- 保留导航栏首屏入场动画，修复刷新时动画重复播放、顶部露出空隙和导航文字横跳。
- 接入 FangYuanStudio 的文章预览与站点设置。Markdown 提示块支持自定义标题，GitHub 卡片保留自定义样式类。
- 文章和独立页面支持可选的 `contentId`。构建校验地址归属，按登记生成历史地址跳转和公开的 `content-index.json`。已有文章可以继续沿用原地址；使用 ID 的内容需与 `content-routes.yaml` 同步提交。
- 构建工具链升级到 Astro 7，Markdown 处理迁移到 Sätteri，GitHub 仓库卡片支持构建快照。

## 0.2.2 - 2026-10-11

### Fixes

- 修复 `link-card` 与 `link-grid` 中默认 GitHub 图标在暗色主题下对比度不足的问题；图标现在跟随站点主题，暗色显示白色，亮色显示深色。
- 默认 GitHub 图标复用仓库卡片的内置图标，不再依赖外部 favicon；显式设置的 `logo` 仍按原图展示。

## 0.2.1 - 2026-08-07

本次版本集中更新代码高亮、字体、数学公式、Markdown 解析与开发工具依赖，保持现有站点配置和内容合同不变。

### Highlights

- 将 Expressive Code 核心、折叠区块、行号插件与 Astro 集成统一更新到 0.44.1。
- 更新本地字体资源、KaTeX 与 Markdown-it，维持现有排版、公式和文章渲染能力。
- 更新 Biome、Playwright、axe Playwright 与 Svelte Check，保持后续开发和回归工具链同步。
- 补充多模式构建产物测试矩阵，覆盖内置站点、外部站点和错误输入场景。

### Notes

- 本版本不新增或修改 `site.config.yaml`、Frontmatter、QingYan 或部署合同。
- 本仓库继续保留 `private: true`，仅发布 GitHub 源码与主题版本，不发布 npm 包。

## 0.2.0 - 2026-07-28

本次版本补齐 QingYan 最新公开评论配置，并收口近期评论交互、可访问性与依赖维护改动。

### Highlights

- 对接 QingYan 的“回复默认提醒”公开配置：评论表单会按后端返回值初始化勾选状态，同时继续显式提交用户最终选择。
- 对齐 QingYan 返回的评论者名称、邮箱、网址和正文长度限制，并保留旧版后端的兼容回退。
- 修复评论投票确认浮层的定位与层级，避免弹层被其他页面元素遮挡。
- 补充打赏二维码占位图的可访问性标题。
- 更新 Astro、Svelte、Tailwind CSS、Sharp 等补丁依赖，并适配 Astro Markdown 处理器。

### Notes

- “回复默认提醒”仍由 QingYan 后台控制；后端未提供新字段时，前端保持默认不勾选。
- 本仓库继续保留 `private: true`，本次版本仅发布 GitHub 源码与主题版本，不发布 npm 包。

## 0.1.0 - 2026-06-11

首个公开版本，标记 FangYuan 从 Fuwari 二次开发分支收口为独立维护的 Astro 个人站点主题。

### Highlights

- 重新整理默认站点身份、中文演示内容、关于页、导航、页脚与默认文案。
- 引入外部 `site/` 输入层，支持把主题源码、站点配置、文章内容和站点资源分开维护。
- 扩展 `site.config.yaml`，集中管理站点身份、部署 URL、固定链接、导航、资料卡、页脚、评论、页面反馈和 QingYan 集成配置。
- 支持文章和页面的混合固定链接、归档排序、置顶文章、内容页目录、RSS、sitemap 和 Pagefind 搜索。
- 增强 Markdown 能力，包括提示块、折叠块、行内高亮、Bilibili 视频、链接卡片、链接网格和 Expressive Code 代码块。
- 接入 QingYan 评论、页面统计、点赞和打赏反馈区；未配置后端时前端会隐藏不可用区块。
- 收口图片资源语义，支持文章相对图片、外部站点 `assets/...` 资源、主题内置资源和远程图片。
- 提供 `init-site`、`update-site`、WordPress WXR 审计/转换和 QingYan 联调辅助脚本。
- 升级到 Astro 6、Svelte 5、Tailwind CSS 4，并补充构建、类型、Svelte、Biome、Node 和 Playwright 回归入口。

### Notes

- 本仓库保留 `private: true`，用于避免误发布到 npm；当前 release 面向 GitHub 源码和主题使用者。
- 项目基于 [saicaca/fuwari](https://github.com/saicaca/fuwari) 二次开发，但已经作为 FangYuan 独立主题维护。
- 感谢 Fuwari 原作者和社区提供的主题基础，FangYuan 的早期结构与视觉气质受益于这一上游项目。
