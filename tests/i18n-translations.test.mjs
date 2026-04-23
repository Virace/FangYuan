import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const i18nKeyPath = path.join(repoRoot, "src", "i18n", "i18nKey.ts");
const languagesDir = path.join(repoRoot, "src", "i18n", "languages");

function extractKeyObject(source) {
	const keyMatches = [
		...source.matchAll(/^\s*([A-Za-z0-9_]+):\s*"[^"]+"/gm),
	];
	return Object.fromEntries(keyMatches.map((match) => [match[1], match[1]]));
}

function parseLanguageSource(source, keyObject) {
	let body = source
		.replace(/^import[^\n]*\n/gm, "")
		.replace(/^export const [A-Za-z0-9_]+: Translation = /m, "")
		.trim();

	if (body.endsWith(";")) {
		body = body.slice(0, -1);
	}

	return Function("Key", `return (${body});`)(keyObject);
}

const keysThatMustNotFallbackToEnglish = [
	"home",
	"about",
	"archive",
	"pinned",
	"pinnedPosts",
	"commentsEmoji",
	"commentsCaptcha",
	"commentsVoteConfirmTipUp",
	"commentsVoteConfirmTipDown",
	"commentsVoteConfirmProceed",
	"commentsVoteConfirmCancel",
	"commentsFormEmail",
	"pageFeedbackLike",
	"pageFeedbackLiked",
	"pageFeedbackLikeFailed",
	"pageFeedbackReward",
	"pageFeedbackRewardTitle",
	"pageFeedbackRewardDescription",
	"pageFeedbackClose",
];

test("non-English locales should not keep English fallback text for localized UI labels", async () => {
	const keySource = await readFile(i18nKeyPath, "utf8");
	const keyObject = extractKeyObject(keySource);
	const languageFiles = (await readdir(languagesDir)).filter((file) =>
		file.endsWith(".ts"),
	);

	const dictionaries = {};
	for (const file of languageFiles) {
		const source = await readFile(path.join(languagesDir, file), "utf8");
		dictionaries[file] = parseLanguageSource(source, keyObject);
	}

	const english = dictionaries["en.ts"];
	for (const [file, dictionary] of Object.entries(dictionaries)) {
		if (file === "en.ts") {
			continue;
		}

		for (const key of keysThatMustNotFallbackToEnglish) {
			if (!(key in dictionary)) {
				continue;
			}

			assert.notEqual(
				dictionary[key],
				english[key],
				`${file} still uses English text for ${key}`,
			);
		}
	}
});
