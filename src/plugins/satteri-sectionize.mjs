function groupIntoSections(children) {
	const grouped = [];
	const sections = [];
	for (const child of children) {
		if (child.type === "heading") {
			while (sections.length && sections.at(-1).depth >= child.depth) {
				sections.pop();
			}
			const section = {
				type: "section",
				data: { hName: "section" },
				children: [child],
			};
			const siblings = sections.at(-1)?.node.children ?? grouped;
			siblings.push(section);
			sections.push({ depth: child.depth, node: section });
		} else {
			const siblings = sections.at(-1)?.node.children ?? grouped;
			siblings.push(child);
		}
	}
	return grouped;
}

export function satteriSectionize() {
	const groupedParents = new WeakSet();
	return {
		name: "fangyuan-sectionize",
		heading(node, context) {
			const parent = context.parent(node);
			if (!parent || groupedParents.has(parent)) return;
			groupedParents.add(parent);
			context.setField(parent, "children", groupIntoSections(parent.children));
		},
	};
}
