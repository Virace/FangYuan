import { h } from "hastscript";

export const satteriHeadingAnchors = {
	name: "fangyuan-heading-anchors",
	element: {
		filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
		visit(node, context) {
			const id = node.properties.id;
			if (!id) return;
			context.appendChild(
				node,
				h("a", { class: "anchor", href: `#${id}` }, [
					h(
						"span",
						{ class: "anchor-icon", "data-pagefind-ignore": true },
						"#",
					),
				]),
			);
		},
	},
};
