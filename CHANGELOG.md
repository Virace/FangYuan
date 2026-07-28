# Changelog

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
