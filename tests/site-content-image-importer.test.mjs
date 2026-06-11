import assert from "node:assert/strict";
import test from "node:test";

import { normalizeAstroContentImageImporterQuery } from "../src/utils/site-source/content-image-importer.ts";

test("normalizes Windows drive importer queries in Astro content asset modules", () => {
	const input =
		'import image from "assets/wp-content/uploads/2016/05/Installer_1.jpg?astroContentImageFlag=&importer=E%3A%2FProject%2FActivate%2Fx-item.com%2Fcontent%2Fposts%2FPE%20%E5%88%B6%E4%BD%9C.md";';

	const output = normalizeAstroContentImageImporterQuery(input);

	assert.doesNotMatch(output, /[?&]importer=E%3A/i);
	assert.match(
		output,
		/[?&]importer=file%3A%2F%2F%2FE%3A%2FProject%2FActivate%2Fx-item\.com%2Fcontent%2Fposts%2FPE%2520%25E5%2588%25B6%25E4%25BD%259C\.md/,
	);
});

test("leaves non-Windows and file URL importer queries unchanged", () => {
	const fileUrlImporter =
		"assets/image.jpg?astroContentImageFlag=&importer=file%3A%2F%2F%2FE%3A%2FProject%2Fpost.md";
	const relativeImporter =
		"assets/image.jpg?astroContentImageFlag=&importer=src%2Fcontent%2Fposts%2Fpost.md";

	assert.equal(
		normalizeAstroContentImageImporterQuery(fileUrlImporter),
		fileUrlImporter,
	);
	assert.equal(
		normalizeAstroContentImageImporterQuery(relativeImporter),
		relativeImporter,
	);
});
