# `init-site`

## 用途

通过复制维护中的模板配置和基础内容文件，初始化一个外部站点根目录。

## 命令

```bash
node scripts/site/init-site.js
```

## 会创建的内容

- `<siteRoot>/site.config.yaml`
- `<siteRoot>/content/spec/about.md`
- 对全新站点额外创建 `<siteRoot>/content/posts/welcome.md`
- `<siteRoot>/assets/`
- `<siteRoot>/assets/README.md`

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
- `--seed-from-src-content`

如果没有传 `--site-root`，默认初始化到 FangYuan 仓库内的 `site/`。传入 `--site-root` 后，外部站点根目录可以是任意位置，只要内部结构符合要求即可。

## 初始化之后

请直接维护生成出来的 `site.config.yaml`。不要去修改运行时产物，也不要假设模板文件后续会被自动再次复制。

站点自有图片优先放在生成出来的 `<siteRoot>/assets/` 中，并在配置或文章 frontmatter 里写成 `assets/...`。初始化脚本会创建这些可替换占位符：

- `assets/images/banner.svg`
- `assets/images/avatar.svg`
- `assets/favicon/icon.svg`
- `assets/reward/wechat.svg`
- `assets/reward/alipay.svg`
- `assets/icons/police-emblem.svg`

这些文件用于降低首次预览成本。未被当前配置或内容引用的占位符不会进入最终 `dist`。例如：

```yaml
siteConfig:
  banner:
    src: assets/images/banner.svg

profileConfig:
  avatar: assets/images/avatar.svg
```

文章正文图片优先使用真实相对路径，例如 `./screenshot.webp`。CDN 图片可以继续写 `https://...`，但不会被本地构建打包或校验。
