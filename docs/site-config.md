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

- `fangyuanConfigVersion` 是 FangYuan migration 元数据，位于 YAML 顶层；缺失时视为旧版本配置，由 `update-site` 负责补齐。
- 未知字段会被直接拒绝，不能靠“多写几个字段试试”。
- `navBarConfig.links` 里的每一项必须二选一：
  规则：`url` 和 `ref` 只能出现一个，不能同时出现，也不能同时缺失。
- `ref` 链接不能再写 `external`。
- 导航项的稳定标识取 `id`，没有 `id` 时退回 `name`。最终标识必须唯一，重复会报错。
- `qingyanConfig` 是评论、页面统计和点赞共用的 QingYan 后端连接配置；各功能是否真正启用，还要结合各自的 `enable` 字段一起看。
- `commentConfig.enable` 是评论功能的全局硬开关；内容页 frontmatter 的 `comment` 只能在它为 `true` 且 `qingyanConfig` 非空时生效。
- `pageFeedbackConfig` 的文章页区块采用“点赞或打赏”的或运算：
  规则：`pageFeedbackConfig.enable=true`，并且 `like` 或 `reward` 至少一项实际可显示时，才渲染“支持这篇文章”区块。
- `commentConfig.rootLimit` 和 `commentConfig.maxDepth` 会在运行时做归一化：
  规则：会向下取整，并限制最小值为 `1`。
- `pageFeedbackConfig.reward.options` 不和默认数组逐项合并：
  规则：一旦显式填写，就整体替换默认打赏项。
- 配置层图片路径不要假设任意外部根目录别名可直接被 Astro 识别：
  推荐：站点自有图片放在外部站点根目录 `<siteRoot>/assets/`，并写成 `assets/...`；远程图片写完整 `https://...`。
- `/xxx` 或 `public/xxx` 不是 external site 的资源目录；当前构建不会再把 FangYuan 仓库 `public/` 作为默认资源入口复制到 `dist`。外部站点自有图片不要放到外部根目录 `public/` 后假设会自动发布。

## 配置更新与备份

已有外部站点使用 `update-site` 检查和应用配置迁移：

```bash
node scripts/site/update-site.js --site-root ../my-site --dry-run
node scripts/site/update-site.js --site-root ../my-site --apply
```

默认不传 `--apply` 时就是 dry-run，不会写任何文件。`--apply` 写回任何已有文件前会先备份原文件；同一次更新的备份都放在同一个时间戳目录，目录内部保持原相对路径：

```text
<siteRoot>/.backup/YYYYMMDD-HHMMSS/frontmatter.json
<siteRoot>/.backup/YYYYMMDD-HHMMSS/.vscode/extensions.json
<siteRoot>/.backup/YYYYMMDD-HHMMSS/.vscode/settings.json
<siteRoot>/.backup/YYYYMMDD-HHMMSS/site.config.yaml
```

配置迁移使用 YAML 解析后再写回；注释和原始格式可能被规范化。正式应用前先看 dry-run 报告，并确认备份路径符合预期。

当旧字段和新字段同时存在且值不一致时，`update-site` 会要求人工处理。例如旧版 `pageFeedbackConfig.rewardOptions` 和新版 `pageFeedbackConfig.reward.options` 冲突时，不会自动猜测保留哪一份；旧版三处 QingYan 配置不一致时，也会要求先人工收敛成一组 `qingyanConfig`。

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

- 当 `optics.prism` 和 `optics.insert` 均留空时，填写 `src` 会显示整幅横图，可配置图片位置和署名。省略 `src` 或留空则显示内置交互透镜。
- 白色入射光穿过镜片后展开成渐变光谱。桌面移动鼠标可以改变观察角度，连续点击入射光会发出多道独立脉冲。手形光标张开时可抓住光束，绕镜片拖动会带动远端光带弯曲，松手后光路在选定方向收直。手机支持连续轻点，开启「减少动态效果」时显示静帧。
- 使用内置透镜时，顶图和正文留白共享细颗粒渐变。亮色从灰蓝过渡到页面底色，暗色从石墨色过渡到深色底。圆形光斑随桌面指针移动，经过顶图与正文的边界时在两种亮度之间渐变。滚动时光斑淡出，停稳后在指针当前位置恢复。指针位于页脚时光斑保持隐藏。触屏和「减少动态效果」模式使用静态背景。自定义图片横幅沿用纯色页面背景。
- 路径规则：
  - `assets/images/banner.svg`：推荐。指向外部站点根目录 `assets/images/banner.svg`，会作为本地图片输入参与构建。
  - `https://cdn.example.com/banner.webp`：可用。远程图片会原样透传，不会被本地构建打包或校验。
  - `/favicon/icon.png` 或 `public/favicon/icon.png`：不是 external site 的资源目录，也不会从 FangYuan 仓库 `public/` 复制旧占位资源。
- 建议：站点自有横幅优先放在外部站点根目录 `<siteRoot>/assets/`，不要依赖临时构建产物路径。`init-site` 默认会创建 `assets/images/banner.svg` 作为替换占位符。

#### `siteConfig.banner.optics.insert`

填写一张图片即可在交互透镜的玻璃下放入图案。图片居中等比缩放，透明区域透出镜片底色。图案随镜片倾斜，表面保留反光，点击入射光时脉冲会扫亮图案。建议用透明 SVG、PNG 或 WebP。

```yaml
siteConfig:
  banner:
    enable: true
    src: assets/images/banner.png
    optics:
      insert: assets/images/mark.svg
```

在透镜模式下，`insert` 优先于 `src`；清空夹层配置就会恢复横图。图片路径遵循上面的横幅资源规则。

#### `siteConfig.banner.optics.prism`

用一张透明底素材替换整个分光元件。将素材放进外部站点的 `assets/`，例如：

```yaml
siteConfig:
  banner:
    enable: true
    optics:
      prism: assets/images/prism.svg
```

例如，把下面的不对称三角形保存为站点的 `assets/images/prism.svg`。构建后拖动左侧白光，可以看到入射点和彩光出口分别沿三角形的两条边移动。

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="248" height="248" viewBox="-124 -124 248 248">
  <path d="M-96 -72L104 0 -64 90Z" fill="#7abfe2" fill-opacity=".7"/>
</svg>
```

图案会等比居中。画布中心是光轴，两束光分别从中心向相反方向找到主体边缘；拖动光束后会沿新方向重新取点。素材应让光轴落在连续的主体内，实体区域的不透明度至少为 50%。可以用 SVG 绘制切面和侧壁，或使用透明 PNG、WebP。构建时从本地素材取样，页面内只需按角度插值。

需要随观察角度露出不同侧边时，可以给各层使用同尺寸、同中心的透明画布：

```yaml
siteConfig:
  banner:
    enable: true
    optics:
      prism:
        face: assets/images/prism.svg
        spacer: assets/images/prism-spacer.svg
        guides:
          - [[8, 12], [26, 33], [35, 36], [81, 90]]
        back: assets/images/prism-back.svg
        crown: diamond
```

`face` 决定光束的入射和出射边缘。`back` 是后座，`spacer` 位于后座与正面之间，两者均可省略。`crown: diamond` 会在光轴上方嵌入带立体切面的菱形晶体，反光随视角移动。省略 `crown` 时仅显示配置的素材层。

可选的 `guides` 在中层绘制导光刻槽。每条槽用至少两个 `[x, y]` 点描述，由中心向外排列。坐标以 248 × 248 的棱镜画布中心为原点，向右、向下为正。光束转向槽尾时，刻槽逐渐亮起，亮线末端随视角接到正面的实际出口。

点击入射光时，同一道脉冲会扫过正面的玻璃，在中层透出青光，并在后座的切边留下稍晚的暖色反光。这些反应由主题按图层绘制，换图即可沿用。换成其他形状时，如果希望导光线贴合新图案的刻纹，需要在 `guides` 里标出新路径。轮廓取样只决定进出光的位置。

外部站点通过素材和 `site.config.yaml` 定义中央件。当前构建入口只挂载主题内的 `OpticalBanner.astro`，外部仓库里的 Astro 或 Svelte 组件没有对应的注册入口。

桌面和触屏都可以按住光束转向，开启「减少动态效果」时显示静帧。同时配置时，显示顺序为 `prism`、`insert`、`src`、主题默认透镜。移除 `prism` 即可恢复之前的样式。

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

#### `siteConfig.githubCard.descriptionLines`

- 作用：GitHub 仓库卡片简介最多显示的行数，超出部分显示省略号，原始简介保留完整。
- 支持值：整数 `1`、`2`、`3`，默认 `1`。
- 作用范围：所有页面中的 GitHub 仓库卡片，构建快照和浏览器刷新共用同一设置。

#### `siteConfig.notifications`

- 作用：控制全局通知队列的停靠位置与排列顺序，详见 `docs/notifications.md`。
- 支持字段：
  - `position`：`top`（默认，位于导航栏下方）或 `bottom`（位于视口底部及可见页脚上方）。
  - `newestOnTop`：`false`（默认，新消息追加在既有队列之后）或 `true`（新消息占据基准边缘槽位）。

#### `siteConfig.tags.showHash`

- 作用：是否在侧栏标签芯片前显示 `#` 符号。
- 默认值：`false`（默认不显示）。

#### `siteConfig.tags.showCount`

- 作用：是否在侧栏标签芯片右侧显示该标签关联的文章数量角标。
- 默认值：`false`（默认不显示）。

#### `siteConfig.logo`

- 作用：自定义导航栏左上角品牌 Logo；留空或设为 `null` 时继续使用 FangYuan 内置标志。
- 写法：
  - 单路径字符串：例如 `assets/images/logo.svg`（亮暗模式共用同一张图）。
  - 对象写法：支持 `light`（亮色模式图片）、`dark`（暗色模式图片）、`alt`（图片替代文本）与 `showTitle`（默认 `true`；设为 `false` 时隐藏导航栏站点标题文本）。

#### `siteConfig.favicon`

- 作用：自定义 favicon 列表。
- 规则：留空数组表示继续使用内置主蓝底矢量 SVG Favicon。

#### `siteConfig.favicon[].src`

- 作用：图标路径。
- 建议：写外部站点根目录 `<siteRoot>/assets/` 下的稳定路径，例如 `assets/favicon/icon.svg`。
- 注意：`init-site` 默认会创建 `assets/favicon/icon.svg` 作为替换占位符。留空数组则继续使用 FangYuan 内置默认 SVG Favicon。

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
- 置顶规则：文章 frontmatter 中显式写入 `sticky` 即视为置顶；`sticky: 0` 是最低置顶层，未写 `sticky` 才是不置顶。

#### `siteConfig.postSort.order`

- 作用：同一置顶层内的排序方向。
- 支持值：`asc`、`desc`
- 冲突提醒：站点整体排序仍会先考虑 `sticky` 层级，再应用这里的字段和方向。

#### `siteConfig.taxonomySort`

- 作用：控制侧栏及归档上下文中分类与标签的排序规则。
- `categories` 支持字段：
  - `key`：`name`（默认）或 `count`。
  - `order`：`asc`（默认）或 `desc`。
  - `uncategorizedPosition`：`sorted`（默认，“未分类”参与排序）或 `last`（固定排在末尾）。
- `tags` 支持字段：
  - `key`：`name`（默认）或 `count`。
  - `order`：`asc`（默认）或 `desc`。

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

- 作用：侧栏主图 / 作者头像路径。
- 路径规则：和 `siteConfig.banner.src` 一致。
- 安全本地写法：`assets/images/avatar.svg`（`init-site` 默认创建占位图；不配置外部覆盖时展示内置多彩光学版 `demo-avatar.svg`）。
- 注意：这里是侧栏作者展示图；导航栏品牌标志请配在 `siteConfig.logo`，站点标签页图标请配在 `siteConfig.favicon`。

#### `profileConfig.name`

- 作用：作者显示名。

#### `profileConfig.bio`

- 作用：作者简介。

#### `profileConfig.linkEffect`

- 作用：配置个人展示卡片底部社交按钮的悬停动效（仅在多于 1 个社交链接时生效，构建期固定）。
- 支持值：
  - `expand`（默认）：胶囊横向舒展，悬停或聚焦时展开平台名称，溢出自动折行并限制单按钮最大宽度。
  - `lift`：固定方圆尺寸，悬停或聚焦时双层图标垂直升降置换为高亮态。

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

### `qingyanConfig`

#### `qingyanConfig`

- 作用：QingYan 后端连接配置。
- 规则：评论、页面统计和点赞共用这一组后端参数；设为 `null` 或不填写时，所有依赖 QingYan 的前端能力都会关闭。

#### `qingyanConfig.siteKey`

- 作用：QingYan 站点标识。

#### `qingyanConfig.apiBase`

- 作用：QingYan API 基础路径。
- 默认：未填时前端运行时使用 `/api`。
- 建议：同站代理场景优先使用 `/api`；如果写完整 `http(s)` 地址，需要自行确认 CORS、Cookie 和验证码状态连续性。

### `commentConfig`

#### `commentConfig.enable`

- 作用：评论功能总开关。
- 规则：设为 `false` 时，所有内容页都不挂载评论区。
- 规则：即使为 `true`，如果 `qingyanConfig` 仍是 `null`，评论后端也不会真正启用。
- 内容页规则：`posts` 默认开启评论，可在文章 frontmatter 写 `comment: false` 关闭；`spec` 默认关闭评论，可写 `comment: true` 开启。首页、归档、标签、分类、分页、404 等内置页面不参与这个 frontmatter 语义。

#### `commentConfig.rootLimit`

- 作用：一级评论每页数量。
- 规则：运行时会向下取整，最小值强制为 `1`；未填时使用默认 `5`。

#### `commentConfig.maxDepth`

- 作用：评论树最大展开深度。
- 规则：运行时会向下取整，最小值强制为 `1`；未填时使用默认 `3`。

### `pageMetricsConfig`

#### `pageMetricsConfig.enable`

- 作用：页面统计功能开关。

- 冲突提醒：只有 `enable=true` 且 `qingyanConfig` 非空时，页面统计才会真正启用。

### `pageFeedbackConfig`

#### `pageFeedbackConfig.enable`

- 作用：页面反馈面板开关。
- 规则：这是总开关；单独开启它不会强制渲染区块，还需要点赞或打赏至少一项实际可显示。
- 关闭行为：设为 `false` 时，无论点赞和打赏子配置如何，文章页都不会渲染“支持这篇文章”区块。

#### `pageFeedbackConfig.like.enable`

- 作用：控制“支持这篇文章”区块里的点赞按钮。
- 规则：只有 `pageFeedbackConfig.enable=true`、`like.enable=true` 且 `qingyanConfig` 非空时，点赞按钮才会实际显示。
- 注意：这里不控制评论区的评论点赞；评论区点赞由评论后端能力和评论组件控制。

#### `pageFeedbackConfig.reward.enable`

- 作用：控制“支持这篇文章”区块里的打赏按钮。
- 规则：只有 `pageFeedbackConfig.enable=true`、`reward.enable=true` 且 `reward.options` 非空时，打赏按钮才会实际显示。
- 关闭行为：设为 `false` 后，即使仍保留二维码配置，也不会显示打赏入口。

#### `pageFeedbackConfig.reward.options`

- 作用：打赏选项列表。
- 合并规则：一旦显式填写，会整体替换默认数组。
- 冲突提醒：即使 `qingyanConfig` 为 `null`，只要 `enable=true`、`reward.enable=true` 且 `reward.options` 非空，仍然可以走纯打赏展示模式。

#### `pageFeedbackConfig.reward.options[].id`

- 作用：打赏项稳定标识。

#### `pageFeedbackConfig.reward.options[].name`

- 作用：打赏项名称。

#### `pageFeedbackConfig.reward.options[].image`

- 作用：打赏二维码图片路径。
- 路径规则：和横幅、头像配置一致。站点自有二维码建议放在外部站点根目录 `<siteRoot>/assets/` 下，例如 `assets/reward/wechat.svg`。`init-site` 默认会创建 `assets/reward/wechat.svg` 和 `assets/reward/alipay.svg` 作为替换占位符。

#### `pageFeedbackConfig.reward.options[].alt`

- 作用：打赏二维码图片替代文本。

### `qingyanDevProxyTarget`

- 作用：开发期 FangYuan 访问本地 QingYan 服务时使用的代理目标。
- 规则：可写绝对 `http(s)` 地址，或设为 `null` 关闭。
- 适用场景：本地联调和开发辅助，不是正式站点对外公开配置。

## 推荐做法

- 先只写确实需要覆盖默认值的字段，不要把模板全部复制后机械改一遍。
- QingYan 后端连接参数统一写在 `qingyanConfig`；`commentConfig`、`pageMetricsConfig`、`pageFeedbackConfig` 只负责对应功能开关和展示参数。
- 想做复杂 permalink 规则时，先确认公开 URL 语义，再决定 `postsPattern`、`pagesPattern` 和 `postPatternRules`，不要把 Astro 内部构建输出语义和公开路径语义混在一起。
