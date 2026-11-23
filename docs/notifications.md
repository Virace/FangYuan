# 全局通知

点赞、评论提交、投票及加载错误通过固定浮层反馈，不改变文章、版权或表单高度。字段校验和验证码纠错仍在输入位置显示；点赞成功只更新按钮与计数，并播放一次 SVG 图标周围的小礼花。

## 调用

从 `src/utils/browser/notifications.ts` 导入公共入口。异步操作开始前捕获页面作用域，避免换页后的旧结果进入新页面：

```ts
import { getPageNoticeScope, showNotice } from "@utils/browser/notifications";

const scope = getPageNoticeScope();

try {
	await submitAction();
} catch {
	showNotice({
		message: "操作失败，请稍后重试。",
		tone: "error",
		priority: "important",
		durationMs: 10_000,
		scope,
		key: "submit-failed",
	});
}
```

`message` 是主提示，`description` 是可选补充说明，均只接收纯文本。`tone` 支持 `success`、`info`、`warning`、`error`；`priority` 支持 `normal`、`important`。类型决定语义色，优先级决定容量不足时是否可以让位。

同一作用域内尚存的相同 `key` 合并为一条，不重复弹出或重置停留时间。调用返回消息 ID；`dismissNotice(id)` 可主动关闭。调用入口不依赖通知宿主已加载，晚订阅会取得完整当前快照。

## 布局与时间

- `siteConfig.notifications.position` 决定顶部或底部基准，默认 `top`，位于导航栏下方并保留 16px 间距；`bottom` 距视口底部至少 48px，并在可见页脚上方留 16px。桌面靠右，窄屏水平居中。
- `siteConfig.notifications.newestOnTop` 独立决定新消息在已有消息上方（`true`）还是下方（默认 `false`）。固定的是队列边缘槽位；消息移除后向基准补位。最多可见 10 条，导航栏、可见页脚和软键盘共同限定可用高度，空间不足则排队。
- 根据主提示和说明实际排版后的总行数决定对齐：一至两行时图标和关闭按钮居中，超过两行顶部对齐。宽度、字体或内容尺寸变化后重新测量。
- 图钉固定在重要通知卡片左上角，不占文字布局。不显示常驻剩余时间或“重要”文字。
- 深浅色与主题色来自站点变量；错误、警告、成功保留语义色。关闭按钮提供悬停与按压反馈，减少动态偏好取消滑移和旋转。
- 通知浮层覆盖其他浮动控件，不为通知移动“返回顶部”按钮；发生重叠时由通知接收点击，消息退出后露出原控件。
- 新消息先定位到目标槽位，再从右侧滑入并淡入，退出时向右淡出；已有消息的上下让位由外层定位独立处理，不把上下排列方向作为入场方向。
- 等待脚本、排队及入场期间不消耗停留时间；悬停、键盘焦点和页面隐藏时暂停。`durationMs: 0` 表示手动关闭。
- 满额时选择最早且未被悬停或聚焦的普通通知退出；重要消息保留完整可读时间。全部受保护时新消息排队，不覆盖；退出中的消息仍计入可见容量。
- 窄屏收缩时暂时放不下的消息回队，保留剩余时间。超长正文在卡片文本区域内滚动，图钉与关闭按钮始终可见。

外部站点可在 `site.config.yaml` 中分别设置基准和顺序，未填写的字段继续使用默认值：

```yaml
siteConfig:
  notifications:
    position: top
    newestOnTop: false
```

| 基准 | newestOnTop | 新增时的行为 |
| --- | --- | --- |
| top | false | 旧消息留在顶部，新消息向下追加 |
| top | true | 新消息占顶部槽位，旧消息向下让位 |
| bottom | true | 旧消息留在底部，新消息向上追加 |
| bottom | false | 新消息占底部槽位，旧消息向上让位 |

## 公告复用边界

全站公告可使用 `scope: "site"`、`icon: "announcement"`、稳定 `key`，以及显式时长和优先级；文章公告使用捕获的页面作用域。Swup 实际内容替换时清理旧页消息，全站消息保留。导航失败或取消、未替换内容时不推进代次。

本次提供发布与呈现能力；公告数据源、站点配置、frontmatter 和已读记录需在对应功能接入时实现。

## 验证入口

- `pnpm test`：覆盖晚挂载、优先让位、全保护排队、暂停计时、跨页隔离、视口回队和 10 条容量。
- `pnpm test:e2e`：默认内部 demo 的核心导航、可访问性、交互和打赏回归。
- `pnpm test:e2e:qingyan`：显式开启测试用 QingYan 的独立内部构建，复用现有 fetch mock；覆盖全局通知、评论、验证码和投票。与默认构建串行执行，均使用 4331 预览端口，不访问真实 QingYan。

宿主位于 `Layout.astro` 页面插槽之外。关键样式在 `src/styles/notices.css`，通过全局入口导入；调度模型不依赖 Svelte 或 DOM。
