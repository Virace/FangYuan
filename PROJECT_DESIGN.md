# FangYuan 项目设计

## 总体形态

FangYuan 是 Astro 静态站点主题。Astro 负责路由、内容加载、页面骨架和构建；Svelte 只承载需要浏览器状态的局部 island；Node.js 脚本负责站点初始化、内容迁移、构建包装和开发联调。

## 顶层目录与模块边界

- `src/pages/`：路由组合入口。把 route manifest、内容 entry 和分页结果交给布局或页面组件。
- `src/layouts/`：全局 HTML 骨架、导航生命周期、Swup 切页和跨页 UI 状态。
- `src/components/`：展示组件与 island；组件不拥有内容源选择或固定链接规则。
- `src/config.ts`：合并默认配置、外部站点配置和公开部署覆盖。
- `src/content.config.ts`：声明 posts / spec collections 及 frontmatter schema。
- `src/utils/content/`：内容排序、日期、分页、归档和 RSS 逻辑。
- `src/utils/permalink/` 与 `src/utils/content-routes.ts`：固定链接解析、物化方式和路由清单。
- `src/utils/site-source/`：选择内部或外部站点源，加载配置、内容与资源，并处理开发监听。
- `src/utils/comments/`、`src/utils/qingyan/`、`src/utils/page-feedback/`：可选 QingYan 能力的客户端契约、状态与适配。
- `scripts/site/`：初始化、升级、迁移和构建包装。
- `scripts/wp-migration/`：WordPress WXR 审计与转换。
- `tests/`：Node 行为测试和真实 Astro 构建产物矩阵。
- `tests/e2e/`：核心浏览器流程、可访问性和视觉快照。

依赖方向从路由和组件指向中心配置、类型与工具模块。底层工具可以依赖标准库、稳定第三方库和相邻纯模块，但不反向导入页面或具体 UI 组件。

## 入口与组合

- `astro.config.mjs` 组合 Astro integrations、Markdown 插件、字体、图片、开发代理、站点源和构建路径。
- `src/config.ts` 在 SSR 构建阶段读取外部配置，并以 `default-config` 为基线合并公开环境覆盖。
- `src/content.config.ts` 根据站点源建立 content collections。
- `src/pages/` 使用 route manifest 和 URL helper 生成首页、分页、文章、类页面、归档及 XML / text 路由。
- `scripts/site/build-site.mjs` 是 `pnpm build*` 的统一构建入口，负责解析输出路径并调用 Astro。

## 核心数据流

```text
default-config + public environment + external site.config.yaml
                              |
                              v
                       merged config
                              |
internal src/content or FANGYUAN_SITE_ROOT/content
                              |
                              v
             content loader + frontmatter schema
                              |
                              v
          route manifest + sorting + URL resolution
                              |
                              v
                 Astro pages and components
                              |
                              v
                  dist HTML/XML/assets
```

外部资源先由站点源和图片解析层确定语义，再交给 Astro / Vite 资源管线；页面组件不直接推断文件系统位置。

## 浏览器交互流

静态 HTML 启动后，Svelte island 负责搜索、主题、评论、反馈和局部控制。Swup 更新 `main` 与 TOC 容器；跨页仍必须有效的 dialog、drawer、backdrop、定位和过渡样式由全局样式提供。QingYan 能力由公开配置和 bootstrap 响应启用，关闭时不挂载对应交互面。

## 错误模型

- 配置、内容、资源和固定链接不合法：构建或脚本明确失败，测试验证失败结果与诊断类别。
- 外部可选服务不可用：保持静态内容和无关交互可用，向用户显示有限且可恢复的状态，不透传内部异常。
- 浏览器本地状态不可用或不存在：使用默认主题、默认配置或空状态，不影响主要内容。
- 脚本输入错误：返回非零退出码；交互式初始化在无 TTY 时明确拒绝。

项目当前没有统一跨模块错误码；只有当脚本、外部 API 或其他消费者需要稳定机器判定时，在对应边界建立错误类型或代码。

## 重要外部契约

- `site/site.config.yaml` 结构与 `scripts/site/template.config.yaml` 模板。
- posts / spec frontmatter schema。
- `FANGYUAN_SITE_ROOT`、`FANGYUAN_SITE_MODE`、`FANGYUAN_SITE`、`FANGYUAN_BASE` 及已声明的公开环境变量。
- QingYan bootstrap、评论、反馈和统计客户端契约。
- WordPress WXR 输入与转换产物。
- 静态输出中的永久链接、RSS、sitemap、Pagefind 索引和资源路径。

共享契约发生语义变化时，先更新 schema、迁移策略和行为测试，再调整消费者；不得只在页面层做局部兼容。
