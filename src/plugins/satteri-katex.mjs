import katex from "katex";
import { htmlToHast } from "satteri";

export const satteriKatex = {
	name: "fangyuan-katex",
	element: {
		filter: ["code"],
		visit(node, context) {
			const classes = node.properties.className ?? [];
			const languageMath = classes.includes("language-math");
			const mathDisplay = classes.includes("math-display");
			const mathInline = classes.includes("math-inline");
			if (!languageMath && !mathDisplay && !mathInline) return;
			const parent = context.parent(node);
			const isMathBlock =
				languageMath && parent?.type === "element" && parent.tagName === "pre";
			const scope = isMathBlock ? parent : node;
			const value = context.textContent(scope);
			const displayMode = isMathBlock || mathDisplay;
			let html;
			try {
				html = katex.renderToString(value, { displayMode, throwOnError: true });
			} catch (error) {
				context.report({
					message: `Could not render math with KaTeX: ${error.message}`,
					node,
					severity: "warning",
				});
				html = katex.renderToString(value, {
					displayMode,
					strict: "ignore",
					throwOnError: false,
				});
			}
			const rendered = htmlToHast(html, { fragment: true });
			context.replaceNode(scope, rendered.children);
		},
	},
};
