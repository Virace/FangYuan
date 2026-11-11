# FangYuan 项目开发规范

## 1. 适用范围与权威来源

本规范适用于仓库内的主题源码、构建脚本、测试、配置和项目文档。规则优先级为：当前任务的用户要求、目录内更具体的 `AGENTS.md`、根目录 `AGENTS.md`、本文件及其他项目文档、仓库真实代码与命令输出。

每轮修改代码、配置或测试前至少读取 `AGENTS.md` 和本文件；涉及产品范围、硬约束或模块边界时，再分别读取 `PRODUCT.md`、`PROJECT_CONSTRAINTS.md`、`PROJECT_DESIGN.md`。`package.json` 是可执行命令的事实源，文档与其不一致时先核实并同步修正。

## 2. 技术栈与真实命令

- 运行时：Node.js `>=22.23.4`，本地与 CI 推荐基线为 `.nvmrc` 中的 `26.13.0`。
- 包管理器：pnpm `12.18.0`，由 `packageManager` 固定并提交 `pnpm-lock.yaml`；安装策略在 `pnpm-workspace.yaml` 中维护。
- 模块：ESM；`package.json` 使用 `"type": "module"`。
- 应用：Astro 7 静态站点，TypeScript 6 严格配置，交互 island 使用 Svelte 5，样式以 Tailwind CSS 4 和 `src/styles/` 为主。
- 工具：Astro Check、TypeScript、Svelte Check、Biome、Node.js test runner、Playwright。

### 安装与运行

| 用途 | 命令 |
| --- | --- |
| 可复现安装 | `pnpm install --frozen-lockfile` |
| 本地开发 | `pnpm dev` |
| 内部 demo 开发 | `pnpm dev:internal` |
| 外部站点开发 | `pnpm dev:external` |
| 生产构建 | `pnpm build` |
| 内部 / 外部构建 | `pnpm build:internal` / `pnpm build:external` |

### 静态检查与格式化

| 用途 | 命令 |
| --- | --- |
| Astro 页面、路由和内容集成 | `pnpm check` |
| TypeScript 类型与声明隔离 | `pnpm type-check` |
| Svelte 组件 | `pnpm check:svelte` |
| `src/` Biome 检查 | `pnpm lint` |
| `src/` Biome 安全修复与格式化 | `pnpm format` |

`pnpm format` 和 `pnpm lint` 只覆盖 `src/`；根配置、`scripts/` 和 `tests/` 不因一次局部任务被机械重排。

Biome 解析 Markdown frontmatter，但保留代码块、frontmatter 和 HTML 示例的原文，避免格式化改变演示行号或内容语义。

### 测试入口

| 层级 | 命令 | 用途 |
| --- | --- | --- |
| 快速默认测试 | `pnpm test` | 委托给 `test:node`，验证项目自有逻辑、脚本和边界适配 |
| Node 测试明细入口 | `pnpm test:node` | 直接运行 `tests/*.test.mjs` |
| 构建集成 | `pnpm test:build` | 串行准备隔离的真实 Astro 构建产物矩阵 |
| 核心浏览器回归 | `pnpm test:e2e` | 构建内部 demo 后运行关键导航、交互与可访问性流程 |
| 完整系统测试 | `pnpm test:system` | 依次运行快速测试、构建矩阵和核心浏览器回归 |
| 视觉回归 | `pnpm test:e2e:visual` | 独立运行截图基线，不属于默认系统测试 |

## 3. 代码组织

- `src/pages/` 负责 Astro 路由入口与页面拼装，不复制内容、固定链接或配置合并规则。
- `src/layouts/` 负责页面骨架和跨页生命周期。
- `src/components/` 放可复用 UI；静态结构优先 Astro，需要浏览器状态的局部交互使用 Svelte island。
- `src/utils/` 承载稳定的内容、URL、站点输入、评论和浏览器工具逻辑；纯逻辑优先从页面中抽离后直接测试输入输出。
- `src/config.ts`、`src/default-config.ts`、`src/types/config.ts` 和 `src/content.config.ts` 是配置、默认值、类型与内容 schema 的中心点。
- `src/content/` 是仓库内 demo 内容基线；外部真实站点由 `FANGYUAN_SITE_ROOT` 指向，默认本地目录 `site/` 不进入版本控制。
- `scripts/` 放站点初始化、迁移、构建包装、Cloudflare demo 和 QingYan 本地联调工具。
- `tests/` 放 Node 行为测试与构建矩阵，`tests/e2e/` 放 Playwright 浏览器测试。

只有一个能力拥有多个相关模块、稳定公开面或独立测试边界时才新增子目录；不为单文件制造 `service`、`helper` 或其他形式分层。页面依赖中心配置与工具，工具不得反向依赖具体页面组件。

## 4. 命名与文档

### 文件与公开结构

- Astro / Svelte 组件使用 `PascalCase`；工具、常量和插件文件使用描述性 `kebab-case`。
- TypeScript 类型、接口和组件使用 `PascalCase`；函数、变量和对象字段使用 `camelCase`。
- 真正跨作用域且不可变的模块常量使用 `UPPER_SNAKE_CASE`；局部只读值仍使用语义化 `camelCase`。
- 环境变量使用 `FANGYUAN_*`、`PUBLIC_FANGYUAN_*` 或已有外部系统前缀的 `UPPER_SNAKE_CASE`。

### 变量与函数

- 标识符使用英文并表达角色或单位，例如 `postCount`、`firstVisiblePage`、`siteSourceContext`；除数学坐标、极小循环索引或上游约定外，不使用 `l`、`r`、`i`、`tmp`、`data`、`map` 一类无法独立说明含义的名字。
- 集合使用复数名；映射表写明键和值的语义，例如 `translationByLocale`。
- 布尔值优先使用 `is`、`has`、`can`、`should`；现有外部配置契约中的 `enable` 字段保持兼容，不为内部风格破坏 schema。
- 纯读取使用 `get`，带解析或归一化语义使用 `resolve`、`parse`、`normalize`，合并使用 `merge`，事件回调使用 `handle` 或明确动作名。
- 允许稳定领域缩写：`API`、`URL`、`HTML`、`CSS`、`DOM`、`RSS`、`TOC`、`WXR`、`ID`、`QR`；其他缩写应在当前模块中清楚且无歧义。
- 框架和外部契约名称不得为内部风格而改写，例如 Astro 路由导出的 `GET`、locale 标识 `zh_CN`、frontmatter 字段和 QingYan 请求字段。

公开类型、配置 schema、环境变量和非显然不变量需要说明契约或原因。注释不逐行复述实现、不记录修改过程、不保留失效说明；能由准确命名表达的内容不再写注释。

## 5. 错误与日志

- 构建期配置、内容、资源和固定链接错误应尽早失败，并提供用户可执行的消息；不得静默回退到可能发布错误内容的状态。
- 面向浏览器用户的错误只暴露操作结果和恢复路径，不显示本机路径、内部字段路径、堆栈、令牌或原始后端错误。
- QingYan 等外部服务未配置或运行时关闭时，相关 UI 按现有能力开关隐藏；网络失败应保留页面主体可用性。
- 脚本进程以非零退出码表示失败，诊断可写入标准错误；稳定自动化若依赖错误分类，应使用可测试的返回值或错误类型，而不是解析随意文案。
- 日志和测试产物不得记录密钥、Cookie、授权头、个人联系信息或真实站点私有内容。开发令牌只能使用明确的本地假值。

当前项目没有跨模块统一机器错误码体系；只有出现真实消费者契约时才建立，不预先制造编号。

## 6. 变更门禁

修改过程中实时纠正本轮新增或直接涉及的命名、导入、路由和包边界问题，不借局部任务扩大为全仓库整理。代码、脚本、命令或外部接口发生变化时，同步检索并更新直接相关文档。

### 按改动范围选择检查

- `.astro`、路由、页面拼装、内容挂载或构建集成：`pnpm check`。
- `.svelte`：`pnpm check:svelte`。
- `.ts`、类型、配置导出或浏览器工具：`pnpm type-check`。
- `src/` 代码完成上述检查后运行 `pnpm lint`；仅在 Biome 报可修复问题时运行 `pnpm format`，再复跑 `pnpm lint`。
- 项目自有逻辑、脚本或配置行为：运行相关 Node 测试，交付前至少运行 `pnpm test`。
- 构建路径、内容输入、资源、Astro 配置或产物行为：运行 `pnpm test:build`。
- 跨页导航、Svelte island、可访问性或浏览器生命周期：运行相关 Playwright 文件；完整交付运行 `pnpm test:e2e`。
- 系统级初始化、发布候选或跨多个层级的改动：运行 `pnpm test:system`，并叠加命中的静态检查。

### 测试策略

测试目标是防止内容或配置被错误解析、构建产物路径漂移、关键页面行为在导航后失效，以及外部能力开关破坏默认站点体验。

| 风险或稳定契约 | 可观察行为 | 最低有效证据 | 环境与位置 | 执行时机 |
| --- | --- | --- | --- | --- |
| 配置、固定链接、排序、迁移或脚本规则回归 | 给定输入得到稳定输出或明确失败 | Node 行为测试 | `tests/*.test.mjs`，无实时网络 | 修改对应规则时；默认快速门禁 |
| 外部 / 内部内容源、资源与 Astro 产物不一致 | 隔离构建成功产出正确 HTML / XML / 资源，非法输入明确失败 | 真实构建集成 | `tests/site-build.integration.mjs`，串行准备 Astro 产物 | 修改构建、内容输入或资源管线时 |
| Swup 导航、island 交互或可访问性退化 | 浏览器中的标题、焦点、面板、主题、TOC 和 ARIA 行为正确 | Playwright E2E | `tests/e2e/`，内部 demo 构建与 Chromium | 修改浏览器交互或完整交付时 |
| 视觉布局或字体产生非语义变化 | 截图差异经人工判断符合设计 | 独立视觉快照 + 人工验收 | `test:e2e:visual`，固定 Chromium 环境 | 明确视觉任务或发布前抽查 |
| QingYan / Cloudflare 真实部署差异 | 预发布环境能完成真实网络交互且不泄露内部错误 | 本地 mock/适配测试 + 预发布人工验收 | 本地测试不替代生产服务 | 修改外部契约或部署配置时 |

明确 Bug、解析器、排序规则、状态转换和输入校验优先先写失败的行为测试。探索性 UI、未稳定的第三方行为或新纵向链路先定义验收场景，稳定后只自动化长期契约。

不得新增读取 `src/` 源码后用字符串或正则断言实现细节的测试。纯文案、注释、格式、私有重命名、文件移动和装饰性视觉调整通常使用目标 diff、静态检查或人工验收，不为测试数量新增自动化。

视觉品质、真实移动设备、生产 CDN / 缓存、真实 QingYan 服务和部署平台差异不能由默认本地测试完全证明，发布前按变更风险人工验收。系统测试不包含视觉快照，也不连接实时外部服务。

## 7. 项目例外

- `develop` 是日常集成分支，`main` 只承载正式版；是否使用预发布分支按当轮发布决定。普通开发从 `develop` 建子分支。
- `site/` 是被忽略的本地外部数据源，不是仓库 demo 基线；默认可复用行为写入 `src/default-config.ts`。
- `public/` 不作为新增主题资源的默认入口；主题固定资源放 `src/theme-assets/`，可覆盖 demo 资源放 `src/assets/`，外部站点资源放 `<siteRoot>/assets/`。
- `client:only="svelte"` island 在 Swup 切页后仍依赖的关键定位、状态和过渡样式放入全局样式，不只放组件局部 `<style>`。
- Biome 仅负责 `src/` 的日常格式与 lint；脚本、测试和根配置维持其现有风格，除非专项任务明确调整工具覆盖范围。
- README 是阶段收口文档；语义未稳定的开发中间态不提前写入。
