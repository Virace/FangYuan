import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
	transformEntryToPreview,
	transformWxrToPreview,
} from "../scripts/wordpress-wxr-transform-core.js";
import {
	parseTransformCliArgs,
	runWordpressTransformCli,
} from "../scripts/wordpress-wxr-transform.js";
import { buildSampleWxr, SAMPLE_WXR } from "./test-helpers/wordpress-wxr-fixture.mjs";

test("transformEntryToPreview keeps draft id fallback and title suffix", () => {
	const result = transformEntryToPreview(
		{
			legacyId: "99",
			legacyType: "post",
			title: "Draft Only",
			link: "https://example.com/?p=99",
			postName: "",
			author: "Virace",
			sourceStatus: "draft",
			excerpt: "Short",
			contentHtml: "<p>Hello</p>",
			published: new Date("2024-04-21T12:00:00.000Z"),
			updated: new Date("2024-04-21T12:00:00.000Z"),
			categories: [],
			tags: [],
		},
		{ pathMode: "flat", detectLinkPattern: true },
	);

	assert.equal(result.title, "Draft Only-草稿");
	assert.equal(result.alias, "99");
	assert.match(result.markdown, /alias: "99"/);
});

test("transformWxrToPreview renders first-batch semantics into markdown placeholders", () => {
	const source = buildSampleWxr({
		postDate: "2024-04-21 20:00:00",
		postDateGmt: "2024-04-20 12:00:00",
		postModified: "2024-04-22 09:30:00",
		postModifiedGmt: "2024-04-19 01:30:00",
		commentStatus: "closed",
		postPassword: "secret",
		content: [
			'<p class="has-very-light-gray-background-color has-background">Lead in</p>',
			'<!-- wp:paragraph {"backgroundColor":"pale-cyan-blue"} --><p class="has-pale-cyan-blue-background-color has-background">Tip body</p><!-- /wp:paragraph -->',
			'<!-- wp:paragraph {"textColor":"cyan-bluish-gray","fontSize":"small"} --><p class="has-text-color has-small-font-size has-cyan-bluish-gray-color">PS: Aside copy.</p><!-- /wp:paragraph -->',
			'<span style="color: #008080;">Hint</span>',
			'<!-- wp:code {"className":"shell"} --><pre class="wp-block-code shell"><code>echo 1;</code></pre><!-- /wp:code -->',
			'<!-- wp:verse --><pre class="wp-block-verse">line 1\nline 2</pre><!-- /wp:verse -->',
			'[cr_alert style="red"]Alert[/cr_alert]',
			'[cr_toggle title="Fold me" state="closed"]Body[/cr_toggle]',
			'[bilibili]BV1xx411c7mD[/bilibili]',
			'[music id="123456"/]',
			'<script src="https://gist.github.com/Virace/f6036bfd2baa8129ec6b142230b10924.js"></script>',
			'<!-- wp:buttons {"align":"center"} --><div class="wp-block-buttons aligncenter"><div class="wp-block-button is-style-outline"><a class="wp-block-button__link" href="https://example.com/x86.dll">x86.dll</a></div></div><!-- /wp:buttons -->',
			'<img class="aligncenter" src="https://example.com/image.png" alt="Demo" />',
		].join(""),
	});

	const result = transformWxrToPreview(source, {
		contentTypes: ["post"],
		pathMode: "flat",
		detectLinkPattern: true,
	});
	const entry = result.entries[0];

	assert.match(entry.markdown, /^> Lead in/m);
	assert.match(entry.markdown, /:::tip[\s\S]*Tip body[\s\S]*:::/m);
	assert.match(entry.markdown, /:::aside[\s\S]*PS: Aside copy\.[\s\S]*:::/m);
	assert.match(entry.markdown, /:hl\[Hint\]\{tone="note"\}/);
	assert.match(entry.markdown, /```shell[\s\S]*echo 1;[\s\S]*```/m);
	assert.match(entry.markdown, /^> line 1/m);
	assert.match(entry.markdown, /:::warning[\s\S]*Alert[\s\S]*:::/m);
	assert.match(entry.markdown, /:::fold\{title="Fold me"\}/);
	assert.match(entry.markdown, /player\.bilibili\.com\/player\.html\?bvid=BV1xx411c7mD/);
	assert.doesNotMatch(entry.markdown, /music id/);
	assert.match(entry.markdown, /\[Gist\]\(https:\/\/gist\.github\.com\/Virace\/f6036bfd2baa8129ec6b142230b10924\)/);
	assert.match(entry.markdown, /- \[x86\.dll\]\(https:\/\/example\.com\/x86\.dll\)/);
	assert.match(entry.markdown, /!\[Demo\]\(https:\/\/example\.com\/image\.png\)/);
	assert.doesNotMatch(entry.markdown, /<figure/);
	assert.match(
		entry.markdown,
		new RegExp(
			`published: ${new Date("2024-04-21T20:00:00").toISOString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
		),
	);
	assert.match(
		entry.markdown,
		new RegExp(
			`updated: ${new Date("2024-04-22T09:30:00").toISOString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
		),
	);
	assert.match(entry.markdown, /commentStatus: "closed"/);
	assert.match(entry.markdown, /password: "secret"/);
	assert.equal(entry.notes[0].kind, "music-shortcode-removed");
	assert.equal(entry.notes[1].kind, "image-alignment-dropped");
});

test("parseTransformCliArgs reads transform-preview arguments", () => {
	const parsed = parseTransformCliArgs([
		"--input",
		"sample.xml",
		"--output",
		"out",
		"--content-types",
		"post,page",
		"--path-mode",
		"date-tree",
		"--use-gmt-dates",
		"true",
		"--detect-link-pattern",
		"false",
	]);

	assert.equal(parsed.inputPath, "sample.xml");
	assert.equal(parsed.outputDir, "out");
	assert.deepEqual(parsed.contentTypes, ["post", "page"]);
	assert.equal(parsed.pathMode, "date-tree");
	assert.equal(parsed.useGmtDates, true);
	assert.equal(parsed.detectLinkPattern, false);
});

test("transformWxrToPreview can switch published timestamps to gmt fields", () => {
	const source = buildSampleWxr({
		postDate: "2024-04-21 20:00:00",
		postDateGmt: "2024-04-20 12:00:00",
		postModified: "2024-04-22 09:30:00",
		postModifiedGmt: "2024-04-19 01:30:00",
	});

	const result = transformWxrToPreview(source, {
		contentTypes: ["post"],
		useGmtDates: true,
	});
	const entry = result.entries[0];

	assert.match(
		entry.markdown,
		/published: 2024-04-20T12:00:00\.000Z/,
	);
	assert.match(
		entry.markdown,
		/updated: 2024-04-19T01:30:00\.000Z/,
	);
});

test("transformWxrToPreview applies extracted user block rules", () => {
	const source = buildSampleWxr({
		content: [
			'<!-- wp:kratos/alert {"theme":"danger"} --><div><p>Danger body</p></div><!-- /wp:kratos/alert -->',
			'<!-- wp:kratos/accordion {"title":"Hidden"} --><div><h4>Hidden</h4><p>Fold body</p></div><!-- /wp:kratos/accordion -->',
			'<!-- wp:tadv/classic-paragraph /-->',
			'<div class="github-card" data-github="Virace/FangYuan"></div>',
			'<script src="//cdn.jsdelivr.net/github-cards/latest/widget.js"></script>',
		].join(""),
	});

	const result = transformWxrToPreview(source, {
		contentTypes: ["post"],
	});
	const entry = result.entries[0];

	assert.match(entry.markdown, /:::warning[\s\S]*Danger body[\s\S]*:::/m);
	assert.match(entry.markdown, /:::fold\{title="Hidden"\}/);
	assert.match(entry.markdown, /::github\{repo="Virace\/FangYuan"\}/);
	assert.doesNotMatch(entry.markdown, /tadv\/classic-paragraph/);
	assert.doesNotMatch(entry.markdown, /github-cards\/latest\/widget\.js/);
});

test('transformWxrToPreview keeps post_format out of category frontmatter', () => {
	const source = buildSampleWxr({
		title: "Electron-Vue，踩坑之版本升级",
		postName: "electron-upgrade",
		category: "闲聊扯皮",
		tag: "npm",
	}).replace(
		[
			'<category domain="category" nicename="notes"><![CDATA[闲聊扯皮]]></category>',
			'<category domain="post_tag" nicename="audit"><![CDATA[npm]]></category>',
		].join("\n\t\t\t"),
		[
			'<category domain="post_tag" nicename="npm"><![CDATA[npm]]></category>',
			'<category domain="post_tag" nicename="yarn"><![CDATA[yarn]]></category>',
			'<category domain="post_format" nicename="post-format-image"><![CDATA[图片]]></category>',
			'<category domain="category" nicename="default"><![CDATA[闲聊扯皮]]></category>',
		].join("\n\t\t\t"),
	);

	const result = transformWxrToPreview(source, {
		contentTypes: ["post"],
		pathMode: "flat",
	});
	const entry = result.entries[0];

	assert.match(entry.markdown, /category: "闲聊扯皮"/);
	assert.doesNotMatch(entry.markdown, /category: "图片"/);
	assert.match(entry.markdown, /tags:\n  - "npm"\n  - "yarn"/);
});

test("transformEntryToPreview decodes percent-encoded alias and file name", () => {
	const entry = transformEntryToPreview(
		{
			legacyId: "2400",
			legacyType: "post",
			title: "iZotope RX 8问题记录",
			link: "https://example.com/izotope-rx-8%e9%97%ae%e9%a2%98%e8%ae%b0%e5%bd%95.html",
			postName: "izotope-rx-8%e9%97%ae%e9%a2%98%e8%ae%b0%e5%bd%95",
			author: "Virace",
			sourceStatus: "publish",
			excerpt: "",
			contentHtml: "<p>Hello</p>",
			published: new Date("2024-04-21T12:00:00.000Z"),
			updated: new Date("2024-04-21T12:00:00.000Z"),
			categories: [],
			tags: [],
			commentStatus: "open",
			postPassword: "",
		},
		{
			pathMode: "flat",
			wpPermalinkTemplate: "/%postname%.html",
			detectLinkPattern: true,
		},
	);

	assert.equal(entry.alias, "izotope-rx-8问题记录");
	assert.equal(entry.candidateRelativePath, "posts/izotope-rx-8问题记录.md");
	assert.match(entry.markdown, /alias: "izotope-rx-8问题记录"/);
});

test("runWordpressTransformCli writes preview markdown files and summary", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-wxr-transform-"));
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	const inputPath = path.join(tempRoot, "sample.xml");
	const outputPath = path.join(tempRoot, "preview");
	await writeFile(inputPath, SAMPLE_WXR, "utf8");

	const result = await runWordpressTransformCli(
		[
			"--input",
			inputPath,
			"--output",
			outputPath,
			"--content-types",
			"post",
			"--path-mode",
			"flat",
		],
		{ cwd: tempRoot },
	);

	assert.equal(result.entries.length, 1);
	assert.match(
		await readFile(path.join(outputPath, "posts", "hello-world.md"), "utf8"),
		/title: "Hello World"/,
	);
	assert.match(
		await readFile(path.join(outputPath, "transform-summary.json"), "utf8"),
		/"entryCount": 1/,
	);
});
