# 脚本目录

## `scripts/site`

- `init-site.js`：根据维护中的模板初始化外部站点根目录；无参数时交互式执行，传入参数时按参数式执行
- `init-site-prompts.js`：处理 `init-site` 的交互输入归一化，包括是否生成 Front Matter CMS 与 VS Code 辅助配置
- `update-site.js`：更新已经创建的外部站点根目录；默认 dry-run，`--apply` 后才写入
- `update-site-editors.js`：规划并应用 `frontmatter.json` 与 `.vscode/` 编辑器辅助配置更新
- `update-site-config.js`：读取、备份并写回外部 `site.config.yaml` 迁移结果
- `update-site-config-migrations.js`：维护 `site.config.yaml` 的版本化迁移规则
- `template.config.yaml`：面向用户维护的外部站点配置模板
- `sync-content-routes.mjs`：审阅并同步已有稳定 ID 的路径登记；默认仅展示，`--write` 后写入，`--recover` 完成中断的同步，详见 `content-routes.md`
- `build-site.mjs` / `build-paths.mjs`：`pnpm build*` 的统一构建入口与输出/缓存路径解析
- `update-site-backup.js`：`update-site --apply` 写入前按原相对路径创建时间戳备份
- `migrate-content-frontmatter.js`：内容 frontmatter 批量迁移辅助脚本
- `studio-settings.mjs`：FangYuanStudio 站点设置读写桥接脚本

## `scripts/qingyan`

- `dev-with-qingyan.mjs`：同时启动 FangYuan 和真实 QingYan 开发服务
- `dev-with-qingyan-mock.mjs`：让 FangYuan 接到冻结版 mock 集成上启动
- `qingyan-dev-control.mjs`：驱动真实 QingYan 开发场景并查看状态

## `scripts/content`

- `new-post.js`：在 `src/content/posts/` 下创建 Markdown 文章脚手架
- `generate-pagination-test-posts.js`：生成可随时删除的分页测试文章

## `scripts/cloudflare`

- `demo-deploy.mjs`：Cloudflare demo 环境检查、构建、预览与部署包装（`smoke` / `dev` / `deploy`）
- `demo-smoke.mjs`：针对部署后 demo 页面的可用性与接口冒烟校验
- `process-runner.mjs`：Cloudflare 部署与校验命令的子进程执行辅助
