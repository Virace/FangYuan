import { h } from "hastscript";

/**
 * 为 Markdown 渲染出的独立 table 自动包裹横向滚动容器，
 * 既保护窄屏不破版，也让圆角 1px 光学边框在横滚时保持完整。
 */
export const satteriTableWrap = {
	name: "fangyuan-table-wrap",
	element: {
		filter: ["table"],
		visit(node, context) {
			const parent = context.parent(node);
			const parentClasses = parent?.properties?.className;
			if (
				parent?.type === "element" &&
				Array.isArray(parentClasses) &&
				parentClasses.includes("md-table-scroll")
			) {
				return;
			}
			context.replaceNode(node, h("div", { class: "md-table-scroll" }, [node]));
		},
	},
};

function hasClassName(node, targetClass) {
	const raw = node?.properties?.className ?? node?.properties?.class;
	if (Array.isArray(raw)) return raw.includes(targetClass);
	if (typeof raw === "string") return raw.split(/\s+/).includes(targetClass);
	return false;
}

/**
 * 为 GFM 任务列表生成的只读复选框补充可访问名称，
 * 满足 WCAG 表单控件标签约束，不影响现有展示结构。
 */
export const satteriTaskListLabels = {
	name: "fangyuan-task-list-aria-labels",
	element: {
		filter: ["input"],
		visit(node, context) {
			if (node.properties?.type !== "checkbox") return;
			if (
				node.properties["aria-label"] ||
				node.properties.ariaLabel ||
				node.properties["aria-labelledby"] ||
				node.properties.ariaLabelledBy
			) {
				return;
			}
			const parent = context.parent(node);
			if (
				parent?.type !== "element" ||
				!hasClassName(parent, "task-list-item")
			) {
				return;
			}

			const itemText = context.textContent(parent).trim();
			const fallbackLabel = node.properties.checked
				? "已完成任务"
				: "未完成任务";
			context.replaceNode(node, {
				...node,
				properties: {
					...node.properties,
					"aria-label": itemText || fallbackLabel,
				},
			});
		},
	},
};
