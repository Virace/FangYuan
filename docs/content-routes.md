# 稳定身份与历史地址

posts 与 spec 支持可选 `contentId`。已有无 ID 文章继续读取和构建；Studio 在作者明确保存时生成 UUID，只添加身份字段，保留其余 Markdown 原文。复制为新文章必须使用新 ID，移动或重命名原文章继续保留 ID。

外部站点在 `FANGYUAN_SITE_ROOT/content-routes.yaml` 保存登记；内部 demo 的登记位于主题根目录。登记随内容 Git 管理，不属于可重建的编辑器索引。

```yaml
version: 1
documents:
  7d1f8cf1-88bd-4bee-9fb8-55cef0c65639:
    paths:
      - /a.html
      - /b.html
      - /c.html
```

路径为未叠加站点 `base` 的站内路径；当前地址始终由 Markdown 与 permalink 配置计算。当前为 `/c.html` 时，a、b 每次完整构建都直接跳转 c。同文恢复 a 时，b、c 直接跳转 a。历史归属永久保留，其他 ID 或未接管文章不能占用它。

文章转回草稿后，当前和历史路径继续归属原 ID。构建暂停生成该文章的页面及历史跳转。恢复正式状态后，历史地址重新直接跳转到当前页面。

Studio 将文章移入回收站时，已有身份的登记保留全部路径并标记 `retired: true`。构建允许该身份暂时没有源文件，并停止生成指向它的历史跳转；其他文章仍不能占用这些路径。恢复时清除标记并重新启用历史跳转。无 ID 的旧文保留原文字节，回收过程不为它补身份。

## 手动编辑与同步

普通正文修改可直接构建。手动改 alias、permalink、文件名或站点 pattern 后，带 ID 文章的新地址若尚未登记，构建给出 `registry-outdated` 并停止。默认构建不会改写内容或登记。

在主题目录设置与构建相同的站点环境，然后审阅拟写登记：

```powershell
$env:FANGYUAN_SITE_MODE = "external"
$env:FANGYUAN_SITE_ROOT = "你的站点目录"
node scripts/site/sync-content-routes.mjs
node scripts/site/sync-content-routes.mjs --write
pnpm build
```

同步仅追加已有 ID 的当前地址，保留全部历史，不替无 ID 旧文生成身份。Studio 保存与独立命令复用相同的校验和追加规则。

## 诊断与恢复

| 诊断 | 处理方式 |
| --- | --- |
| `duplicate-id` | 恢复原文章身份；副本通过“复制为新文章”生成新 ID。 |
| `missing-identity` | 恢复源文件或原 contentId；永久迁移时为同一 ID 提供有效的替代文章。保留登记。 |
| `retired-identity` | 通过 Studio 恢复文章，或审阅同步登记以清除回收标记。 |
| `identity-changed` | 恢复原 ID；不要在原文件上删除或替换身份。 |
| `path-owned` | 选择未被他文使用的新地址；同文可恢复自己的旧地址。 |
| `output-conflict` | 修正大小写、编码或文件/目录冲突，例如 `/x/` 与 `/x/index.html`。 |
| `reserved-path` | 避开首页、分页、归档、404、XML、公开索引与实际资源入口。 |

保存进行中会存在 `.editor/save-lock.json`。构建和路由 API 检测到它就停止，防止读到文章与登记的中间状态。Studio 保存由 Studio 恢复；独立同步命令中断时，运行 `node scripts/site/sync-content-routes.mjs --recover`。恢复会比较登记基线，后续手动改动仍需先处理冲突。

## 构建结果与公开索引

包装构建与直接 `pnpm exec astro build` 均核对全体文章（包括草稿的路径占用）、稳定 ID、登记归属、保留路径及实际输出冲突。Windows 无法同时物化的大小写路径明确失败。`.HTML` 沿用既有解析含义并给出与 `.html` 不同的提示。相关输入在构建期间变化会使构建失败，需重建。

每次完整构建重建所有历史 HTML，包括 `.html` 和目录的 `index.html`。跳转含零秒 meta refresh、canonical、可点击目标和携带查询/片段的 `location.replace`。静态跳转页通常返回 HTTP 200。RSS、sitemap、文章列表和 Pagefind 使用正式页面，不收录历史跳转。

`content-index.json` 仅含正式发布集合的公开路由信息：

```json
{
  "version": 1,
  "generatedAt": "2026-11-12T00:00:00.000Z",
  "base": "/blog/",
  "entries": [
    { "contentId": "7d1f8cf1-88bd-4bee-9fb8-55cef0c65639", "currentPath": "/c.html", "history": ["/a.html", "/b.html"] }
  ]
}
```

旧文章的 `contentId` 可为 `null`。实际 URL 为 `base` 去尾斜杠后加路径。索引不含草稿、源文件位置、恢复内容或凭据；它只有部署并从线上取得后才能证明实际发布状态。

## Studio 桥接

仅在 `FANGYUAN_STUDIO=1` 下启用 `POST /_studio/routes/analyze`、`POST /_studio/routes/prepare` 和 `POST /_studio/routes/trash`，请求必须携带进程随机 `x-fangyuan-studio-token`。输入为 `{path,source}`，path 相对于站点根，例如 `content/posts/article.md`。

分析返回 `contentId/currentPath/currentUrl/previousPath/history/issues/changed/registryBaseline/registryPath`；问题含 `code/severity/message` 及相关路径和归属 ID。prepare 另外返回补 ID 的 `source`、拟写 `registryText` 和 `routeChange`。`registryBaseline` 是原始登记的 SHA-256，文件缺失时为 null；`registryPath` 固定为 `content-routes.yaml`。prepare 只准备结果，实际多文件写入及恢复由 Studio 保存模块协调。首次补 ID 且 URL 不变时，changed 为 false。

trash 返回 `contentId/currentPath/source/registryText/registryBaseline/issues`，为回收文章准备路径占用标记。`source` 保持原文，缺失登记时 `registryText` 可为 null。实际归档、文件移除、草稿和中断恢复由 Studio 的回收站与保存日志协调。
