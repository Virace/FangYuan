import assert from "node:assert/strict";
import test from "node:test";

const loadModule = async () => {
	try {
		return await import(new URL("../src/utils/browser/swup-a11y.ts", import.meta.url));
	} catch {
		return null;
	}
};

const createRoot = (element) => ({
	querySelector(selector) {
		assert.equal(selector, "[data-swup-announcement]");
		return element ?? null;
	},
});

test("prefers canonical swup announcement over document title", async () => {
	const module = await loadModule();
	assert.ok(
		module?.resolveSwupAnnouncementText,
		"resolveSwupAnnouncementText should exist",
	);

	const element = {
		getAttribute(name) {
			return name === "data-swup-announcement" ? "Article Title" : null;
		},
		textContent: "Ignored title",
	};

	assert.equal(
		module.resolveSwupAnnouncementText(
			createRoot(element),
			"Article Title - FangYuan",
		),
		"Article Title",
	);
});

test("falls back to document title when no canonical announcement is present", async () => {
	const module = await loadModule();
	assert.ok(
		module?.resolveSwupAnnouncementText,
		"resolveSwupAnnouncementText should exist",
	);

	const element = {
		getAttribute() {
			return null;
		},
		textContent: "   ",
	};

	assert.equal(
		module.resolveSwupAnnouncementText(createRoot(element), "Archive - FangYuan"),
		"Archive - FangYuan",
	);
});

test("returns undefined when neither canonical nor document title is usable", async () => {
	const module = await loadModule();
	assert.ok(
		module?.resolveSwupAnnouncementText,
		"resolveSwupAnnouncementText should exist",
	);

	assert.equal(module.resolveSwupAnnouncementText(createRoot(null), "   "), undefined);
});
