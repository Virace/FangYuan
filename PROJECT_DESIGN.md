# FangYuan 项目设计

## 总体形态

FangYuan 是 Astro 静态站点主题。Astro 负责路由、内容加载、页面骨架和构建；Svelte 只承载需要浏览器状态的局部 island；Node.js 脚本负责站点初始化、内容迁移、构建包装和开发联调。

## 顶层目录与模块边界

- `src/pages/`：路由组合入口。把 route manifest、内容 entry 和分页结果交给布局或页面组件。
- `src/layouts/`：全局 HTML 骨架、导航生命周期、Swup 切页和跨页 UI 状态。
- `src/components/`：展示组件与 island；组件不拥有内容源选择或固定链接规则。
- `src/config.ts`：合并默认配置、外部站点配置和公开部署覆盖。
- `src/content.config.ts`：声明 posts / spec collections 及 frontmatter schema。
- `src/styles/`：`main.css` 样式清单、`prose.css` 独立正文排版基线与 `modules/` 领域样式模块。
- `src/utils/content/`：内容排序、日期、分页、归档和 RSS 逻辑。
- `src/utils/permalink/` 与 `src/utils/content-routes.ts`：固定链接解析、物化方式和路由清单。
- `src/utils/content-route-history.ts`：纯身份、历史归属和输出冲突校验；`content-route-store.ts` 读取一致的源文件快照并准备登记变化。
- `src/utils/site-source/`：选择内部或外部站点源，加载配置、内容与资源，并处理开发监听。
- `src/utils/comments/`、`src/utils/qingyan/`、`src/utils/page-feedback/`：可选 QingYan 能力的客户端契约、状态与适配。
- `scripts/site/`：初始化、升级、迁移和构建包装。
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

正文使用 Sätteri 原生 MDAST / HAST 插件；阅读统计、摘要、指令、section、公式与标题链接在 `src/plugins/` 中组合，Expressive Code 使用其官方 Sätteri 接入。RSS 继续由 `src/utils/content/rss.ts` 的 markdown-it 管线独立渲染。

GitHub 卡片先由内容插件生成基础 HTML，再在 Astro 本轮 HTML 输出完成后获取公开元数据并增强产物，快照不进入文章内容缓存。浏览器模块负责有限超时的后台刷新与 Swup 页面生命周期；构建令牌仅在构建模块中读取。

`contentRoutesIntegration` 在正式构建核对文章与 `content-routes.yaml`，并在结束时从同一已校验快照生成全部历史跳转与 `content-index.json`；构建期间输入变化则失败。Studio 的 analyze/prepare 只返回拟写数据，写入与恢复由独立编辑器协调，保存锁存在时主题拒绝读取。数据格式、同步与恢复入口见 `docs/content-routes.md`。

## 浏览器交互流

静态 HTML 启动后，Svelte island 负责搜索、归档筛选、全局通知、评论、文章反馈与阅读统计；顶栏明暗切换、主题色滑块、导航与回顶控件由纯 Astro 承载。Swup 更新 `main` 与 TOC 容器；跨页仍必须有效的 dialog、drawer、backdrop、定位和过渡样式由全局样式提供。QingYan 能力由公开配置和 bootstrap 响应启用，关闭时不挂载对应交互面。

页面和块级公式使用原生滚动。在使用传统滚动条的桌面环境中，主题按实际滚动位置显示浮动滑块，并将拖动映射到原生滚动区域。切页时只为新正文重新绑定公式滑块。

常规正向导航由 `src/utils/browser/optical-transition/` 协调。Swup 取页与入幕并行，主栏完全遮蔽后才缩短滚动距离，到顶后允许置换正文。独立于替换容器的固定画布逐帧跟踪主栏；默认的 `liquid-rain` 渲染器通过 `OpticalTransitionRenderer` 接收阶段、几何、滚速与目的页标题。此前曾在光幕中央绘制目的页标题印记与底线，但因主栏与整站中心存在水平偏置、且主页/归档/文章容器高度不一导致纵向重心不稳，当前版本暂时关闭光幕文字印记，仅保留光学流体与光带转场（相关契约仍保留在 `TransitionFrameState["imprint"]`）。历史导航、锚点和减少动态效果沿用各自的滚动入口。

桌面端顶图伸缩时，侧栏的吸顶偏移与内容区位移同步。光幕按侧栏在视口中的实际位置计算回顶起点，使已吸顶的分类和标签保持原位，直到资料卡重新滚入视口。首页与内页使用淡入淡出切换时，侧栏在完全透明时换位。

支持 OffscreenCanvas 且 Worker 绘图已就绪时，`liquid-rain` 将可见画布交给 Worker。调度器传递导航时间原点、阶段起点和几何变化，Worker 用自己的动画帧推进入幕和退场。主线程保留 Canvas 2D 回退，并负责 Swup 放行、滚动和驻留合成层。两种绘图路径共用水面与雨滴的计算，按色相复用各自的明暗纹理。

入幕与退场阶段在 Canvas 上绘制柔光水面、雨滴和斜光束，底色与三片光晕先在 256 × 192 的离屏画布合成。驻留时复用相同的渐变与光束纹理，两片光晕按各自的横纵周期移动，每颗雨滴按入幕时的位置和相位微颤。合成动画启动后，调度器留出渲染机会再放行 Swup。正文的入场标记在离屏文档中设置，回顶也在替换之前完成。视口大小改变时重新对齐光幕。桌面顶图在首页和内页之间伸缩时保留当前透镜姿态，停稳后再处理最新指针位置。脉冲复用白光渐变和光谱纹理，缓存投影几何并按前后帧光带脏矩形局部清屏与裁切合成，随当前透镜投影对齐。

调度器在前台完整播放一次后开始采样。最近三次有效导航里，有两次在入幕、回顶或退场期间各出现至少三个超过 45ms 的帧间隔，后续常规导航使用 Swup 淡入淡出，在正文置换时回顶并切换顶图尺寸。Canvas 2D 不可用时，本次页面会话持续使用淡入淡出。材质准备异常只影响当前导航，下一次重新尝试光幕。驻留等待期间暂停计数，切到后台和中断的导航整次跳过。整页刷新后重新采样。

## 错误模型

全局通知使用 `src/utils/browser/notifications.ts` 的共享内存队列与 `GlobalNotices.svelte` 单宿主，位于 Swup 替换容器之外。业务捕获页面代次后发布纯文本结果；调度管理优先级与可读时间，组件报告真实尺寸，定位包装和卡片分别承载堆叠与出入场动画。样式、调用和公告复用边界见 `docs/notifications.md`。

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
- 静态输出中的永久链接、RSS、sitemap、Pagefind 索引和资源路径。

共享契约发生语义变化时，先更新 schema、迁移策略和行为测试，再调整消费者；不得只在页面层做局部兼容。
