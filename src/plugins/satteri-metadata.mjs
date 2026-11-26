import { toString as mdastToString } from "mdast-util-to-string";
import getReadingTime from "reading-time";

export const satteriMetadata = {
	name: "fangyuan-content-metadata",
	before(root, context) {
		// 保留代码块、数学和图片 alt 的既有字数语义，先于展示节点转换计算。
		const readingTime = getReadingTime(mdastToString(root));
		const firstParagraph = root.children.find(
			(node) => node.type === "paragraph",
		);
		Object.assign(context.data.astro.frontmatter, {
			minutes: Math.max(1, Math.round(readingTime.minutes)),
			words: readingTime.words,
			excerpt: firstParagraph ? mdastToString(firstParagraph) : "",
		});
	},
};
