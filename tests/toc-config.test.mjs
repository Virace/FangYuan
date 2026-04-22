import assert from "node:assert/strict";
import test from "node:test";

import { resolveTocConfig } from "../src/utils/toc-config.ts";

test("post pages default to toc enabled when global switch is on", () => {
	const resolved = resolveTocConfig({
		pageKind: "post",
		siteToc: { enable: true, depth: 2 },
		headingsCount: 3,
	});

	assert.deepEqual(resolved, { enable: true, depth: 2 });
});

test("spec pages default to toc disabled even when global switch is on", () => {
	const resolved = resolveTocConfig({
		pageKind: "spec",
		siteToc: { enable: true, depth: 2 },
		headingsCount: 3,
	});

	assert.deepEqual(resolved, { enable: false, depth: 2 });
});

test("frontmatter can enable toc for spec pages and override depth", () => {
	const resolved = resolveTocConfig({
		pageKind: "spec",
		siteToc: { enable: true, depth: 2 },
		headingsCount: 3,
		frontmatterToc: { enable: true, depth: 3 },
	});

	assert.deepEqual(resolved, { enable: true, depth: 3 });
});

test("global hard switch disables toc even when frontmatter enables it", () => {
	const resolved = resolveTocConfig({
		pageKind: "spec",
		siteToc: { enable: false, depth: 2 },
		headingsCount: 3,
		frontmatterToc: { enable: true, depth: 3 },
	});

	assert.deepEqual(resolved, { enable: false, depth: 3 });
});

test("pages with zero headings never resolve to enabled toc", () => {
	const resolved = resolveTocConfig({
		pageKind: "post",
		siteToc: { enable: true, depth: 2 },
		headingsCount: 0,
	});

	assert.deepEqual(resolved, { enable: false, depth: 2 });
});
