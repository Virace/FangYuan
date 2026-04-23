# `init-site`

## 用途

通过复制维护中的模板配置和基础内容文件，初始化一个外部站点根目录。

## 命令

```bash
node scripts/site/init-site.js
```

## 会创建的内容

- `site/site.config.yaml`
- `site/content/spec/about.md`
- 对全新站点额外创建 `site/content/posts/welcome.md`
- `site/assets/`

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

## 初始化之后

请直接维护生成出来的 `site.config.yaml`。不要去修改运行时产物，也不要假设模板文件后续会被自动再次复制。
