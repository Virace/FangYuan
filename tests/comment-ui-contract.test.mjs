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
		variablesCssSource,
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
		readFile(path.join(repoRoot, "src", "styles", "variables.css"), "utf8"),
		readFile(path.join(repoRoot, "src", "pages", "posts", "[...slug].astro"), "utf8"),
	]);

	assert.match(commentSectionSource, /onMount/);
	assert.match(commentSectionSource, /getCommentClient\(\)/);
	assert.match(commentSectionSource, /CommentComposer/);
	assert.match(commentSectionSource, /CommentList/);
	assert.match(commentSectionSource, /countCommentsInTree\(/);
	assert.match(commentSectionSource, /commentClient\.getThread\(\{/);
	assert.match(
		commentSectionSource,
		/const nextCapability =\s*capability \?\? \(await commentClient\.getCapability\(postKey\)\)/,
	);
	assert.doesNotMatch(
		commentSectionSource,
		/Promise\.all\(\[\s*commentClient\.getCapability\(postKey\),\s*commentClient\.getThread\(\{/,
		"comment loading should avoid a second parallel capability fetch when the thread response can seed Artalk capability cache",
	);
	assert.match(commentSectionSource, /sortBy:/);
	assert.match(commentSectionSource, /offset:/);
	assert.match(commentSectionSource, /limit:/);
	assert.match(commentSectionSource, /commentsSortNewest/);
	assert.match(commentSectionSource, /commentsSortOldest/);
	assert.match(commentSectionSource, /disabled=\{currentSortBy === "date_desc"\}/);
	assert.match(commentSectionSource, /disabled=\{currentSortBy === "date_asc"\}/);
	assert.match(commentSectionSource, /aria-pressed=\{currentSortBy === "date_desc"\}/);
	assert.match(commentSectionSource, /aria-pressed=\{currentSortBy === "date_asc"\}/);
	assert.match(commentSectionSource, /class:comment-sort-tab-active=\{currentSortBy === "date_desc"\}/);
	assert.match(commentSectionSource, /class:comment-sort-tab-active=\{currentSortBy === "date_asc"\}/);
	assert.match(commentSectionSource, /class:comment-sort-tab-idle=\{currentSortBy !== "date_desc"\}/);
	assert.match(commentSectionSource, /class:comment-sort-tab-idle=\{currentSortBy !== "date_asc"\}/);
	assert.match(commentSectionSource, /class:link-underline=\{currentSortBy !== "date_desc"\}/);
	assert.match(commentSectionSource, /class:link-underline=\{currentSortBy !== "date_asc"\}/);
	assert.match(commentSectionSource, /commentsPaginationPrevious/);
	assert.match(commentSectionSource, /commentsPaginationNext/);
	assert.match(commentSectionSource, /setTimeout\(/);
	assert.match(commentSectionSource, /6000/);
	assert.match(commentSectionSource, /transition:slide/);
	assert.match(commentSectionSource, /const contentTransitionDuration = 180/);
	assert.doesNotMatch(commentSectionSource, /commentContentMinHeightClass/);
	assert.match(commentSectionSource, /in:fade=\{\{ duration: contentTransitionDuration \}\}/);
	assert.match(commentSectionSource, /out:fade=\{\{ duration: contentTransitionDuration \}\}/);
	assert.match(commentSectionSource, /aria-busy=\{loading\}/);
	assert.doesNotMatch(commentSectionSource, /showCommentLoadingState = loading && comments.length > 0/);
	assert.match(
		commentSectionSource,
		/showCommentEmptyState =\s*!loading && comments.length === 0 && capability\?\.enabled/,
	);
	assert.match(commentSectionSource, /showCommentLoadingOverlay = loading && comments.length > 0/);
	assert.match(commentSectionSource, /showCommentInitialSkeleton = loading && comments.length === 0/);
	assert.match(commentSectionSource, /\{#if showCommentInitialSkeleton\}/);
	assert.match(commentSectionSource, /\{:else if comments.length > 0\}/);
	assert.match(commentSectionSource, /\{#if showCommentLoadingOverlay\}/);
	assert.match(commentSectionSource, /comments-content-shell/);
	assert.match(commentSectionSource, /comments-content-stack/);
	assert.match(commentSectionSource, /comment-loading-overlay/);
	assert.match(commentSectionSource, /comment-thread-skeleton/);
	assert.match(commentSectionSource, /comment-empty-state/);
	assert.match(
		commentSectionSource,
		/async function handleSubmit\(\s*detail: CommentComposerSubmitDetail,\s*\): Promise<boolean>/,
	);
	assert.match(commentSectionSource, /if \(!commentClient\) \{\s*return false;\s*\}/);
	assert.doesNotMatch(
		commentSectionSource,
		/<div[^>]*class="comment-thread-skeleton"[^>]*\/>/,
	);
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
	assert.match(commentSectionSource, /handleVote[\s\S]*requestVoteConfirm/);
	assert.match(commentSectionSource, /submitVote[\s\S]*CommentCaptchaRequiredError/);
	assert.match(commentSectionSource, /voteComment\(/);
	assert.match(commentSectionSource, /supportsVote/);
	assert.match(commentSectionSource, /supportsCaptcha/);
	assert.match(commentSectionSource, /persistenceMode/);
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
	assert.match(commentComposerSource, /comment-composer-actions/);
	assert.match(commentComposerSource, /comment-emoji-trigger/);
	assert.match(commentComposerSource, /comment-emoji-trigger-icon/);
	assert.match(commentComposerSource, /comment-emoji-popover-wrap/);
	assert.match(commentComposerSource, /comment-emoji-popover/);
	assert.match(commentComposerSource, /commentsEmoji/);
	assert.match(commentComposerSource, /emojiTriggerIcon/);
	assert.match(commentComposerSource, /\{emojiTriggerIcon\}/);
	assert.match(commentComposerSource, /bind:this=\{emojiTriggerWrap\}/);
	assert.match(commentComposerSource, /on:focusout=\{handleEmojiFocusOut\}/);
	assert.match(commentComposerSource, /<svelte:window on:keydown=\{handleEmojiKeydown\} \/>/);
	assert.match(commentComposerSource, /class="comment-emoji-trigger comment-action"/);
	assert.doesNotMatch(
		commentComposerSource,
		/class="comment-emoji-trigger comment-action comment-action-active"/,
	);
	assert.doesNotMatch(commentComposerSource, /@iconify\/svelte/);
	assert.doesNotMatch(commentComposerSource, /material-symbols:/);
	assert.match(commentComposerSource, /aria-label=\{i18n\(I18nKey\.commentsEmoji\)\}/);
	assert.match(commentComposerSource, /in:fade/);
	assert.match(commentComposerSource, /out:fade/);
	assert.match(commentComposerSource, /in:scale/);
	assert.match(commentComposerSource, /out:scale/);
	assert.match(commentComposerSource, /onSubmit\?\.\(/);
	assert.match(commentComposerSource, /const submitSucceeded = await onSubmit\?\.\(/);
	assert.match(commentComposerSource, /if \(submitSucceeded\) \{[\s\S]*content = ""/);
	assert.match(commentComposerSource, /in:fade/);
	assert.match(commentComposerSource, /onCancelReply\?\.\(/);
	assert.doesNotMatch(commentComposerSource, /createEventDispatcher/);
	assert.match(commentComposerSource, /validateCommentForm\(/);
	assert.match(commentComposerSource, /validationError = i18n\(validationResult\)/);
	assert.match(commentComposerSource, /requiredAuthorFields/);
	assert.match(commentComposerSource, /showWebsiteField/);
	assert.match(commentComposerSource, /commentsPreviewWriteNotice/);
	assert.match(commentListSource, /CommentItem/);
	assert.match(mainCssSource, /\.comment-sort-tab \{/);
	assert.match(mainCssSource, /\.comment-sort-tab-active \{/);
	assert.match(mainCssSource, /\.comment-sort-tab:disabled \{/);
	assert.match(mainCssSource, /\.comments-content-shell \{/);
	assert.match(mainCssSource, /\.comments-content-stack \{/);
	assert.match(mainCssSource, /\.comment-loading-overlay \{/);
	assert.match(mainCssSource, /\.comment-thread-skeleton \{/);
	assert.match(mainCssSource, /\.comment-empty-state \{/);
	assert.doesNotMatch(mainCssSource, /\.comment-empty-state \{[\s\S]*min-height:/);
	assert.match(mainCssSource, /\.comment-sort-tab-active \{[\s\S]*color: var\(--comment-sort-active-content\);/);
	assert.match(mainCssSource, /\.comment-composer-actions \{/);
	assert.match(mainCssSource, /\.comment-emoji-trigger \{/);
	assert.match(mainCssSource, /\.comment-emoji-trigger-icon \{/);
	assert.match(mainCssSource, /\.comment-emoji-popover-wrap \{/);
	assert.match(mainCssSource, /\.comment-emoji-popover \{/);
	assert.match(mainCssSource, /\.comment-emoji-popover::after \{/);
	assert.match(mainCssSource, /\.comment-emoji-popover \{[\s\S]*transform-origin: bottom left;/);
	assert.match(variablesCssSource, /--comment-sort-active-content: rgb\(0 0 0 \/ 0\.9\);/);
	assert.match(variablesCssSource, /:root\.dark \{[\s\S]*--comment-sort-active-content: rgb\(255 255 255 \/ 0\.9\);/);
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
		"commentsPreviewWriteNotice",
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

	assert.doesNotMatch(enSource, /Artalk now requires captcha verification/);
});
