import { h } from "hastscript";

const admonitionTypes = new Set([
	"NOTE",
	"TIP",
	"IMPORTANT",
	"WARNING",
	"CAUTION",
]);

function normalizeTone(rawTone) {
	const tone = String(rawTone ?? "")
		.trim()
		.toLowerCase();
	return admonitionTypes.has(tone.toUpperCase()) ? tone : "note";
}

function normalizeFoldIcon(rawIcon) {
	const icon = String(rawIcon ?? "")
		.trim()
		.toLowerCase();
	const aliases = {
		"": "file",
		default: "file",
		document: "file",
		info: "note",
		help: "question",
		star: "sparkles",
		lightbulb: "tip",
		hidden: "none",
		false: "none",
	};
	const normalized = aliases[icon] ?? icon;
	return [
		"file",
		"note",
		"tip",
		"warning",
		"question",
		"bookmark",
		"sparkles",
		"none",
	].includes(normalized)
		? normalized
		: "file";
}

function isTruthyAttribute(rawValue) {
	if (rawValue == null) return false;
	return ["", "true", "1", "yes", "on", "open"].includes(
		String(rawValue).trim().toLowerCase(),
	);
}

function parseGithubAdmonition(node) {
	const [firstParagraph, ...remainingBlocks] = node.children;
	if (firstParagraph?.type !== "paragraph") return null;
	const [firstText, ...remainingInline] = firstParagraph.children;
	if (firstText?.type !== "text") return null;
	const [declaration, ...remainingLines] = firstText.value.split("\n");
	const type = declaration.match(/^\s*\[!(\w+)\]\s*$/)?.[1];
	if (!admonitionTypes.has(type)) return null;
	const paragraphChildren = [
		...(remainingLines.length
			? [{ type: "text", value: remainingLines.join("\n") }]
			: []),
		...remainingInline,
	];
	return {
		type: "containerDirective",
		name: type.toLowerCase(),
		children: [
			...(paragraphChildren.length
				? [{ type: "paragraph", children: paragraphChildren }]
				: []),
			...remainingBlocks,
		],
	};
}

export function satteriDirectives() {
	let foldIndex = 0;
	function getDirectiveData(node) {
		const element = h(node.name, node.attributes ?? {});
		if (node.type === "textDirective" && node.name === "hl") {
			const tone = normalizeTone(node.attributes?.tone);
			return {
				...node.data,
				hName: "mark",
				hProperties: {
					className: ["md-highlight", `tone-${tone}`],
					"data-tone": tone,
				},
			};
		}
		if (node.type === "containerDirective" && node.name === "aside") {
			return {
				...node.data,
				hName: "aside",
				hProperties: { className: ["md-aside"] },
			};
		}
		if (node.type === "containerDirective" && node.name === "fold") {
			foldIndex += 1;
			return {
				...node.data,
				hName: "fangyuan-fold",
				hProperties: {
					id: `md-fold-${foldIndex}`,
					title: node.attributes?.title || "Details",
					icon: normalizeFoldIcon(node.attributes?.icon),
					open: isTruthyAttribute(node.attributes?.open),
				},
			};
		}
		return {
			...node.data,
			hName: element.tagName,
			hProperties: element.properties,
		};
	}
	function visitDirective(node, context) {
		context.setField(node, "data", getDirectiveData(node));
	}
	return {
		name: "fangyuan-directives",
		blockquote(node) {
			const directive = parseGithubAdmonition(node);
			if (directive) {
				return { ...directive, data: getDirectiveData(directive) };
			}
		},
		containerDirective: visitDirective,
		leafDirective: visitDirective,
		textDirective: visitDirective,
	};
}

function renderFold(properties, children) {
	return h(
		"div",
		{
			class: "md-fold",
			"data-icon": properties.icon,
			"data-open": properties.open ? "true" : "false",
		},
		[
			h("input", {
				class: "md-fold-toggle",
				type: "checkbox",
				id: properties.id,
				checked: Boolean(properties.open),
			}),
			h(
				"label",
				{ class: "md-fold-summary", for: properties.id },
				properties.title,
			),
			h("div", { class: "md-fold-body" }, [
				h("div", { class: "md-fold-body-inner" }, children),
			]),
		],
	);
}

export function satteriComponents(components) {
	const renderers = { ...components, "fangyuan-fold": renderFold };
	return {
		name: "fangyuan-directive-components",
		element: {
			filter: Object.keys(renderers),
			visit(node, context) {
				const result = renderers[node.tagName](
					node.properties,
					node.children,
					context,
				);
				context.replaceNode(node, result ?? []);
			},
		},
	};
}
