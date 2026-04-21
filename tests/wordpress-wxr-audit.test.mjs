import assert from "node:assert/strict";
import test from "node:test";

import {
	buildAuditReport,
	extractWxrEntries,
	resolvePermalinkAudit,
} from "../scripts/wordpress-wxr-audit-core.js";
import {
	SAMPLE_WXR,
	buildSampleWxr,
} from "./test-helpers/wordpress-wxr-fixture.mjs";

test("extractWxrEntries keeps post metadata and content payloads", () => {
	const entries = extractWxrEntries(SAMPLE_WXR, new Set(["post"]));

	assert.equal(entries.length, 1);
	assert.equal(entries[0].legacyId, "7");
	assert.equal(entries[0].legacyType, "post");
	assert.equal(entries[0].title, "Hello World");
	assert.equal(entries[0].author, "Virace");
	assert.equal(entries[0].categories[0], "Notes");
	assert.equal(entries[0].tags[0], "audit");
	assert.equal(entries[0].contentHtml, "<p>Hello</p>");
	assert.equal(entries[0].commentStatus, "open");
	assert.equal(entries[0].postPassword, "");
});

test('extractWxrEntries only uses domain="category" values as categories', () => {
	const source = buildSampleWxr({
		category: "闲聊扯皮",
		tag: "npm",
	}).replace(
		'<category domain="post_tag" nicename="audit"><![CDATA[npm]]></category>',
		[
			'<category domain="post_tag" nicename="npm"><![CDATA[npm]]></category>',
			'<category domain="post_tag" nicename="yarn"><![CDATA[yarn]]></category>',
			'<category domain="post_format" nicename="post-format-image"><![CDATA[图片]]></category>',
		].join("\n\t\t\t"),
	);

	const entries = extractWxrEntries(source, new Set(["post"]));

	assert.deepEqual(entries[0].categories, ["闲聊扯皮"]);
	assert.deepEqual(entries[0].tags, ["npm", "yarn"]);
});

test("extractWxrEntries prefers non-gmt wordpress timestamps by default", () => {
	const entries = extractWxrEntries(
		buildSampleWxr({
			postDate: "2024-04-21 20:00:00",
			postDateGmt: "2024-04-21 12:00:00",
			postModified: "2024-04-22 09:30:00",
			postModifiedGmt: "2024-04-22 01:30:00",
			commentStatus: "closed",
			postPassword: "secret",
		}),
		new Set(["post"]),
	);

	assert.equal(
		entries[0].published.toISOString(),
		new Date("2024-04-21T20:00:00").toISOString(),
	);
	assert.equal(
		entries[0].updated.toISOString(),
		new Date("2024-04-22T09:30:00").toISOString(),
	);
	assert.equal(entries[0].commentStatus, "closed");
	assert.equal(entries[0].postPassword, "secret");
});

test("extractWxrEntries can prefer gmt wordpress timestamps when requested", () => {
	const entries = extractWxrEntries(
		buildSampleWxr({
			postDate: "2024-04-21 20:00:00",
			postDateGmt: "2024-04-21 12:00:00",
			postModified: "2024-04-22 09:30:00",
			postModifiedGmt: "2024-04-22 01:30:00",
		}),
		new Set(["post"]),
		{ useGmtDates: true },
	);

	assert.equal(entries[0].published.toISOString(), "2024-04-21T12:00:00.000Z");
	assert.equal(entries[0].updated.toISOString(), "2024-04-22T01:30:00.000Z");
});

test("resolvePermalinkAudit recognizes strict template matches", () => {
	const result = resolvePermalinkAudit({
		legacyType: "post",
		link: "https://example.com/2024/04/21/hello-world/",
		postName: "hello-world",
		published: new Date("2024-04-21T12:00:00.000Z"),
		wpPermalinkTemplate: "/%year%/%monthnum%/%day%/%postname%/",
		detectLinkPattern: true,
	});

	assert.equal(result.alias, "hello-world");
	assert.equal(
		result.permalinkPatternDetected,
		"/%year%/%monthnum%/%day%/%postname%/",
	);
	assert.equal(result.aliasRaw, "");
	assert.equal(result.aliasSource, "link");
	assert.equal(result.suggestedAction, "auto-safe");
});

test("resolvePermalinkAudit preserves aliasRaw when no template or known pattern matches", () => {
	const result = resolvePermalinkAudit({
		legacyType: "post",
		link: "https://example.com/archive.php?id=7",
		postName: "hello-world",
		sourceStatus: "publish",
		published: new Date("2024-04-21T12:00:00.000Z"),
		wpPermalinkTemplate: "",
		detectLinkPattern: true,
	});

	assert.equal(result.alias, "");
	assert.equal(result.permalinkCandidate, "");
	assert.equal(result.aliasRaw, "https://example.com/archive.php?id=7");
	assert.equal(result.suggestedAction, "manual-permalink-mapping");
});

test("resolvePermalinkAudit uses post_name for fixed pages without pretty permalinks", () => {
	const result = resolvePermalinkAudit({
		legacyType: "page",
		link: "https://example.com/?page_id=3",
		postName: "privacy-policy",
		sourceStatus: "draft",
		published: new Date("2024-04-21T12:00:00.000Z"),
		wpPermalinkTemplate: "",
		detectLinkPattern: true,
	});

	assert.equal(result.alias, "privacy-policy");
	assert.equal(result.aliasSource, "wp:post_name");
	assert.equal(result.aliasRaw, "");
	assert.equal(result.suggestedAction, "auto-safe");
});

test("resolvePermalinkAudit defers draft query links when slug is still missing", () => {
	const result = resolvePermalinkAudit({
		legacyType: "post",
		link: "https://example.com/?p=2160",
		legacyId: "2160",
		postName: "",
		sourceStatus: "draft",
		published: new Date("2024-04-21T12:00:00.000Z"),
		wpPermalinkTemplate: "",
		detectLinkPattern: true,
	});

	assert.equal(result.alias, "2160");
	assert.equal(result.aliasSource, "wp:post_id");
	assert.equal(result.aliasRaw, "https://example.com/?p=2160");
	assert.equal(result.suggestedAction, "defer");
});

test("resolvePermalinkAudit decodes percent-encoded slug aliases", () => {
	const result = resolvePermalinkAudit({
		legacyType: "post",
		link: "https://example.com/izotope-rx-8%e9%97%ae%e9%a2%98%e8%ae%b0%e5%bd%95.html",
		postName: "izotope-rx-8%e9%97%ae%e9%a2%98%e8%ae%b0%e5%bd%95",
		sourceStatus: "publish",
		wpPermalinkTemplate: "/%postname%.html",
		detectLinkPattern: true,
	});

	assert.equal(result.alias, "izotope-rx-8问题记录");
	assert.equal(result.aliasSource, "link");
});

test("buildAuditReport emits entry metadata before content hits", () => {
	const report = buildAuditReport(SAMPLE_WXR, {
		contentTypes: ["post"],
		pathMode: "flat",
		filenameSource: "title",
		reportFormats: ["json", "md"],
		wpPermalinkTemplate: "/%year%/%monthnum%/%day%/%postname%/",
		detectLinkPattern: true,
		defaultFrontmatter: { lang: "zh_CN" },
	});

	assert.equal(report.entries.length, 1);
	assert.equal(report.records[0].layer, "entry-metadata");
	assert.equal(report.records[0].candidateRelativePath, "posts/hello-world.md");
	assert.equal(report.metadata.defaultFrontmatter.lang, "zh_CN");
});

test("buildAuditReport classifies theme-sensitive blocks and shortcode rule candidates", () => {
	const report = buildAuditReport(
		buildSampleWxr({
			content: [
				'<span class="has-inline-color has-cyan-bluish-gray-color">Alert</span>',
				'<!-- wp:paragraph {"align":"center"} --><p class="has-text-align-center">Center</p><!-- /wp:paragraph -->',
				'[cr_toggle title="Anaconda安装步骤" state="closed"]Body[/cr_toggle]',
			].join(""),
		}),
		{
			contentTypes: ["post"],
			pathMode: "date-tree",
			filenameSource: "title",
			reportFormats: ["json", "md", "csv"],
			wpPermalinkTemplate: "/%year%/%monthnum%/%day%/%postname%/",
			detectLinkPattern: true,
			defaultFrontmatter: {},
		},
	);

	const themeHit = report.records.find(
		(record) =>
			record.layer === "html-tag" &&
			record.subCategory === "text-color",
	);
	const blockHit = report.records.find(
		(record) =>
			record.layer === "wp-block" &&
			record.blockName === "paragraph" &&
			record.subCategory === "alignment",
	);
	const shortcodeHit = report.records.find(
		(record) =>
			record.layer === "shortcode" && record.shortcodeName === "cr_toggle",
	);

	assert.equal(themeHit?.category, "theme-sensitive");
	assert.equal(themeHit?.blocking, true);
	assert.equal(blockHit?.category, "theme-sensitive");
	assert.equal(shortcodeHit?.category, "unsupported");
	assert.equal(shortcodeHit?.suggestedAction, "rule-candidate");
	assert.match(report.summary.markdown, /theme-sensitive/i);
	assert.match(report.summary.markdown, /cr_toggle/);
	assert.match(report.summary.csv, /legacyId,legacyType,title/);
	assert.equal(
		report.records[0].candidateRelativePath,
		"posts/2024/04/21/hello-world.md",
	);
});

test("buildAuditReport upgrades code-like wp blocks into transform-ready categories", () => {
	const report = buildAuditReport(
		buildSampleWxr({
			content: [
				"<!-- wp:code --><pre class=\"wp-block-code\"><code>echo 1;</code></pre><!-- /wp:code -->",
				"<!-- wp:verse --><pre class=\"wp-block-verse\">line 1\nline 2</pre><!-- /wp:verse -->",
				"<!-- wp:preformatted --><pre class=\"EnlighterJSRAW\">const x = 1;</pre><!-- /wp:preformatted -->",
			].join(""),
		}),
		{
			contentTypes: ["post"],
			pathMode: "flat",
			filenameSource: "title",
			reportFormats: ["json", "md"],
			wpPermalinkTemplate: "/%year%/%monthnum%/%day%/%postname%/",
			detectLinkPattern: true,
			defaultFrontmatter: {},
		},
	);

	const codeHit = report.records.find(
		(record) => record.layer === "wp-block" && record.blockName === "code",
	);
	const verseHit = report.records.find(
		(record) => record.layer === "wp-block" && record.blockName === "verse",
	);
	const preformattedHit = report.records.find(
		(record) =>
			record.layer === "wp-block" && record.blockName === "preformatted",
	);

	assert.equal(codeHit?.category, "safe");
	assert.equal(codeHit?.suggestedAction, "auto-safe");
	assert.equal(verseHit?.category, "safe");
	assert.equal(preformattedHit?.category, "safe");
});

test("buildAuditReport ignores faux html inside enlighter code blocks", () => {
	const report = buildAuditReport(
		buildSampleWxr({
			content:
				'<!-- wp:enlighter/codeblock --><pre class="EnlighterJSRAW"><script src="https://example.com/demo.js"></script></pre><!-- /wp:enlighter/codeblock -->',
		}),
		{
			contentTypes: ["post"],
			pathMode: "flat",
			filenameSource: "title",
			reportFormats: ["json", "md"],
			wpPermalinkTemplate: "/%year%/%monthnum%/%day%/%postname%/",
			detectLinkPattern: true,
			defaultFrontmatter: {},
		},
	);

	const enlighterBlockHit = report.records.find(
		(record) =>
			record.layer === "wp-block" &&
			record.blockName === "enlighter/codeblock",
	);
	const scriptTagHit = report.records.find(
		(record) => record.layer === "html-tag" && record.tagName === "script",
	);

	assert.equal(enlighterBlockHit?.category, "safe");
	assert.equal(scriptTagHit, undefined);
});

test("buildAuditReport upgrades simple html and shortcode mappings into transform-ready categories", () => {
	const report = buildAuditReport(
		buildSampleWxr({
			content: [
				"<hr /><cite>ref</cite><s>obsolete</s>",
				"[bilibili]BV1xx411c7mD[/bilibili]",
				'[music id="123456"/]',
				'[cr_alert style="red"]Alert[/cr_alert]',
			].join(""),
		}),
		{
			contentTypes: ["post"],
			pathMode: "flat",
			filenameSource: "title",
			reportFormats: ["json", "md"],
			wpPermalinkTemplate: "/%year%/%monthnum%/%day%/%postname%/",
			detectLinkPattern: true,
			defaultFrontmatter: {},
		},
	);

	const hrHit = report.records.find(
		(record) => record.layer === "html-tag" && record.tagName === "hr",
	);
	const citeHit = report.records.find(
		(record) => record.layer === "html-tag" && record.tagName === "cite",
	);
	const bilibiliHit = report.records.find(
		(record) =>
			record.layer === "shortcode" && record.shortcodeName === "bilibili",
	);
	const musicHit = report.records.find(
		(record) => record.layer === "shortcode" && record.shortcodeName === "music",
	);
	const alertHit = report.records.find(
		(record) =>
			record.layer === "shortcode" && record.shortcodeName === "cr_alert",
	);

	assert.equal(hrHit?.category, "safe");
	assert.equal(citeHit?.category, "safe");
	assert.equal(bilibiliHit?.category, "safe");
	assert.equal(musicHit?.category, "degradeable");
	assert.equal(alertHit?.category, "safe");
});

test("buildAuditReport marks draft fallback titles for later manual cleanup", () => {
	const report = buildAuditReport(
		buildSampleWxr({
			title: "Draft Only",
			link: "https://example.com/?p=99",
			legacyId: "99",
			postName: "",
			status: "draft",
		}),
		{
			contentTypes: ["post"],
			pathMode: "flat",
			filenameSource: "title",
			reportFormats: ["json", "md"],
			wpPermalinkTemplate: "",
			detectLinkPattern: true,
			defaultFrontmatter: {},
		},
	);

	assert.equal(report.entries[0].alias, "99");
	assert.equal(report.entries[0].suggestedAction, "defer");
	assert.equal(report.records[0].candidateTitle, "Draft Only-草稿");
});

test("buildAuditReport reclassifies approved background blocks into transform-ready semantics", () => {
	const report = buildAuditReport(
		buildSampleWxr({
			content: [
				'<p class="has-very-light-gray-background-color has-background">Lead in</p>',
				'<p class="has-cyan-bluish-gray-background-color has-background">Lead out</p>',
				'<!-- wp:paragraph {"backgroundColor":"pale-cyan-blue"} --><p class="has-pale-cyan-blue-background-color has-background">Tip body</p><!-- /wp:paragraph -->',
			].join(""),
		}),
		{
			contentTypes: ["post"],
			pathMode: "flat",
			filenameSource: "title",
			reportFormats: ["json", "md"],
			wpPermalinkTemplate: "/%year%/%monthnum%/%day%/%postname%/",
			detectLinkPattern: true,
			defaultFrontmatter: {},
		},
	);

	const grayLeadHit = report.records.find(
		(record) =>
			record.layer === "html-tag" &&
			record.rawSnippet.includes("has-very-light-gray-background-color"),
	);
	const grayOutroHit = report.records.find(
		(record) =>
			record.layer === "html-tag" &&
			record.rawSnippet.includes("has-cyan-bluish-gray-background-color"),
	);
	const paleTipHtmlHit = report.records.find(
		(record) =>
			record.layer === "html-tag" &&
			record.rawSnippet.includes("has-pale-cyan-blue-background-color"),
	);
	const paleTipBlockHit = report.records.find(
		(record) =>
			record.layer === "wp-block" &&
			record.blockName === "paragraph" &&
			record.rawSnippet.includes('"backgroundColor":"pale-cyan-blue"'),
	);

	assert.equal(grayLeadHit?.category, "safe");
	assert.equal(grayOutroHit?.category, "safe");
	assert.equal(paleTipHtmlHit?.category, "safe");
	assert.equal(paleTipBlockHit?.category, "safe");
	assert.equal(grayLeadHit?.semanticTarget, "blockquote");
	assert.equal(grayOutroHit?.semanticTarget, "blockquote");
	assert.equal(paleTipHtmlHit?.semanticTone, "tip");
	assert.equal(paleTipBlockHit?.semanticTone, "tip");
});

test("buildAuditReport maps approved inline colors and aside copy into semantic tones", () => {
	const report = buildAuditReport(
		buildSampleWxr({
			content: [
				'<span style="color: #008080;">Hint</span>',
				'<span style="color: #ccffff;">Legacy white text</span>',
				'<!-- wp:paragraph {"textColor":"cyan-bluish-gray","fontSize":"small"} --><p class="has-text-color has-small-font-size has-cyan-bluish-gray-color">PS: Aside copy.</p><!-- /wp:paragraph -->',
			].join(""),
		}),
		{
			contentTypes: ["post"],
			pathMode: "flat",
			filenameSource: "title",
			reportFormats: ["json", "md"],
			wpPermalinkTemplate: "/%year%/%monthnum%/%day%/%postname%/",
			detectLinkPattern: true,
			defaultFrontmatter: {},
		},
	);

	const tealHit = report.records.find(
		(record) =>
			record.layer === "html-tag" &&
			record.rawSnippet.includes('style="color: #008080;"'),
	);
	const whiteTextHit = report.records.find(
		(record) =>
			record.layer === "html-tag" &&
			record.rawSnippet.includes('style="color: #ccffff;"'),
	);
	const asideHit = report.records.find(
		(record) =>
			record.layer === "html-tag" &&
			record.rawSnippet.includes("has-small-font-size has-cyan-bluish-gray-color"),
	);

	assert.equal(tealHit?.category, "safe");
	assert.equal(tealHit?.semanticTone, "note");
	assert.equal(tealHit?.semanticTarget, "inline-highlight");
	assert.equal(whiteTextHit?.category, "safe");
	assert.equal(whiteTextHit?.semanticTarget, "plain-text");
	assert.equal(asideHit?.category, "safe");
	assert.equal(asideHit?.semanticTone, "aside");
	assert.equal(asideHit?.semanticTarget, "aside");
});
