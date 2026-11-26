export const satteriSmartDashes = {
	name: "fangyuan-smart-dashes",
	text(node, context) {
		// 既有 SmartyPants 默认仅把两个连字符转为 em dash，保留其他长度。
		const value = node.value.replace(/-{2,}/g, (dashes) =>
			dashes === "--" ? "—" : dashes,
		);
		if (value !== node.value) context.setField(node, "value", value);
	},
};
