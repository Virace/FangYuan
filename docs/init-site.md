# `init-site`

## 用途

通过复制维护中的模板配置和基础内容文件，初始化一个外部站点根目录。

`init-site` 只负责首次创建。已经创建过的外部站点后续需要同步编辑器配置或迁移 `site.config.yaml` 时，使用 `update-site`。

## 命令

无参数时进入交互式初始化：

```bash
node scripts/site/init-site.js
```

传入任意参数时进入参数式初始化，未提供的站点字段使用模板默认值：

```bash
node scripts/site/init-site.js --site-root ../my-site --site-title "My Site" --dry-run
```

## 会创建的内容

- `<siteRoot>/site.config.yaml`
- `<siteRoot>/content/spec/about.md`
- 对全新站点额外创建 `<siteRoot>/content/posts/welcome.md`
- `<siteRoot>/assets/`
- `<siteRoot>/assets/README.md`
- `<siteRoot>/frontmatter.json`
- `<siteRoot>/.vscode/extensions.json`
- `<siteRoot>/.vscode/settings.json`

`frontmatter.json` 和 `.vscode/` 用于外部站点内容编辑体验。生成后可直接用 VS Code 打开 `<siteRoot>`，并按推荐安装 Front Matter CMS 扩展。

## 占位符替换

- `{{SITE_TITLE}}`
- `{{SITE_SUBTITLE}}`
- `{{PROFILE_NAME}}`
- `{{PROFILE_BIO}}`
- `{{QINGYAN_SITE_KEY}}`
- `{{QINGYAN_DEV_PROXY_TARGET}}`

## 参数

- `--dry-run`
- `--site-root <path>`
- `--site-title <value>`
- `--site-subtitle <value>`
- `--profile-name <value>`
- `--profile-bio <value>`
- `--qingyan-site-key <value>`
- `--qingyan-dev-proxy-target <url>`
- `--seed-from-src-content`
- `--no-frontmatter`
- `--no-vscode`

如果没有传 `--site-root`，默认初始化到 FangYuan 仓库内的 `site/`。传入 `--site-root` 后，外部站点根目录可以是任意位置，只要内部结构符合要求即可。

`--no-frontmatter` 会跳过 `<siteRoot>/frontmatter.json`。`--no-vscode` 会跳过 `<siteRoot>/.vscode/`。默认会生成这两类编辑器辅助文件；如果你不使用 VS Code 或 Front Matter CMS，再显式禁用。

## 初始化之后

请直接维护生成出来的 `site.config.yaml`。不要去修改运行时产物，也不要假设模板文件后续会被自动再次复制。

请直接维护生成出来的 `frontmatter.json`。它只服务 Front Matter CMS 编辑体验，不参与 FangYuan 构建。外部站点中的默认内容目录已经配置为：

- `[[workspace]]/content/posts`
- `[[workspace]]/content/spec`
- `assets`

站点自有图片优先放在生成出来的 `<siteRoot>/assets/` 中，并在配置或文章 frontmatter 里写成 `assets/...`。初始化脚本会创建这些可替换占位符：

- `assets/images/banner.svg`
- `assets/images/avatar.svg`
- `assets/favicon/icon.svg`
- `assets/reward/wechat.svg`
- `assets/reward/alipay.svg`

这些文件用于降低首次预览成本。未被当前配置或内容引用的占位符不会进入最终 `dist`。公安备案图标是 FangYuan 主题内置资源，不需要放入外部站点 `assets/`。例如：

```yaml
siteConfig:
  banner:
    src: assets/images/banner.svg

profileConfig:
  avatar: assets/images/avatar.svg
```

文章正文图片优先使用真实相对路径，例如 `./screenshot.webp`。CDN 图片可以继续写 `https://...`，但不会被本地构建打包或校验。

## 更新已有外部站点

先 dry-run 看报告，再显式 apply：

```bash
node scripts/site/update-site.js --site-root ../my-site --dry-run
node scripts/site/update-site.js --site-root ../my-site --apply
```

`update-site` 会自动刷新或合并：

- `frontmatter.json`
- `.vscode/extensions.json`
- `.vscode/settings.json`

`site.config.yaml` 不会被模板覆盖，只走版本化 migration。`--apply` 写入任何已有文件前，都会在同一次时间戳目录下创建备份：

```text
<siteRoot>/.backup/YYYYMMDD-HHMMSS/frontmatter.json
<siteRoot>/.backup/YYYYMMDD-HHMMSS/.vscode/extensions.json
<siteRoot>/.backup/YYYYMMDD-HHMMSS/.vscode/settings.json
<siteRoot>/.backup/YYYYMMDD-HHMMSS/site.config.yaml
```

如果迁移遇到需要人工判断的冲突，`--apply` 会直接阻断，不会写入任何文件。
