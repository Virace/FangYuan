# 脚本目录

## `scripts/site`

- `init-site.js`：根据维护中的模板初始化外部站点根目录
- `init-site-prompts.js`：处理 `init-site` 的交互输入归一化
- `template.config.yaml`：面向用户维护的外部站点配置模板

## `scripts/qingyan`

- `dev-with-qingyan.mjs`：同时启动 FangYuan 和真实 QingYan 开发服务
- `dev-with-qingyan-mock.mjs`：让 FangYuan 接到冻结版 mock 集成上启动
- `qingyan-dev-control.mjs`：驱动真实 QingYan 开发场景并查看状态

## `scripts/content`

- `new-post.js`：在 `src/content/posts/` 下创建 Markdown 文章脚手架
- `generate-pagination-test-posts.js`：生成可随时删除的分页测试文章

## `scripts/wp-migration`

- WordPress WXR 审计与转换辅助脚本
