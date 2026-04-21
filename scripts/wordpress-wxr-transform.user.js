function normalizeTone(rawTone) {
	const value = String(rawTone ?? "").trim().toLowerCase();
	if (!value) {
		return "note";
	}
	if (["red", "danger", "warning", "orange", "yellow"].includes(value)) {
		return "warning";
	}
	if (["green", "success", "tip"].includes(value)) {
		return "tip";
	}
	if (["purple", "important", "primary"].includes(value)) {
		return "important";
	}
	if (["caution", "error"].includes(value)) {
		return "caution";
	}
	return "note";
}

function renderInlineText(source, helpers) {
	return helpers.stripHtmlTags(
		helpers.renderInlineFormatting(helpers.renderInlineHighlights(source)),
	);
}

function renderBilibiliShortcodes(source, _notes, helpers) {
	return source.replace(
		/\[bilibili\]([\s\S]*?)\[\/bilibili\]/gi,
		(_match, rawBvid) => {
			const bvid = helpers.trimString(helpers.stripHtmlTags(rawBvid));
			if (!bvid) {
				return "";
			}
			return `\n\n<iframe width="100%" height="468" src="//player.bilibili.com/player.html?bvid=${bvid}&p=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>\n\n`;
		},
	);
}

function removeMusicShortcodes(source, notes) {
	return source.replace(/\[music[^\]]*\/\]/gi, (match) => {
		notes.push({
			kind: "music-shortcode-removed",
			rawSnippet: match.trim(),
		});
		return "";
	});
}

function renderAlertShortcodes(source, _notes, helpers) {
	return source.replace(
		/\[cr_alert([^\]]*)\]([\s\S]*?)\[\/cr_alert\]/gi,
		(_match, rawAttrs, body) => {
			const tone = normalizeTone(helpers.extractAttr(rawAttrs, "style"));
			return helpers.renderAdmonition(tone, renderInlineText(body, helpers));
		},
	);
}

function renderAlertBlocks(source, _notes, helpers) {
	return source.replace(
		/<!--\s*wp:kratos\/alert(?:\s+({[\s\S]*?}))?\s*-->([\s\S]*?)<!--\s*\/wp:kratos\/alert\s*-->/gi,
		(_match, jsonBlob, body) => {
			const options = helpers.safeParseJson(jsonBlob ?? "") ?? {};
			const tone = normalizeTone(options.theme ?? options.style);
			return helpers.renderAdmonition(tone, renderInlineText(body, helpers));
		},
	);
}

function renderFoldShortcodes(source, _notes, helpers) {
	return source.replace(
		/\[cr_toggle([^\]]*)\]([\s\S]*?)\[\/cr_toggle\]/gi,
		(_match, rawAttrs, body) => {
			const title = helpers.extractAttr(rawAttrs, "title") || "Details";
			return helpers.renderFold(title, body.trim());
		},
	);
}

function renderFoldBlocks(source, _notes, helpers) {
	return source.replace(
		/<!--\s*wp:kratos\/accordion(?:\s+({[\s\S]*?}))?\s*-->([\s\S]*?)<!--\s*\/wp:kratos\/accordion\s*-->/gi,
		(_match, jsonBlob, body) => {
			const options = helpers.safeParseJson(jsonBlob ?? "") ?? {};
			const title =
				helpers.trimString(options.title ?? options.name ?? "") || "Details";
			const normalizedBody = body
				.replace(/<\/?div[^>]*>/gi, "\n")
				.replace(/<summary[^>]*>[\s\S]*?<\/summary>/i, "\n")
				.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/i, "\n")
				.trim();
			return helpers.renderFold(title, normalizedBody);
		},
	);
}

function renderGithubEmbeds(source, _notes, helpers) {
	return source
		.replace(
			/<div([^>]*)class="[^"]*github-card[^"]*"([^>]*)><\/div>/gi,
			(_match, beforeAttrs, afterAttrs) => {
				const attrs = `${beforeAttrs ?? ""} ${afterAttrs ?? ""}`;
				const repo =
					helpers.extractAttr(attrs, "data-github") ||
					helpers.extractAttr(attrs, "repo");
				return repo ? `\n\n::github{repo=${helpers.yamlString(repo)}}\n\n` : "";
			},
		)
		.replace(
			/<script[^>]*src="(?:https?:)?\/\/cdn\.jsdelivr\.net\/github-cards\/latest\/widget\.js"[^>]*><\/script>/gi,
			"",
		);
}

function renderGistEmbeds(source) {
	return source.replace(
		/<script[^>]*src="(https:\/\/gist\.github\.com\/[^"]+?)\.js"[^>]*><\/script>/gi,
		(_match, gistUrl) => `\n\n[Gist](${gistUrl})\n\n`,
	);
}

function removeEditorSpecificBlocks(source) {
	return source.replace(/<!--\s*wp:tadv\/classic-paragraph\s*\/-->/gi, "");
}

export function applyUserTransformRules(source, context = {}) {
	const notes = context.notes ?? [];
	const helpers = context.helpers ?? {};
	let body = source;

	body = removeEditorSpecificBlocks(body);
	body = renderAlertBlocks(body, notes, helpers);
	body = renderAlertShortcodes(body, notes, helpers);
	body = renderFoldBlocks(body, notes, helpers);
	body = renderFoldShortcodes(body, notes, helpers);
	body = renderBilibiliShortcodes(body, notes, helpers);
	body = renderGithubEmbeds(body, notes, helpers);
	body = renderGistEmbeds(body, notes, helpers);
	body = removeMusicShortcodes(body, notes);

	return body;
}
