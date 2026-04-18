# QingYan Follow-up Local Todo

仅作本地后续/分支收尾参考，不属于当前执行范围。

## 后续事项

1. `init-site` 交互式创建
   - 从当前最小 scaffold 升级为交互式初始化流程
   - 覆盖站点基础信息、导航 / Profile，以及 QingYan comments / page metrics / page feedback 的常见配置
   - 保持幂等，不覆盖已有 `site/` 自定义内容，并尽量减少用户手改 `site/config.ts`

2. QingYan 部署与配置文档
   - 说明 QingYan 仓库准备、数据库迁移、`qingyan.yml` / `QINGYAN_CONFIG_PATH` 的使用方式
   - 说明 FangYuan `site/config.ts` 中 `qingyanDevProxyTarget`、comments / page metrics / page feedback 的最小接入配置
   - 说明本地 `pnpm dev` / `pnpm dev:full` 与生产部署的推荐流程，以及 external `site/` 覆盖层的边界
