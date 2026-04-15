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
		inlineCommentCaptchaSource,
		commentComposerSource,
		commentListSource,
		commentItemSource,
		emojiPickerSource,
		mainCssSource,
		postPageSource,
	] = await Promise.all([
		readFile(path.join(repoRoot, "src", "components", "comments", "CommentSection.svelte"), "utf8"),
		readFile(
			path.join(repoRoot, "src", "components", "comments", "InlineCommentCaptcha.svelte"),
			"utf8",
		),
		readFile(path.join(repoRoot, "src", "components", "comments", "CommentComposer.svelte"), "utf8"),
		readFile(path.join(repoRoot, "src", "components", "comments", "CommentList.svelte"), "utf8"),
		readFile(path.join(repoRoot, "src", "components", "comments", "CommentItem.svelte"), "utf8"),
		readFile(path.join(repoRoot, "src", "components", "comments", "EmojiPicker.svelte"), "utf8"),
		readFile(path.join(repoRoot, "src", "styles", "main.css"), "utf8"),
		readFile(path.join(repoRoot, "src", "pages", "posts", "[...slug].astro"), "utf8"),
	]);

	assert.match(commentSectionSource, /onMount/);
	assert.match(commentSectionSource, /getCommentClient\(\)/);
	assert.match(commentSectionSource, /CommentComposer/);
	assert.match(commentSectionSource, /CommentList/);
	assert.match(commentSectionSource, /countCommentsInTree\(/);
	assert.match(commentSectionSource, /commentClient\.getThread\(\{/);
	assert.match(commentSectionSource, /sortBy:/);
	assert.match(commentSectionSource, /offset:/);
	assert.match(commentSectionSource, /limit:/);
	assert.match(commentSectionSource, /commentsSortNewest/);
	assert.match(commentSectionSource, /commentsSortOldest/);
	assert.match(commentSectionSource, /commentsPaginationPrevious/);
	assert.match(commentSectionSource, /commentsPaginationNext/);
	assert.match(commentSectionSource, /setTimeout\(/);
	assert.match(commentSectionSource, /6000/);
	assert.match(commentSectionSource, /transition:slide/);
	assert.match(commentSectionSource, /currentSortBy/);
	assert.match(commentSectionSource, /currentOffset/);
	assert.match(commentSectionSource, /totalRootCount/);
	assert.match(commentSectionSource, /<CommentHeader count=\{countCommentsInTree\(comments\)\} loading=\{loading\} \/>/);
	assert.match(commentSectionSource, /postTitle,/);
	assert.match(commentSectionSource, /CommentCaptchaRequiredError/);
	assert.match(commentSectionSource, /getCaptchaState\(/);
	assert.match(commentSectionSource, /refreshCaptcha\(/);
	assert.match(commentSectionSource, /verifyCaptcha\(/);
	assert.match(commentSectionSource, /commentsCaptchaRequiredTip/);
	assert.match(commentSectionSource, /captchaPrompt/);
	assert.match(commentSectionSource, /scrollIntoView/);
	assert.match(commentSectionSource, /handleVote[\s\S]*CommentCaptchaRequiredError/);
	assert.match(commentSectionSource, /voteComment\(/);
	assert.match(commentSectionSource, /supportsVote/);
	assert.match(commentSectionSource, /CommentList[\s\S]*CommentComposer/);
	assert.match(commentSectionSource, /submitNotice[\s\S]*CommentComposer/);
	assert.match(commentSectionSource, /card-base/);
	assert.match(inlineCommentCaptchaSource, /captchaState/);
	assert.match(inlineCommentCaptchaSource, /captchaBusy/);
	assert.match(inlineCommentCaptchaSource, /captchaError/);
	assert.match(inlineCommentCaptchaSource, /captchaPrompt/);
	assert.match(inlineCommentCaptchaSource, /compact/);
	assert.match(inlineCommentCaptchaSource, /onRefreshCaptcha/);
	assert.match(inlineCommentCaptchaSource, /onVerifyCaptcha/);
	assert.match(inlineCommentCaptchaSource, /commentsCaptcha/);
	assert.match(inlineCommentCaptchaSource, /commentsCaptchaRefresh/);
	assert.match(inlineCommentCaptchaSource, /commentsCaptchaVerify/);
	assert.match(inlineCommentCaptchaSource, /commentsCaptchaVerified/);
	assert.match(inlineCommentCaptchaSource, /commentsCaptchaUnsupported/);
	assert.match(inlineCommentCaptchaSource, /setTimeout\(/);
	assert.match(inlineCommentCaptchaSource, /6000/);
	assert.match(inlineCommentCaptchaSource, /onDismiss/);
	assert.match(inlineCommentCaptchaSource, /img[\s\S]*on:click=\{handleRefreshCaptcha\}/);
	assert.match(inlineCommentCaptchaSource, /in:fade/);
	assert.match(commentComposerSource, /authorName|authorEmail|content/);
	assert.match(commentComposerSource, /EmojiPicker/);
	assert.match(commentComposerSource, /InlineCommentCaptcha/);
	assert.match(commentComposerSource, /showCaptcha/);
	assert.match(commentComposerSource, /captchaState/);
	assert.match(commentComposerSource, /captchaBusy/);
	assert.match(commentComposerSource, /captchaError/);
	assert.match(commentComposerSource, /captchaPrompt/);
	assert.match(commentComposerSource, /onRefreshCaptcha/);
	assert.match(commentComposerSource, /onVerifyCaptcha/);
	assert.match(commentComposerSource, /onDismissCaptcha/);
	assert.match(commentComposerSource, /comment-emojis/);
	assert.match(commentComposerSource, /commentsEmoji/);
	assert.match(commentComposerSource, /@iconify\/svelte/);
	assert.match(commentComposerSource, /material-symbols:heart-smile-rounded/);
	assert.match(commentComposerSource, /aria-label=\{i18n\(I18nKey\.commentsEmoji\)\}/);
	assert.match(commentComposerSource, /onSubmit\?\.\(/);
	assert.match(commentComposerSource, /const submitSucceeded = await onSubmit\?\.\(/);
	assert.match(commentComposerSource, /if \(submitSucceeded\) \{[\s\S]*content = ""/);
	assert.match(commentComposerSource, /in:fade/);
	assert.match(commentComposerSource, /onCancelReply\?\.\(/);
	assert.doesNotMatch(commentComposerSource, /createEventDispatcher/);
	assert.match(commentComposerSource, /validateCommentForm\(/);
	assert.match(commentComposerSource, /validationError = i18n\(validationResult\)/);
	assert.match(commentListSource, /CommentItem/);
	assert.match(commentListSource, /maxDepth/);
	assert.match(commentListSource, /export let onReply/);
	assert.match(commentListSource, /export let activeCaptchaCommentId/);
	assert.doesNotMatch(commentListSource, /createEventDispatcher/);
	assert.match(commentItemSource, /onReply|commentsReply|commentsCancelReply/);
	assert.match(commentItemSource, /InlineCommentCaptcha/);
	assert.match(commentItemSource, /comment-action/);
	assert.match(commentItemSource, /onReply\?\.\(comment\.id\)/);
	assert.doesNotMatch(commentItemSource, /createEventDispatcher/);
	assert.match(commentItemSource, /depth < maxDepth/);
	assert.match(commentItemSource, /supportsVote/);
	assert.match(commentItemSource, /activeCaptchaCommentId/);
	assert.match(commentItemSource, /comment\.id === activeCaptchaCommentId/);
	assert.match(commentItemSource, /onDismissCaptcha/);
	assert.match(commentItemSource, /transition:slide/);
	assert.match(commentItemSource, /voteUp|voteDown/);
	assert.match(commentItemSource, /comment-body/);
	assert.match(commentItemSource, /comment-root/);
	assert.match(commentItemSource, /comment-nested/);
	assert.match(emojiPickerSource, /export let onSelect/);
	assert.doesNotMatch(emojiPickerSource, /createEventDispatcher/);
	assert.match(mainCssSource, /\.comment-action\s*\{/);
	assert.match(mainCssSource, /\.comment-action-icon\s*\{/);
	assert.match(mainCssSource, /\.comment-action-active\s*\{/);
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
		"commentsSubmitFailed",
		"commentsEmpty",
		"commentsSubmit",
		"commentsSubmitting",
		"commentsReply",
		"commentsCancelReply",
		"commentsEmoji",
		"commentsCaptcha",
		"commentsCaptchaRefresh",
		"commentsCaptchaVerify",
		"commentsCaptchaVerified",
		"commentsCaptchaRequiredTip",
		"commentsCaptchaUnsupported",
		"commentsVoteUp",
		"commentsVoteDown",
		"commentsVoteFailed",
		"commentsSortNewest",
		"commentsSortOldest",
		"commentsPaginationPrevious",
		"commentsPaginationNext",
		"commentsPaginationStatus",
		"commentsFormName",
		"commentsFormEmail",
		"commentsFormWebsite",
		"commentsFormContent",
		"commentsValidationNameRequired",
		"commentsValidationEmailInvalid",
		"commentsValidationContentRequired",
		"commentsValidationCaptchaRequired",
		"commentsValidationContentUnsafe",
		"commentsValidationWebsiteInvalid",
	]) {
		assert.match(i18nKeySource, new RegExp(`${key}\\s*=`));
		assert.match(enSource, new RegExp(`\\[Key\\.${key}\\]`));
	}
});
