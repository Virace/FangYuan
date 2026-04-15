import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");

test("comment UI should render through focused Svelte components and mount on post pages", async () => {
	const [
		commentSectionSource,
		commentComposerSource,
		commentListSource,
		commentItemSource,
		postPageSource,
	] = await Promise.all([
		readFile(path.join(repoRoot, "src", "components", "comments", "CommentSection.svelte"), "utf8"),
		readFile(path.join(repoRoot, "src", "components", "comments", "CommentComposer.svelte"), "utf8"),
		readFile(path.join(repoRoot, "src", "components", "comments", "CommentList.svelte"), "utf8"),
		readFile(path.join(repoRoot, "src", "components", "comments", "CommentItem.svelte"), "utf8"),
		readFile(path.join(repoRoot, "src", "pages", "posts", "[...slug].astro"), "utf8"),
	]);

	assert.match(commentSectionSource, /onMount/);
	assert.match(commentSectionSource, /getCommentClient\(\)/);
	assert.match(commentSectionSource, /CommentComposer/);
	assert.match(commentSectionSource, /CommentList/);
	assert.match(commentSectionSource, /slice\(0,\s*rootLimit\)/);
	assert.match(commentSectionSource, /postTitle,/);
	assert.match(commentSectionSource, /voteComment\(/);
	assert.match(commentSectionSource, /supportsVote/);
	assert.match(commentSectionSource, /CommentList[\s\S]*CommentComposer/);
	assert.match(commentSectionSource, /card-base/);
	assert.match(commentComposerSource, /authorName|authorEmail|content/);
	assert.match(commentComposerSource, /EmojiPicker/);
	assert.match(commentComposerSource, /comment-emojis/);
	assert.match(commentComposerSource, /commentsEmoji/);
	assert.match(commentComposerSource, /validateCommentForm\(/);
	assert.match(commentComposerSource, /validationError = i18n\(validationResult\)/);
	assert.match(commentListSource, /CommentItem/);
	assert.match(commentListSource, /maxDepth/);
	assert.match(commentItemSource, /reply/);
	assert.match(commentItemSource, /depth < maxDepth/);
	assert.match(commentItemSource, /supportsVote/);
	assert.match(commentItemSource, /voteUp|voteDown/);
	assert.match(commentItemSource, /comment-body/);
	assert.match(commentItemSource, /comment-root/);
	assert.match(commentItemSource, /comment-nested/);
	assert.match(postPageSource, /CommentSection[\s\S]*client:only="svelte"/);
	assert.match(postPageSource, /getPostKeyFromEntry\(entry.id\)/);
	assert.match(postPageSource, /commentConfig\.enable && commentConfig\.provider/);
	assert.match(
		postPageSource,
		/<div class="flex flex-col md:flex-row justify-between[\s\S]*CommentSection/,
	);
});

test("comment UI should expose dedicated translation keys", async () => {
	const [i18nKeySource, enSource] = await Promise.all([
		readFile(path.join(repoRoot, "src", "i18n", "i18nKey.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "i18n", "languages", "en.ts"), "utf8"),
	]);

	for (const key of [
		"commentsLoadFailed",
		"commentsEmpty",
		"commentsSubmit",
		"commentsSubmitting",
		"commentsReply",
		"commentsCancelReply",
		"commentsEmoji",
		"commentsVoteUp",
		"commentsVoteDown",
		"commentsFormName",
		"commentsFormEmail",
		"commentsFormWebsite",
		"commentsFormContent",
		"commentsValidationNameRequired",
		"commentsValidationEmailInvalid",
		"commentsValidationContentRequired",
		"commentsValidationContentUnsafe",
		"commentsValidationWebsiteInvalid",
	]) {
		assert.match(i18nKeySource, new RegExp(`${key}\\s*=`));
		assert.match(enSource, new RegExp(`\\[Key\\.${key}\\]`));
	}
});
