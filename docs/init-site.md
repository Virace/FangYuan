# 外部站点初始化与升级

`init-site` 用来创建独立的外部站点目录（默认在仓库根下的 `site/`），把站点配置、文章和图片与主题源码分开；已经创建过的站点后续升级配置或编辑器提示时使用 `update-site`。

## 初始化

交互式初始化（无参数）：

```bash
node scripts/site/init-site.js
```

参数式初始化（未传的站点字段使用模板默认）：

```bash
node scripts/site/init-site.js --site-root ../my-site --site-title "My Site" --dry-run
```

常用参数：

- `--site-root <path>`：指定外部站点目录，省略时默认建在仓库内的 `site/`
- `--site-title` / `--site-subtitle` / `--profile-name` / `--profile-bio`：直接填入站点信息
- `--qingyan-site-key` / `--qingyan-dev-proxy-target`：配置 QingYan 后端接入
- `--seed-from-src-content`：复制仓库内置示例文章作为起点
- `--no-frontmatter` / `--no-vscode`：跳过生成 `frontmatter.json` 与 `.vscode/` 辅助配置
- `--dry-run`：仅输出操作清单，不写入文件

运行后会生成：

- `<siteRoot>/site.config.yaml`：站点配置文件（替换 `{{SITE_TITLE}}`、`{{SITE_SUBTITLE}}`、`{{PROFILE_NAME}}`、`{{PROFILE_BIO}}`、`{{QINGYAN_SITE_KEY}}`、`{{QINGYAN_DEV_PROXY_TARGET}}`）
- `<siteRoot>/content/spec/about.md` 与 `<siteRoot>/content/posts/welcome.md`（仅全新站点）
- `<siteRoot>/assets/` 与说明文件 `<siteRoot>/assets/README.md`
- `<siteRoot>/frontmatter.json`、`<siteRoot>/.vscode/`（含 `comment` 布尔开关支持，方便用 Front Matter CMS 写作）

## 写作与图片放置

生成后直接编辑 `<siteRoot>/site.config.yaml` 与 `<siteRoot>/content/`，不要把站点数据改回主题源码目录：

1. **写文章**：放在 `<siteRoot>/content/posts/`，支持平铺 `post.md` 或嵌套目录 `<slug>/index.md`。
2. **文章配图与封面**：和文章放同目录，正文写 `![描述](./photo.webp)`，封面写 `image: ./cover.webp`。
   - 封面推荐 **`1200 × 600`**（`2:1`，高清 `1600 × 800`）或常见 **`1280 × 720`**（`16:9`），构图居中或略偏右；
   - 不配封面时，首页列表卡片会自动生成纯 CSS 光学渐变背景，不请求图片。
3. **站点共用图片**：放在 `<siteRoot>/assets/`，配置中写成 `assets/...`（未被引用的占位图不会进入 `dist/`）：
   - `assets/images/banner.svg`（站点横幅）
   - `assets/images/avatar.svg`（侧栏头像）
   - `assets/favicon/icon.svg`（站点 Favicon）
   - `assets/reward/wechat.svg` / `assets/reward/alipay.svg`（打赏二维码）
4. **远程图与主题内置图**：`https://...` 外链直接透传；公安备案图标为主题内置资源，不需要放到 `assets/`。

## 升级已有站点

已有站点先跑 dry-run 看变更报告，确认后再加 `--apply` 写入：

```bash
node scripts/site/update-site.js --site-root ../my-site --dry-run
node scripts/site/update-site.js --site-root ../my-site --apply
```

- `frontmatter.json` 只做字段增量合并（如补上缺失字段），保留你自己加的自定义字段。
- `site.config.yaml` 只走版本化 migration，不用模板覆写；存在新旧字段冲突时会停止并提示人工处理。
- `--apply` 改写任何已有文件前，都会在 `<siteRoot>/.backup/YYYYMMDD-HHMMSS/` 按原路径备份。
