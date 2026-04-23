import { SKIP, visit } from "unist-util-visit";

function normalizeTone(rawTone) {
	const tone = String(rawTone ?? "")
		.trim()
		.toLowerCase();
	return ["note", "tip", "important", "warning", "caution"].includes(tone)
		? tone
		: "note";
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
	if (rawValue == null) {
		return false;
	}

	const normalized = String(rawValue ?? "")
		.trim()
		.toLowerCase();
	return ["", "true", "1", "yes", "on", "open"].includes(normalized);
}

function escapeHtml(value) {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function html(value) {
	return {
		type: "html",
		value,
	};
}

export function remarkExpressiveMarkdown() {
	return (tree) => {
		let foldIndex = 0;

		visit(tree, (node, index, parent) => {
			if (parent == null || index == null) {
				return;
			}

			if (node.type === "textDirective" && node.name === "hl") {
				const tone = normalizeTone(node.attributes?.tone);
				const replacement = [
					html(`<mark class="md-highlight tone-${tone}" data-tone="${tone}">`),
					...(node.children ?? []),
					html("</mark>"),
				];
				parent.children.splice(index, 1, ...replacement);
				return [SKIP, index + replacement.length];
			}

			if (node.type === "containerDirective" && node.name === "aside") {
				const replacement = [
					html('<aside class="md-aside">'),
					...(node.children ?? []),
					html("</aside>"),
				];
				parent.children.splice(index, 1, ...replacement);
				return [SKIP, index + replacement.length];
			}

			if (node.type === "containerDirective" && node.name === "fold") {
				const title = escapeHtml(node.attributes?.title || "Details");
				const icon = normalizeFoldIcon(node.attributes?.icon);
				const isOpen = isTruthyAttribute(node.attributes?.open);
				foldIndex += 1;
				const foldId = `md-fold-${foldIndex}`;
				const checkedAttr = isOpen ? ' checked="checked"' : "";
				const replacement = [
					html(
						`<div class="md-fold" data-icon="${icon}" data-open="${isOpen ? "true" : "false"}"><input class="md-fold-toggle" type="checkbox" id="${foldId}"${checkedAttr}><label class="md-fold-summary" for="${foldId}">${title}</label><div class="md-fold-body"><div class="md-fold-body-inner">`,
					),
					...(node.children ?? []),
					html("</div></div></div>"),
				];
				parent.children.splice(index, 1, ...replacement);
				return [SKIP, index + replacement.length];
			}
		});
	};
}
