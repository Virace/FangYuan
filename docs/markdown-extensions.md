# Markdown 扩展

本文档说明 FangYuan 当前可用的 Markdown 扩展能力，以及它们在文章页和展示页中的最终产物。

这里的“文章页”指 `posts` collection，也就是 `src/content/posts/` 或外部站点根目录 `<siteRoot>/content/posts/` 下的 Markdown。这里的“展示页”指 `spec` collection，也就是 `src/content/spec/` 或 `<siteRoot>/content/spec/` 下的 Markdown，例如 About 页面。

## 总览

| 能力 | 写法 | 文章页 | 展示页 | 最终产物 |
| --- | --- | --- | --- | --- |
| 标准 Markdown | 标题、段落、列表、表格、引用、链接、图片等 | 支持 | 支持 | Prose 排版后的正文 HTML |
| 原始 HTML | 直接写可信 HTML | 支持 | 支持 | 原样进入正文区域，并套用 Markdown 区域样式 |
| 数学公式 | `$...$`、`$$...$$` | 支持 | 支持 | KaTeX HTML |
| 代码块增强 | fenced code block attributes | 支持 | 支持 | Expressive Code 代码块 |
| 标题锚点 | 普通 Markdown 标题 | 支持 | 支持 | 标题 `id`、悬停 `#` 锚点、可选 TOC |
| 自动 section 包裹 | 普通 Markdown 标题 | 支持 | 支持 | 按标题层级生成 `<section>` 结构 |
| 阅读统计 | 正文文本 | 支持 | 不展示 | 字数和预计阅读时间 |
| 自动摘要 | 第一段正文 | 支持 | 不展示 | 列表卡片 fallback 摘要 |
| 正文图片增强 | `![alt](./image.webp)` | 支持 | 支持 | Astro 图片资源、圆角样式、PhotoSwipe 触发条件 |
| 提示块 | `:::note` 等 | 支持 | 支持 | 彩色提示 blockquote |
| GitHub Alert 兼容 | `> [!NOTE]` 等 | 支持 | 支持 | 转成对应提示块语法后渲染 |
| 行内高亮 | `:hl[text]{tone="tip"}` | 支持 | 支持 | `<mark class="md-highlight ...">` |
| 剧透 | `:spoiler[text]` | 支持 | 支持 | `<spoiler>` 遮罩文本 |
| Aside 补充块 | `:::aside` | 支持 | 支持 | `<aside class="md-aside">` |
| Fold 折叠块 | `:::fold{title="..."}` | 支持 | 支持 | 可点击展开的折叠区域 |
| Bilibili 视频 | `::bilibili{...}` | 支持 | 支持 | 响应式 Bilibili iframe figure |
| 外链卡片 | `::link-card{...}` | 支持 | 支持 | 卡片式链接 |
| 外链卡片网格 | `:::link-grid` | 支持 | 支持 | 响应式卡片网格 |
| GitHub 仓库卡片 | `::github{repo="owner/repo"}` | 支持 | 支持 | 动态仓库信息卡片 |
| RSS 指令降级 | `:hl`、`:::aside`、`:::fold` | 支持 | 不适用 | RSS 内对应 HTML 片段 |

## 页面差异

### 文章页

文章页使用完整博客文章壳层。Markdown 正文之外，页面还会展示文章标题、发布日期、更新时间、标签、分类、封面、字数、阅读时间、上下篇导航、许可证、页面反馈和评论等站点功能。

文章页的 frontmatter 来自 `posts` collection，常用字段包括：

```yaml
---
title: 示例文章
published: 2026-05-04
updated: 2026-05-04
description: 文章摘要
image: ./cover.webp
tags: [Markdown, FangYuan]
category: 示例
draft: false
comment: false
toc:
  enable: true
  depth: 2
---
```

`comment` 是文章级评论开关。文章页默认等价于 `comment: true`；只有需要关闭单篇文章评论时才需要显式写 `comment: false`。

最终页面大致结构是：

```html
<article-like-card id="post-container">
  <div>字数 / 阅读时间</div>
  <div data-pagefind-meta="title">文章标题</div>
  <metadata>日期 / 标签 / 分类</metadata>
  <img id="post-cover" />
  <div class="custom-md markdown-content">Markdown 渲染结果</div>
  <feedback />
  <license />
</article-like-card>
```

这里的 `article-like-card`、`metadata`、`feedback` 只是结构说明，不是真实标签名。

### 展示页

展示页用于 About 这类独立内容页。它同样使用 Markdown 渲染链，因此正文扩展都可用，但页面壳层更轻，不展示文章元信息、字数、阅读时间、封面、上下篇导航、许可证或反馈。展示页默认不显示评论，但可以通过 frontmatter 显式开启。

展示页的 frontmatter 更少，常用字段包括：

```yaml
---
title: 关于本站
published: 2026-05-04
updated: 2026-05-04
toc:
  enable: true
  depth: 2
comment: true
---
```

`comment` 在展示页默认等价于 `false`；只有 `comment: true`、全局 `commentConfig.enable=true` 且 `qingyanConfig` 已配置时才会挂载评论区。

最终页面大致结构是：

```html
<content-card>
  <div class="custom-md">Markdown 渲染结果</div>
</content-card>
```

### 共同点

文章页和展示页都会：

- 使用同一套 Markdown 插件链。
- 使用同一个 `Markdown.astro` 容器，正文区域带 `custom-md` 样式。
- 支持标题锚点、TOC 解析、KaTeX、Expressive Code、directive 组件和图片预览判断。
- 被 Pagefind 搜索正文索引覆盖。

### 不同点

文章页额外会：

- 从 Markdown 内容生成 `words` 和 `minutes`，并在页面顶部与列表卡片里展示。
- 从第一段正文生成 `excerpt`，当 frontmatter `description` 为空时给列表卡片使用。
- 解析 `image` 作为文章封面，参与列表卡片、文章页封面和 Open Graph。
- 根据封面或正文图片启用 PhotoSwipe。
- 渲染文章专属的反馈、许可证和上下篇能力。
- 默认显示评论；可通过 `comment: false` 关闭。

展示页默认只渲染正文内容本身，更适合 About、说明页、固定页面；如果某个展示页需要留言能力，可以显式写 `comment: true`。

## 标准 Markdown

基础 Markdown 能力由 Astro Markdown 管线提供，正文区域使用 Tailwind Typography 和 `src/styles/markdown.css`、`src/styles/markdown-extend.css` 做站点样式。

常用写法：

```markdown
# 一级标题

段落之间用空行分隔，可以写 **粗体**、_斜体_、`行内代码`。

- 无序列表
- 第二项

1. 有序列表
2. 第二项

> 引用内容

[站内链接](/about)

![图片说明](./screenshot.webp)
```

最终产物大致是：

```html
<div class="custom-md">
  <section>
    <h1 id="一级标题">一级标题<a class="anchor">...</a></h1>
    <p>段落内容</p>
    <ul>...</ul>
    <blockquote>...</blockquote>
    <p><img src="/static/..." alt="图片说明" /></p>
  </section>
</div>
```

## 原始 HTML

Markdown 中可以直接写可信 HTML，例如第三方视频 iframe 或简单嵌入内容。

```markdown
<iframe
  width="100%"
  height="468"
  src="https://www.youtube.com/embed/..."
  title="YouTube 视频播放器"
  allowfullscreen
></iframe>
```

最终产物是原始 HTML 进入正文区域。`iframe` 会被 `markdown-extend.css` 套上圆角和最大宽度约束。

注意：这不会自动净化不可信 HTML。只把自己信任的 HTML 放进内容文件。

## 图片

### 正文图片

正文图片优先使用相对路径，和文章放在同一目录或邻近目录。

```markdown
![截图](./screenshot.webp)
![上级目录图片](../shared/diagram.svg)
```

最终产物会交给 Astro 内容图片管线处理，生成类似：

```html
<img
  src="/static/screenshot.hash.webp"
  width="..."
  height="..."
  alt="截图"
/>
```

图片会在 Markdown 区域内带圆角。如果页面有正文图片或文章封面，文章页/展示页会启用 PhotoSwipe 相关能力。

### 文章封面

文章页 frontmatter 的 `image` 支持以下常见写法：

```yaml
image: ./cover.webp
image: assets/images/banner.webp
image: https://cdn.example.com/cover.webp
image: ""
```

含义：

- `./cover.webp` 或 `../cover.webp`：相对当前 Markdown 文件。
- `assets/...`：外部站点模式下指向 `<siteRoot>/assets/...`；内部模式下按本仓 `src/` 下的别名资源解析。
- `https://...`：远程图片原样透传。
- 空字符串：没有封面。

最终产物在文章页中是封面图片，在列表页中是卡片右侧或上方图片，并可能参与 Open Graph。

## 数学公式

行内数学公式使用单美元符号：

```markdown
角速度可以写成 $\omega = d\phi / dt$。
```

块级数学公式使用双美元符号：

```markdown
$$
I = \int \rho R^{2} dV
$$
```

最终产物是 KaTeX HTML：

```html
<span class="katex">...</span>
<span class="katex-display">...</span>
```

块级公式会被布局脚本包裹成可横向滚动的展示容器，避免宽公式撑破正文区域。

## 代码块

FangYuan 使用 Expressive Code 渲染围栏代码块。

### 基础代码块

````markdown
```ts
console.log("hello")
```
````

最终产物是带语法高亮、主题样式和复制按钮的代码块。

### 标题与边框

````markdown
```js title="demo.js"
console.log("标题属性示例")
```

```sh frame="none"
echo "无边框代码块"
```
````

最终产物大致是：

```html
<div class="expressive-code">
  <figure class="frame">
    <figcaption>demo.js</figcaption>
    <pre><code>...</code></pre>
  </figure>
</div>
```

### 行号、标记和折叠

````markdown
```js showLineNumbers startLineNumber=5 {2} ins={4} del={6}
console.log("line 5")
console.log("highlight")
console.log("normal")
console.log("inserted")
console.log("normal")
console.log("deleted")
```

```js collapse={1-3, 8-10}
setup()
prepare()
init()
run()
finish()
```
````

最终产物包含行号、增删标记、重点行背景和可折叠代码段。主题默认启用自动换行，`shellsession` 默认不显示行号。

## 标题锚点与目录

普通 Markdown 标题会自动生成 slug，并在标题后追加悬停可见的 `#` 锚点。

```markdown
## 安装
```

最终产物大致是：

```html
<h2 id="安装">
  安装
  <a class="anchor" href="#安装">
    <span class="anchor-icon" data-pagefind-ignore>#</span>
  </a>
</h2>
```

如果站点配置和页面 frontmatter 允许显示目录，`MainGridLayout` 会使用这些 headings 生成侧边 TOC。

页面级 TOC 覆写：

```yaml
toc:
  enable: true
  depth: 2
```

说明：

- `depth` 支持 `1`、`2`、`3`。
- 目录是否显示还会受站点全局 `siteConfig.toc` 和当前页面标题数量影响。

## 自动 section

所有标题和标题后的内容会被 `remark-sectionize` 按层级包进 `<section>`。

输入：

```markdown
# 页面标题

## 第一节

内容。
```

最终产物大致是：

```html
<section>
  <h1>页面标题</h1>
  <section>
    <h2>第一节</h2>
    <p>内容。</p>
  </section>
</section>
```

这是展示层结构增强，一般不需要内容作者额外处理。

## 阅读统计与摘要

文章页会根据 Markdown 正文自动计算：

- `words`：字数。
- `minutes`：预计阅读时间，最小为 `1`。
- `excerpt`：第一段 paragraph 的纯文本内容。

最终展示位置：

- 文章页顶部显示字数和阅读时间。
- 首页、归档等文章卡片显示字数和阅读时间。
- 如果 frontmatter `description` 为空，文章卡片使用自动 `excerpt` 作为摘要。

展示页不会显示这些文章元信息。

## 提示块

支持五种提示类型：

- `note`
- `tip`
- `important`
- `warning`
- `caution`

基础写法：

```markdown
:::note
这是一条普通提示。
:::

:::warning
这是一条风险提示。
:::
```

自定义标题：

```markdown
:::tip[推荐做法]
这里写提示内容。
:::
```

最终产物大致是：

```html
<blockquote class="admonition bdm-tip">
  <span class="bdm-title">推荐做法</span>
  <p>这里写提示内容。</p>
</blockquote>
```

如果没有自定义标题，标题会显示类型名的大写形式，例如 `NOTE`、`TIP`。

注意：直接写 `:::info` 或 `:::danger` 当前没有对应 FangYuan 提示组件，通常不要使用。

## GitHub Alert 兼容语法

也可以写 GitHub 风格 Alert：

```markdown
> [!NOTE]
> 这会被转换成 note 指令。

> [!TIP]
> 这会被转换成 tip 指令。

> [!WARNING]
> 这会被转换成 warning 指令。
```

当前依赖默认映射里：

- `NOTE` 会转成 `note`
- `TIP` 会转成 `tip`
- `WARNING` 会转成 `warning`
- `IMPORTANT` 会转成 `info`
- `CAUTION` 会转成 `danger`

FangYuan 当前只注册了 `note`、`tip`、`important`、`warning`、`caution` 这五个提示组件。因此推荐优先使用 `NOTE`、`TIP`、`WARNING`，或者直接使用 FangYuan 的 `:::important`、`:::caution` 指令写法，避免 `IMPORTANT` / `CAUTION` 被转换到未注册组件名。

## 行内高亮

行内高亮用于强调一个短语，不打断正文节奏。

```markdown
普通强调：:hl[重点信息]{tone="note"}
建议提示：:hl[推荐做法]{tone="tip"}
强提醒：:hl[需要特别注意]{tone="warning"}
```

`tone` 支持：

- `note`
- `tip`
- `important`
- `warning`
- `caution`

未知值会回退为 `note`。

最终产物大致是：

```html
<mark class="md-highlight tone-warning" data-tone="warning">
  需要特别注意
</mark>
```

RSS 中也会把这类语法转换成 `<mark>`，并保留 `md-highlight` 和 `tone-*` 类名。

## 剧透

剧透使用 text directive：

```markdown
这段内容 :spoiler[会被隐藏 **嘿嘿**]！
```

最终产物大致是：

```html
<spoiler>会被隐藏 <strong>嘿嘿</strong></spoiler>
```

正文样式会让剧透内容默认被遮罩，鼠标悬停时显示。`spoiler` 不是浏览器标准语义标签，只用于站点内展示效果。

## Aside 补充块

Aside 适合放不想打断正文主线的背景说明、PS 或轻量提醒。

```markdown
:::aside
这里是补充说明。
:::
```

最终产物大致是：

```html
<aside class="md-aside">
  <p>这里是补充说明。</p>
</aside>
```

RSS 中也会转换为 `<aside class="md-aside">`。

## Fold 折叠块

Fold 适合放可选细节、长示例、更新记录或默认不想展开的内容。

基础写法：

```markdown
:::fold{title="展开示例"}
这里是默认折叠的内容。
:::
```

默认展开：

```markdown
:::fold{title="默认展开示例" open="true"}
这里会在页面加载时直接展开。
:::
```

图标：

```markdown
:::fold{title="书签图标示例" icon="bookmark"}
内容。
:::

:::fold{title="无图标示例" icon="none"}
内容。
:::
```

`icon` 支持：

- `file`
- `note`
- `tip`
- `warning`
- `question`
- `bookmark`
- `sparkles`
- `none`

常用别名：

- `default`、`document`、空值：`file`
- `info`：`note`
- `help`：`question`
- `star`：`sparkles`
- `lightbulb`：`tip`
- `hidden`、`false`：`none`

`open` 的真值包括：空值、`true`、`1`、`yes`、`on`、`open`。

最终产物大致是：

```html
<div class="md-fold" data-icon="bookmark" data-open="true">
  <input class="md-fold-toggle" type="checkbox" checked="checked" />
  <label class="md-fold-summary">展开示例</label>
  <div class="md-fold-body">
    <div class="md-fold-body-inner">
      <p>这里是默认折叠的内容。</p>
    </div>
  </div>
</div>
```

RSS 中会降级为更通用的 `<details class="md-fold">` 和 `<summary class="md-fold-summary">`。

## Bilibili 视频

使用叶子 directive 插入 Bilibili 播放器。

```markdown
::bilibili{bvid="BV1fK4y1s7Qf" p="1" title="Bilibili 视频示例"}
```

参数：

- `bvid`：必填，必须是 `BV` 开头的 BV 号。
- `p`：可选，分 P 编号，默认 `1`；无效值会回退为 `1`。
- `title`：可选，iframe 标题和图注，默认 `Bilibili video`。

最终产物大致是：

```html
<figure class="md-bilibili">
  <iframe
    src="https://player.bilibili.com/player.html?bvid=BV1fK4y1s7Qf&p=1"
    title="Bilibili 视频示例"
    loading="lazy"
    allowfullscreen
  ></iframe>
  <figcaption class="md-bilibili-title">Bilibili 视频示例</figcaption>
</figure>
```

如果 `bvid` 无效，页面里会生成隐藏的 invalid directive 节点，不会渲染成播放器。

## 外链卡片

`link-card` 用于友链、资源推荐或站内跳转卡片。

```markdown
::link-card{url="https://astro.build" title="Astro" description="适合构建内容站点的 Web 框架。"}
```

带 logo：

```markdown
::link-card{url="https://github.com/Virace/FangYuan" title="FangYuan" description="当前站点主题仓库。" logo="https://github.githubassets.com/favicons/favicon.svg"}
```

站内链接：

```markdown
::link-card{url="/about" title="关于" description="查看站点说明。"}
```

参数：

- `url`：必填，支持 `http://`、`https://` 和站内绝对路径 `/...`。
- `title`：必填，卡片标题。
- `description`：必填，卡片描述。
- `logo`：可选，卡片图标。

`logo` 支持：

- `https://...` 或 `http://...`：远程图片。
- `/static-path.svg`：站内绝对路径，原样作为 `src`。
- `data:...`：data image。
- `./logo.svg` 或 `../logo.svg`：相对当前 Markdown 文件。
- `assets/logo.svg`：外部站点模式下指向 `<siteRoot>/assets/logo.svg`；内部模式下按本仓 `src/assets/logo.svg` 解析。

本地 logo 支持扩展名：

- `avif`
- `gif`
- `jpeg`
- `jpg`
- `png`
- `svg`
- `webp`

最终产物大致是：

```html
<a class="card-link no-styling" href="https://astro.build" target="_blank" rel="noopener noreferrer">
  <span class="lc-media">
    <img class="lc-logo" src="https://favicon.im/astro.build?larger=true" alt="" />
  </span>
  <span class="lc-body">
    <span class="lc-title">Astro</span>
    <span class="lc-description">适合构建内容站点的 Web 框架。</span>
  </span>
</a>
```

规则：

- 外部 `url` 会自动加 `target="_blank"` 和 `rel="noopener noreferrer"`。
- 站内 `/...` 链接不会加新窗口属性。
- 没写 `logo` 且是外链时，会使用 `https://favicon.im/<hostname>?larger=true`。
- 没写 `logo` 且是站内链接时，会使用标题首字作为 fallback。
- 本地 `logo` 会进入 Astro 内容图片管线，最终通常输出 `/static/...`。
- 无效 `url`、空 `title`、空 `description` 或非法 `logo` 会生成隐藏的 invalid directive 节点。

## 外链卡片网格

多张 `link-card` 可以放进 `link-grid`。

```markdown
:::link-grid
::link-card{url="https://astro.build" title="Astro" description="适合构建内容站点的 Web 框架。"}

::link-card{url="https://svelte.dev" title="Svelte" description="用于构建交互组件的前端框架。"}

::link-card{url="https://vite.dev" title="Vite" description="现代前端工具链。"}
:::
```

最终产物大致是：

```html
<div class="md-link-grid">
  <a class="card-link no-styling">...</a>
  <a class="card-link no-styling">...</a>
  <a class="card-link no-styling">...</a>
</div>
```

布局会根据可用宽度自动换列。空的 `link-grid` 会生成隐藏的 invalid directive 节点。

## GitHub 仓库卡片

GitHub 卡片用于展示仓库入口。

```markdown
::github{repo="Virace/FangYuan"}
```

参数：

- `repo`：必填，格式必须是 `owner/repo`。

最终产物大致是：

```html
<a id="GCxxxxxx-card" class="card-github fetch-waiting no-styling" href="https://github.com/Virace/FangYuan" target="_blank">
  <div class="gc-titlebar">...</div>
  <div class="gc-description">Waiting for api.github.com...</div>
  <div class="gc-infobar">...</div>
  <script defer>fetch("https://api.github.com/repos/Virace/FangYuan")...</script>
</a>
```

页面加载后，脚本会请求 GitHub API，填充：

- 仓库描述。
- 主要语言。
- star 数。
- fork 数。
- license。
- owner avatar。

如果请求失败，卡片会保留可点击状态，并加上 `fetch-error` 类。写法必须是叶子 directive，不能包含子内容。

## RSS 中的扩展表现

RSS 渲染不是完整 Astro Markdown 管线，而是 `src/utils/rss-content.ts` 用 `markdown-it` 做简化渲染，并额外处理部分 FangYuan directive。

当前 RSS 会特殊处理：

- `:hl[text]{tone="..."}` -> `<mark class="md-highlight tone-...">`
- `:::aside` -> `<aside class="md-aside">`
- `:::fold{...}` -> `<details class="md-fold">`

RSS 不会完整执行所有文章页组件。例如 `link-card`、`github`、`bilibili` 这类页面组件不应假设在 RSS 中有同等交互结果。

## 无效 directive 的产物

多个组件会在参数非法时生成隐藏节点，而不是抛出构建错误。

常见隐藏产物：

```html
<div class="hidden md-directive-invalid" data-md-directive-error="Invalid link-card url">
  Invalid link-card url
</div>
```

这种节点用于构建测试和排查内容问题，正常页面不会显示。

## 推荐写法

- 正文图片优先和 Markdown 文件放在一起，使用 `./image.webp`。
- 站点共享图片放在 `<siteRoot>/assets/`，在内容或配置里写成 `assets/...`。
- 友链 logo 优先使用本地 `assets/...` 或文章相对路径，避免外部 favicon 不稳定。
- 文章页需要元信息、归档、反馈、评论时放进 `posts`。
- About、说明页、友链页这类固定页面放进 `spec`。
- GitHub Alert 兼容语法只推荐 `NOTE`、`TIP`、`WARNING`；`IMPORTANT` 和 `CAUTION` 优先写成 FangYuan 原生 `:::important`、`:::caution`。
- 复杂代码块优先使用 Expressive Code attributes，而不是手写 HTML。
- 需要在 RSS 中保持基本语义的内容，优先使用普通 Markdown、`:hl`、`:::aside` 和 `:::fold`。

## 参考文件

- `astro.config.mjs`
- `src/plugins/`
- `src/styles/markdown.css`
- `src/styles/markdown-extend.css`
- `src/components/misc/Markdown.astro`
- `src/components/page/PostArticlePage.astro`
- `src/components/page/SpecContentPage.astro`
- `src/content/posts/markdown.md`
- `src/content/posts/markdown-extended.md`
- `src/content/posts/content-directives.md`
- `src/content/posts/expressive-code.md`
