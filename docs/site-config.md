# `site.config.yaml`

## 作用

`site.config.yaml` 是 FangYuan 外部站点输入层的配置入口，用来覆盖仓库内 `src/default-config.ts` 的默认配置。

这份文件不会替代内部默认值，而是按分区做合并：

- 没写的字段继续沿用内部默认值。
- 顶层对象和多数嵌套对象按字段合并。
- 数组字段通常不会逐项合并，而是你填写什么就整体使用什么。
- `navBarConfig.links` 比较特殊：当你显式提供 `links` 时，会以你的列表为主，但保留语义入口 `About` 如果缺失会被自动补回。

和部署环境直接相关的公开站点参数也放在这里统一维护：

- `siteConfig.site`：真实站点域名，只允许 origin，不带路径
- `siteConfig.base`：部署子路径前缀，例如 `/blog/`

这两项和 `permalink` 一样都会影响最终公开 URL，但职责不同：

- `site` / `base` 负责“站点部署环境”
- `permalink.*` 负责“内容公开路径规则”

`trailingSlash` 继续留在 `permalink` 内，不单独抽成另一套 deployment 配置，避免和固定连接规则交叉后形成更多冲突组合。

## 位置与加载

- 默认位置：`site/site.config.yaml`
- 自定义外部站点根目录时：`<siteRoot>/site.config.yaml`

加载行为由运行环境控制：

- `FANGYUAN_SITE_MODE=auto`
  说明：默认模式。
  行为：如果外部站点根目录下存在 `content/`，就优先使用外部内容；如果同时存在 `site.config.yaml`，也会启用外部配置。

- `FANGYUAN_SITE_MODE=internal`
  说明：强制只使用仓库内置内容和默认配置。
  行为：即使你本地有 `site/` 目录，也不会启用外部内容和外部配置。

- `FANGYUAN_SITE_MODE=external`
  说明：强制使用外部站点输入层。
  行为：要求外部站点根目录存在、`content/` 非空、`site.config.yaml` 存在，否则会直接报错。

- `FANGYUAN_SITE_ROOT=<path>`
  说明：把外部站点根目录从默认 `site/` 改成其他路径。
  行为：`auto` / `external` 模式都会按这个路径寻找 `content/` 和 `site.config.yaml`。

## 严格模式与冲突规则

- 未知字段会被直接拒绝，不能靠“多写几个字段试试”。
- `navBarConfig.links` 里的每一项必须二选一：
  规则：`url` 和 `ref` 只能出现一个，不能同时出现，也不能同时缺失。
- `ref` 链接不能再写 `external`。
- 导航项的稳定标识取 `id`，没有 `id` 时退回 `name`。最终标识必须唯一，重复会报错。
- `pageMetricsConfig.qingyan`、`pageFeedbackConfig.qingyan`、`commentConfig.qingyan` 都是可选的，但是否真正启用前端功能，还要结合各自的 `enable` 字段一起看。
- `commentConfig.rootLimit` 和 `commentConfig.maxDepth` 会在运行时做归一化：
  规则：会向下取整，并限制最小值为 `1`。
- `pageFeedbackConfig.rewardOptions` 不和默认数组逐项合并：
  规则：一旦显式填写，就整体替换默认打赏项。
- 配置层图片路径不要假设任意外部根目录别名可直接被 Astro 识别：
  推荐：站点自有图片放在外部站点根目录 `assets/`，并写成 `assets/...`；远程图片写完整 `https://...`。
- `/xxx` 或 `public/xxx` 当前指向 FangYuan 主题仓库 `public/`，不要把外部站点自有图片放到外部根目录 `public/` 后假设会自动发布。

## 配置分区

### `siteConfig`

#### `siteConfig.title`

- 作用：站点主标题。
- 默认值：来自内部默认配置。

#### `siteConfig.subtitle`

- 作用：站点副标题。
- 默认值：来自内部默认配置。

#### `siteConfig.site`

- 作用：真实站点域名，用于 sitemap、RSS、canonical、社交分享和 JSON-LD 等依赖绝对 URL 的产物。
- 规则：
  - 这里只允许填写 origin，例如 `https://example.com`
  - 不要带路径、查询参数或 hash
  - 如果站点部署在子路径，请把路径部分写到 `siteConfig.base`
- 留空行为：
  - 构建仍可继续
  - `sitemap` 不会生成
  - `rss.xml` 会降级为空响应
  - 页面里依赖真实绝对 URL 的链接声明也会被跳过

#### `siteConfig.base`

- 作用：部署子路径前缀。
- 典型场景：
  - 根路径部署：`/`
  - 子路径部署：`/blog/`
- 归一化规则：
  - `blog`
  - `/blog`
  - `/blog/`
  最终都会被规范成 `/blog/`
- 注意：这里控制的是站点部署前缀，不负责内容 permalink 的路径语义。

#### `siteConfig.postsPerPage`

- 作用：归档或分页列表的每页文章数。
- 规则：`null` 表示继续使用内置默认分页大小；正整数表示显式覆盖。

#### `siteConfig.showPinnedInArchiveTimeline`

- 作用：控制归档页顶部已经单独展示的置顶文章，是否仍保留在年份时间线里。
- `true`：顶部展示后，时间线里仍保留这些置顶文章。
- `false`：顶部展示后，时间线里不再重复出现。

#### `siteConfig.lang`

- 作用：站点语言代码。
- 支持值：`en`、`zh_CN`、`zh_TW`、`ja`、`ko`、`es`、`th`、`vi`、`tr`、`id`

#### `siteConfig.themeColor.hue`

- 作用：主题色 Hue。
- 规则：范围只能是 `0` 到 `360`。

#### `siteConfig.themeColor.fixed`

- 作用：是否锁定前台主题色选择器。
- `true`：访客不能自行切换主色。
- `false`：前台保留主题色切换能力。

#### `siteConfig.banner.enable`

- 作用：是否启用站点横幅。

#### `siteConfig.banner.src`

- 作用：横幅图片路径。
- 路径规则：
  - `assets/images/banner.webp`：推荐。指向外部站点根目录 `assets/images/banner.webp`，会作为本地图片输入参与构建。
  - `https://cdn.example.com/banner.webp`：可用。远程图片会原样透传，不会被本地构建打包或校验。
  - `/favicon/icon.png` 或 `public/favicon/icon.png`：指向 FangYuan 主题仓库 `public/`，不是外部站点根目录 `public/`。
- 建议：站点自有横幅优先放在外部站点根目录 `assets/`，不要依赖临时构建产物路径。

#### `siteConfig.banner.position`

- 作用：横幅图片的垂直对齐方式。
- 支持值：`top`、`center`、`bottom`

#### `siteConfig.banner.credit.enable`

- 作用：是否显示横幅署名。

#### `siteConfig.banner.credit.text`

- 作用：横幅署名文案。

#### `siteConfig.banner.credit.url`

- 作用：横幅署名链接。
- 规则：可为空字符串，表示只显示文字不跳转。

#### `siteConfig.toc.enable`

- 作用：是否在文章页和支持目录的内容页显示目录。

#### `siteConfig.toc.depth`

- 作用：目录最大层级。
- 支持值：`1`、`2`、`3`

#### `siteConfig.favicon`

- 作用：自定义 favicon 列表。
- 规则：留空数组表示继续使用内置默认 favicon。

#### `siteConfig.favicon[].src`

- 作用：图标路径。
- 建议：当前通常写主题 `public/` 下的稳定静态路径，例如 `/favicon/icon.png`。
- 注意：这不是外部站点根目录 `public/`。如果需要让每个外部站点自带 favicon，先确认对应发布链路已经支持 external public assets。

#### `siteConfig.favicon[].theme`

- 作用：区分亮色或暗色图标。
- 支持值：`light`、`dark`

#### `siteConfig.favicon[].sizes`

- 作用：区分不同尺寸图标。

#### `siteConfig.permalink.postsPattern`

- 作用：文章公开链接模板。
- 常见用法：
  - `/%path%/%slug%`
  - `/articles/%slug%.html`
  - `/%year%/%monthnum%/%day%/%postname%/`

#### `siteConfig.permalink.pagesPattern`

- 作用：`spec` 类页面公开链接模板，例如 About 页面。
- 常见用法：`/%slug%`

#### `siteConfig.permalink.trailingSlash`

- 作用：公开 URL 的末尾斜杠策略。
- `auto`：普通路径补末尾斜杠，`.html` 路径保持原样。
- `always`：所有公开路径都补末尾斜杠。
- `never`：所有公开路径都移除末尾斜杠。
- 冲突提醒：这个策略只控制公开 URL 语义，不是让你动态切换 Astro 的构建输出模式。

#### `siteConfig.permalink.postPatternRules`

- 作用：按文章内部路径局部覆写 `postsPattern`。
- 用途：例如只让 `wp/**` 目录走 WordPress 风格日期路径。
- 规则：它只影响文章，不影响 `pagesPattern`。

#### `siteConfig.permalink.postPatternRules[].match`

- 作用：匹配文章在 `posts/` 根目录下的相对路径模式。

#### `siteConfig.permalink.postPatternRules[].pattern`

- 作用：命中该规则后使用的公开链接模板。
- 规则：必须和全局 materialization family 保持自洽，否则可能在构建阶段报错。

#### `siteConfig.permalink.aliasValidation`

- 作用：控制 `alias` 或 slug 中带 `.` 时的处理方式。
- `error`：直接报错，要求手工修正。
- `normalize`：自动规范化为更安全的 slug。

#### `siteConfig.permalink.updatedDateMode`

- 作用：控制文章更新时间来源。
- `manual`：只认 frontmatter 的 `updated`
- `git`：读取 Git 最后提交时间
- `filesystem`：读取文件最后修改时间
- `none`：不生成更新时间

#### `siteConfig.permalink.updatedDateFallback`

- 作用：当 `updatedDateMode` 拿不到值时的回退策略。
- `none`：保持为空
- `filesystem`：回退到文件最后修改时间
- 冲突提醒：只有上游模式无法提供时间时，fallback 才会生效。

#### `siteConfig.postSort.key`

- 作用：同一置顶层内的文章排序字段。
- 支持值：`title`、`published`、`updated`、`alias`、`filename`

#### `siteConfig.postSort.order`

- 作用：同一置顶层内的排序方向。
- 支持值：`asc`、`desc`
- 冲突提醒：站点整体排序仍会先考虑 `sticky` 层级，再应用这里的字段和方向。

### `navBarI18n`

- 作用：导航文案映射表。
- 用法：键名通常与 `navBarConfig.links` 里的 `name` 或 `id` 对应。
- 合并规则：外部配置只会覆盖同名键，不会清空未写的默认项。

### `navBarConfig`

#### `navBarConfig.links`

- 作用：导航链接列表。
- 合并规则：当你提供整组 `links` 时，会以你的列表为主，但保留语义入口 `About` 缺失时会自动补回。

#### `navBarConfig.links[].id`

- 作用：导航项稳定标识。
- 规则：可选；为空时退回 `name`。

#### `navBarConfig.links[].name`

- 作用：导航项名称或 i18n 键。
- 规则：必填，不能为空字符串。

#### `navBarConfig.links[].url`

- 作用：直接指定导航 URL。
- 规则：和 `ref` 只能二选一。

#### `navBarConfig.links[].ref`

- 作用：引用内容集合里的页面或文章，由系统解析公开路径。
- 规则：和 `url` 只能二选一。

#### `navBarConfig.links[].ref.collection`

- 作用：指定引用集合。
- 支持值：`spec`、`posts`

#### `navBarConfig.links[].ref.id`

- 作用：指定被引用内容的 `entry.id`。

#### `navBarConfig.links[].external`

- 作用：标记该 URL 是否为外链。
- 规则：只允许和 `url` 一起使用，不能和 `ref` 同时出现。

### `profileConfig`

#### `profileConfig.avatar`

- 作用：头像图片路径。
- 路径规则：和 `siteConfig.banner.src` 一致。
- 安全本地写法：`assets/images/avatar.png`。
- 注意：FangYuan 当前没有独立 logo 配置项；这里是侧栏作者头像，不是 favicon。

#### `profileConfig.name`

- 作用：作者显示名。

#### `profileConfig.bio`

- 作用：作者简介。

#### `profileConfig.links`

- 作用：个人链接列表。
- 合并规则：一旦显式填写，会整体替换默认链接数组。

#### `profileConfig.links[].name`

- 作用：链接名称。

#### `profileConfig.links[].url`

- 作用：链接地址。

#### `profileConfig.links[].icon`

- 作用：图标标识。
- 规则：需与当前站点使用的图标体系兼容。

### `footerConfig`

#### `footerConfig.customHtml`

- 作用：页脚自定义 HTML。
- 风险：直接插入原始 HTML，需自行保证内容可信。

#### `footerConfig.icp`

- 作用：中国大陆 ICP 备案号。
- 规则：`null` 表示不显示。

#### `footerConfig.policeRecord`

- 作用：公安备案号。
- 规则：`null` 表示不显示。

### `licenseConfig`

#### `licenseConfig.enable`

- 作用：是否展示站点许可证信息。

#### `licenseConfig.name`

- 作用：许可证名称。

#### `licenseConfig.url`

- 作用：许可证链接。

### `expressiveCodeConfig`

#### `expressiveCodeConfig.theme`

- 作用：代码块主题名。
- 冲突提醒：部分样式仍可能被 `astro.config.mjs` 里的集成层继续覆写，因此这里控制的是主题基线，不一定覆盖所有视觉细节。

### `commentConfig`

#### `commentConfig.enable`

- 作用：评论功能总开关。
- 规则：即使为 `true`，如果 `qingyan` 仍是 `null`，评论后端也不会真正启用。

#### `commentConfig.qingyan.siteKey`

- 作用：QingYan 站点标识。

#### `commentConfig.qingyan.apiBase`

- 作用：QingYan API 基础路径。
- 建议：同站代理场景优先使用 `/api`。

#### `commentConfig.rootLimit`

- 作用：一级评论每页数量。
- 规则：运行时会向下取整，最小值强制为 `1`；未填时使用默认 `5`。

#### `commentConfig.maxDepth`

- 作用：评论树最大展开深度。
- 规则：运行时会向下取整，最小值强制为 `1`；未填时使用默认 `3`。

### `pageMetricsConfig`

#### `pageMetricsConfig.enable`

- 作用：页面统计功能开关。

#### `pageMetricsConfig.qingyan.siteKey`

- 作用：页面统计使用的 QingYan 站点标识。

#### `pageMetricsConfig.qingyan.apiBase`

- 作用：页面统计使用的 QingYan API 基础路径。

- 冲突提醒：只有 `enable=true` 且 `qingyan` 非空时，页面统计才会真正启用。

### `pageFeedbackConfig`

#### `pageFeedbackConfig.enable`

- 作用：页面反馈面板开关。

#### `pageFeedbackConfig.qingyan.siteKey`

- 作用：页面反馈使用的 QingYan 站点标识。

#### `pageFeedbackConfig.qingyan.apiBase`

- 作用：页面反馈使用的 QingYan API 基础路径。

#### `pageFeedbackConfig.rewardOptions`

- 作用：打赏选项列表。
- 合并规则：一旦显式填写，会整体替换默认数组。
- 冲突提醒：即使 `qingyan` 为 `null`，只要 `enable=true` 且 `rewardOptions` 非空，仍然可以走纯打赏展示模式。

#### `pageFeedbackConfig.rewardOptions[].id`

- 作用：打赏项稳定标识。

#### `pageFeedbackConfig.rewardOptions[].name`

- 作用：打赏项名称。

#### `pageFeedbackConfig.rewardOptions[].image`

- 作用：打赏二维码图片路径。

#### `pageFeedbackConfig.rewardOptions[].alt`

- 作用：打赏二维码图片替代文本。

### `qingyanDevProxyTarget`

- 作用：开发期 FangYuan 访问本地 QingYan 服务时使用的代理目标。
- 规则：可写绝对 `http(s)` 地址，或设为 `null` 关闭。
- 适用场景：本地联调和开发辅助，不是正式站点对外公开配置。

## 推荐做法

- 先只写确实需要覆盖默认值的字段，不要把模板全部复制后机械改一遍。
- `commentConfig.qingyan`、`pageMetricsConfig.qingyan`、`pageFeedbackConfig.qingyan` 如果本质上指向同一个后端，推荐保持同一组参数，避免联调时行为不一致。
- 想做复杂 permalink 规则时，先确认公开 URL 语义，再决定 `postsPattern`、`pagesPattern` 和 `postPatternRules`，不要把 Astro 内部构建输出语义和公开路径语义混在一起。
