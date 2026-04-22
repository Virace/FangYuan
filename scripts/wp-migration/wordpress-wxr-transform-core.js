import { extractWxrEntries, resolvePermalinkAudit } from "./wordpress-wxr-audit-core.js";
import { applyUserTransformRules } from "./wordpress-wxr-transform.user.js";
import { safeParseJson, slugifyFileStem, trimString } from "./wordpress-wxr-audit-utils.js";

function yamlString(value) {
	return JSON.stringify(String(value ?? ""));
}

function pushOptionalScalarFrontmatter(lines, key, value, options = {}) {
	const includeEmptyValues = options.includeEmptyValues === true;
	const normalizedValue = typeof value === "string" ? trimString(value) : value;
	if ((normalizedValue === "" || normalizedValue == null) && !includeEmptyValues) {
		return;
	}
	lines.push(`${key}: ${yamlString(value ?? "")}`);
}

function pushOptionalListFrontmatter(lines, key, values, options = {}) {
	const includeEmptyValues = options.includeEmptyValues === true;
	if (!Array.isArray(values) || values.length === 0) {
		if (includeEmptyValues) {
			lines.push(`${key}: []`);
		}
		return;
	}
	lines.push([`${key}:`, ...values.map((value) => `  - ${yamlString(value)}`)].join("\n"));
}

function buildCandidatePlan(entry, pathMode, permalinkAudit) {
	const targetCollection = entry.legacyType === "page" ? "spec" : "posts";
	const candidateBase =
		trimString(permalinkAudit.alias) ||
		trimString(entry.postName) ||
		trimString(entry.title) ||
		trimString(entry.legacyId);
	const candidateFileName = slugifyFileStem(candidateBase);
	const candidateTitle =
		entry.sourceStatus === "draft" &&
		permalinkAudit.aliasSource === "wp:post_id" &&
		trimString(entry.title)
			? `${trimString(entry.title)}-草稿`
			: entry.title;
	if (pathMode === "date-tree" && targetCollection === "posts") {
		const year = String(entry.published.getUTCFullYear());
		const month = String(entry.published.getUTCMonth() + 1).padStart(2, "0");
		const day = String(entry.published.getUTCDate()).padStart(2, "0");
		return {
			targetCollection,
			candidateFileName,
			candidateTitle,
			candidateRelativePath: `${targetCollection}/${year}/${month}/${day}/${candidateFileName}.md`,
		};
	}

	return {
		targetCollection,
		candidateFileName,
		candidateTitle,
		candidateRelativePath: `${targetCollection}/${candidateFileName}.md`,
	};
}

function extractAttr(source, attributeName) {
	const match = source.match(
		new RegExp(`${attributeName}\\s*=\\s*["']([^"']*)["']`, "i"),
	);
	return trimString(match?.[1] ?? "");
}

function decodeInlineHtml(source) {
	return source
		.replaceAll("&nbsp;", " ")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", '"')
		.replaceAll("&apos;", "'")
		.replaceAll("&amp;", "&");
}

function stripHtmlTags(source) {
	return decodeInlineHtml(source)
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/?[^>]+>/g, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function escapeDirectiveText(source) {
	return stripHtmlTags(source).replaceAll("\r", "");
}

function renderBlockquote(source) {
	const lines = escapeDirectiveText(source)
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	return `\n\n${lines.map((line) => `> ${line}`).join("\n")}\n\n`;
}

function renderAdmonition(tone, source) {
	const body = source.trim();
	return `\n\n${[`:::${tone}`, body, ":::"].join("\n")}\n\n`;
}

function renderFold(title, source) {
	return `\n\n${[`:::fold{title=${yamlString(title)}}`, source.trim(), ":::"].join("\n")}\n\n`;
}

function renderFence(source) {
	return renderFenceWithLanguage(source, "");
}

function normalizeFenceLanguage(rawLanguage) {
	const language = trimString(rawLanguage).toLowerCase();
	if (!language) {
		return "";
	}
	const aliasMap = {
		py: "python",
		shell: "shell",
		bash: "bash",
		sh: "bash",
		python: "python",
		sql: "sql",
		js: "javascript",
		ts: "typescript",
	};
	return aliasMap[language] ?? language;
}

function renderFenceWithLanguage(source, languageHint = "") {
	const content = decodeInlineHtml(source)
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/?code[^>]*>/gi, "")
		.replace(/<\/?pre[^>]*>/gi, "")
		.trim();
	const language = normalizeFenceLanguage(languageHint);
	const fenceLine = language ? `\`\`\`${language}` : "```";
	return `\n\n${[fenceLine, content, "```"].join("\n")}\n\n`;
}

function extractWpBlockJsonAttribute(source, attributeName) {
	const parsed = safeParseJson(source ?? "") ?? {};
	return trimString(parsed[attributeName] ?? "");
}

function renderInlineHighlights(source) {
	return source
		.replace(
			/<span[^>]*style="[^"]*color:\s*#008080;?[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="note"}`,
		)
		.replace(
			/<span[^>]*class="[^"]*has-inline-color[^"]*has-vivid-cyan-blue-color[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="note"}`,
		)
		.replace(
			/<span[^>]*class="[^"]*has-inline-color[^"]*has-pale-cyan-blue-color[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="note"}`,
		)
		.replace(
			/<span[^>]*style="[^"]*color:\s*#(?:3366ff|0000ff|00ccff);?[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="note"}`,
		)
		.replace(
			/<span[^>]*class="[^"]*has-inline-color[^"]*has-vivid-green-cyan-color[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="tip"}`,
		)
		.replace(
			/<span[^>]*class="[^"]*has-inline-color[^"]*has-light-green-cyan-color[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="tip"}`,
		)
		.replace(
			/<span[^>]*style="[^"]*color:\s*#(?:339966|008000);?[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="tip"}`,
		)
		.replace(
			/<span[^>]*class="[^"]*has-inline-color[^"]*has-vivid-purple-color[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="important"}`,
		)
		.replace(
			/<span[^>]*class="[^"]*has-inline-color[^"]*has-pale-pink-color[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="important"}`,
		)
		.replace(
			/<span[^>]*style="[^"]*color:\s*#ff00ff;?[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="important"}`,
		)
		.replace(
			/<span[^>]*class="[^"]*has-inline-color[^"]*has-luminous-vivid-amber-color[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="warning"}`,
		)
		.replace(
			/<span[^>]*class="[^"]*has-inline-color[^"]*has-luminous-vivid-orange-color[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="warning"}`,
		)
		.replace(
			/<span[^>]*style="[^"]*color:\s*#(?:ff6600|ff9900|ffcc00);?[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="warning"}`,
		)
		.replace(
			/<span[^>]*class="[^"]*has-inline-color[^"]*has-vivid-red-color[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="caution"}`,
		)
		.replace(
			/<span[^>]*style="[^"]*color:\s*#(?:ff0000|800000);?[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => `:hl[${escapeDirectiveText(content)}]{tone="caution"}`,
		)
		.replace(
			/<span[^>]*style="[^"]*color:\s*#ccffff;?[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => escapeDirectiveText(content),
		)
		.replace(
			/<span[^>]*class="[^"]*has-white-color[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
			(_match, content) => escapeDirectiveText(content),
		);
}

function renderInlineFormatting(source) {
	return source
		.replace(/<strong>([\s\S]*?)<\/strong>/gi, (_m, c) => `**${stripHtmlTags(c)}**`)
		.replace(/<em>([\s\S]*?)<\/em>/gi, (_m, c) => `*${stripHtmlTags(c)}*`)
		.replace(/<code>([\s\S]*?)<\/code>/gi, (_m, c) => `\`${stripHtmlTags(c)}\``)
		.replace(/<s>([\s\S]*?)<\/s>/gi, (_m, c) => `~~${stripHtmlTags(c)}~~`)
		.replace(/<cite>([\s\S]*?)<\/cite>/gi, (_m, c) => `*${stripHtmlTags(c)}*`)
		.replace(
			/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
			(_m, href, content) => `[${stripHtmlTags(content) || href}](${href})`,
		);
}

function renderImages(source, notes) {
	return source.replace(/<img([^>]*)\/?>/gi, (match, attrs) => {
		const src = extractAttr(attrs, "src");
		const alt = extractAttr(attrs, "alt");
		const className = extractAttr(attrs, "class");
		if (/aligncenter|alignnone|alignleft|alignright/i.test(className)) {
			notes.push({
				kind: "image-alignment-dropped",
				src,
				className,
			});
		}
		return src ? `![${alt}](${src})` : match;
	});
}

function renderVideoBlocks(source) {
	return source.replace(
		/<!--\s*wp:video[\s\S]*?-->([\s\S]*?<video[\s\S]*?<\/video>)[\s\S]*?<!--\s*\/wp:video\s*-->/gi,
		(_match, videoTag) => `\n\n${videoTag.trim()}\n\n`,
	);
}

function renderCodeBlocks(source) {
	return source
		.replace(
			/<!--\s*wp:(code|preformatted)(?:\s+({[\s\S]*?}))?\s*-->([\s\S]*?<pre([\s\S]*?)<\/pre>)[\s\S]*?<!--\s*\/wp:\1\s*-->/gi,
			(_match, _blockName, jsonBlob, preTag, preAttrs) => {
				const className =
					extractWpBlockJsonAttribute(jsonBlob, "className") ||
					trimString(extractAttr(preAttrs ?? "", "class").split(/\s+/)[1] ?? "");
				return renderFenceWithLanguage(preTag, className);
			},
		)
		.replace(
			/<!--\s*wp:verse[\s\S]*?-->([\s\S]*?<pre[\s\S]*?<\/pre>)[\s\S]*?<!--\s*\/wp:verse\s*-->/gi,
			(_match, preTag) => renderBlockquote(preTag),
		)
		.replace(
			/<!--\s*wp:enlighter\/codeblock(?:\s+({[\s\S]*?}))?\s*-->([\s\S]*?<pre([\s\S]*?)<\/pre>)[\s\S]*?<!--\s*\/wp:enlighter\/codeblock\s*-->/gi,
			(_match, jsonBlob, preTag, preAttrs) => {
				const className =
					extractWpBlockJsonAttribute(jsonBlob, "className") ||
					trimString(extractAttr(preAttrs ?? "", "class").split(/\s+/)[1] ?? "");
				return renderFenceWithLanguage(preTag, className);
			},
		);
}

function renderButtonsBlock(source) {
	return source.replace(
		/<!--\s*wp:buttons[\s\S]*?-->([\s\S]*?)<!--\s*\/wp:buttons\s*-->/gi,
		(_match, content) => {
			const links = [...content.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
				.map((match) => `- [${stripHtmlTags(match[2])}](${match[1]})`)
				.join("\n");
			return links ? `\n\n${links}\n\n` : "";
		},
	);
}

function removeEditorNoise(source) {
	return source
		.replace(/<figure[^>]*>/gi, "")
		.replace(/<\/figure>/gi, "")
		.replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, (_m, c) => stripHtmlTags(c))
		.replace(/<(?:stdin|module|sup|u|i)[^>]*>([\s\S]*?)<\/(?:stdin|module|sup|u|i)>/gi, (_m, c) =>
			stripHtmlTags(c),
		)
		.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, (_m, c) => stripHtmlTags(c));
}

function renderBackgroundParagraphs(source) {
	return source
		.replace(
			/<p[^>]*has-(?:very-light-gray|cyan-bluish-gray)-background-color[^>]*>([\s\S]*?)<\/p>/gi,
			(_match, content) => renderBlockquote(renderInlineFormatting(renderInlineHighlights(content))),
		)
		.replace(
			/<p[^>]*has-pale-cyan-blue-background-color[^>]*>([\s\S]*?)<\/p>/gi,
			(_match, content) =>
				renderAdmonition("tip", stripHtmlTags(renderInlineFormatting(renderInlineHighlights(content)))),
		)
		.replace(
			/<p[^>]*has-text-color[^>]*has-(?:small|medium)-font-size[^>]*has-cyan-bluish-gray-color[^>]*>([\s\S]*?)<\/p>/gi,
			(_match, content) =>
				`\n\n${[":::aside", stripHtmlTags(renderInlineFormatting(renderInlineHighlights(content))), ":::"].join(
					"\n",
				)}\n\n`,
		);
}

function renderSimpleParagraphs(source) {
	return source
		.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, c) => `## ${stripHtmlTags(c)}`)
		.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, c) => `### ${stripHtmlTags(c)}`)
		.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_m, c) => `#### ${stripHtmlTags(c)}`)
		.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, c) =>
			renderBlockquote(renderInlineFormatting(renderInlineHighlights(c))),
		)
		.replace(/<ul>([\s\S]*?)<\/ul>/gi, (_m, inner) =>
			[...inner.matchAll(/<li>([\s\S]*?)<\/li>/gi)]
				.map((match) => `- ${stripHtmlTags(renderInlineFormatting(renderInlineHighlights(match[1])))}`)
				.join("\n"),
		)
		.replace(/<ol>([\s\S]*?)<\/ol>/gi, (_m, inner) =>
			[...inner.matchAll(/<li>([\s\S]*?)<\/li>/gi)]
				.map(
					(match, index) =>
						`${index + 1}. ${stripHtmlTags(renderInlineFormatting(renderInlineHighlights(match[1])))}`,
				)
				.join("\n"),
		)
		.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, c) =>
			`\n\n${stripHtmlTags(renderInlineFormatting(renderInlineHighlights(c)))}\n\n`,
		)
		.replace(/<br\s*\/?>/gi, "\n");
}

function finalizePreviewMarkdown(source) {
	return renderInlineFormatting(renderInlineHighlights(source))
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, (_m, c) => stripHtmlTags(c))
		.replace(/[ \t]+\n/g, "\n");
}

function renderTables(source, notes) {
	return source.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
		const rowMatches = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
		if (rowMatches.length === 0) {
			return tableHtml;
		}
		const rows = rowMatches.map((rowMatch) =>
			[...rowMatch[1].matchAll(/<(th|td)([^>]*)>([\s\S]*?)<\/\1>/gi)].map((cellMatch) => ({
				tagName: cellMatch[1].toLowerCase(),
				attrs: cellMatch[2] ?? "",
				content: stripHtmlTags(renderInlineFormatting(renderInlineHighlights(cellMatch[3]))),
			})),
		);
		if (rows.some((row) => row.length === 0)) {
			notes.push({ kind: "table-convert-skipped", reason: "empty-row" });
			return tableHtml;
		}
		const headerRow = rows[0];
		const alignments = headerRow.map((_cell, index) => {
			for (const row of rows) {
				const attrs = row[index]?.attrs ?? "";
				if (/text-align:\s*center/i.test(attrs)) {
					return ":---:";
				}
				if (/text-align:\s*right/i.test(attrs)) {
					return "---:";
				}
				if (/text-align:\s*left/i.test(attrs)) {
					return ":---";
				}
			}
			return "---";
		});
		const markdownRows = [
			`| ${headerRow.map((cell) => cell.content || " ").join(" | ")} |`,
			`| ${alignments.join(" | ")} |`,
			...rows.slice(1).map((row) => `| ${row.map((cell) => cell.content || " ").join(" | ")} |`),
		];
		return markdownRows.join("\n");
	});
}

function collapseWhitespace(source) {
	return source
		.replace(/\r/g, "")
		.replace(/\n{3,}/g, "\n\n")
		.replace(/[ \t]+\n/g, "\n")
		.trim();
}

function buildFrontmatterLines(entry, candidatePlan, permalinkAudit, options = {}) {
	const lines = [
		"---",
		`title: ${yamlString(candidatePlan.candidateTitle)}`,
		`published: ${entry.published.toISOString()}`,
		`updated: ${entry.updated.toISOString()}`,
		`draft: ${entry.sourceStatus === "draft" ? "true" : "false"}`,
	];

	pushOptionalScalarFrontmatter(lines, "commentStatus", entry.commentStatus ?? "", options);
	pushOptionalScalarFrontmatter(lines, "password", entry.postPassword ?? "", options);
	pushOptionalScalarFrontmatter(lines, "alias", permalinkAudit.alias ?? "", options);
	pushOptionalScalarFrontmatter(lines, "description", entry.excerpt ?? "", options);
	pushOptionalListFrontmatter(lines, "tags", entry.tags, options);

	if (candidatePlan.targetCollection === "posts") {
		const resolvedCategory =
			trimString(entry.categories[0] ?? "") || trimString(options.defaultCategory ?? "");
		pushOptionalScalarFrontmatter(lines, "category", resolvedCategory, options);
	}

	lines.push("---");
	return lines;
}

export function transformEntryToPreview(entry, options = {}) {
	const permalinkAudit = resolvePermalinkAudit({
		legacyType: entry.legacyType,
		link: entry.link,
		legacyId: entry.legacyId,
		postName: entry.postName,
		sourceStatus: entry.sourceStatus,
		wpPermalinkTemplate: options.wpPermalinkTemplate ?? "",
		detectLinkPattern: options.detectLinkPattern ?? true,
	});
	const candidatePlan = buildCandidatePlan(
		entry,
		options.pathMode ?? "flat",
		permalinkAudit,
	);
	const notes = [];
	let body = entry.contentHtml;
	body = applyUserTransformRules(body, {
		notes,
		helpers: {
			extractAttr,
			renderAdmonition,
			renderFold,
			renderInlineFormatting,
			renderInlineHighlights,
			stripHtmlTags,
			trimString,
			safeParseJson,
			yamlString,
		},
	});
	body = renderCodeBlocks(body);
	body = renderVideoBlocks(body);
	body = renderButtonsBlock(body);
	body = removeEditorNoise(body);
	body = renderBackgroundParagraphs(body);
	body = renderImages(body, notes);
	body = renderTables(body, notes);
	body = renderSimpleParagraphs(body);
	body = finalizePreviewMarkdown(body);
	body = collapseWhitespace(body);

	const frontmatterLines = buildFrontmatterLines(
		entry,
		candidatePlan,
		permalinkAudit,
		options,
	);

	return {
		legacyId: entry.legacyId,
		legacyType: entry.legacyType,
		title: candidatePlan.candidateTitle,
		alias: permalinkAudit.alias,
		candidateRelativePath: candidatePlan.candidateRelativePath,
		targetCollection: candidatePlan.targetCollection,
		notes,
		markdown: [...frontmatterLines, "", body].join("\n"),
	};
}

export function transformWxrToPreview(source, options = {}) {
	const entries = extractWxrEntries(source, new Set(options.contentTypes ?? ["post", "page"]), {
		useGmtDates: options.useGmtDates === true,
	});
	const previewEntries = entries.map((entry) => transformEntryToPreview(entry, options));
	return {
		entries: previewEntries,
		summary: {
			entryCount: previewEntries.length,
			noteCount: previewEntries.reduce((total, entry) => total + entry.notes.length, 0),
		},
	};
}
