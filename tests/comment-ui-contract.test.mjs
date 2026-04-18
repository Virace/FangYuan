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
		commentCaptchaHostSource,
		commentCaptchaInlineValueSource,
		commentCaptchaIframeWidgetSource,
		commentComposerSource,
		commentListSource,
		commentItemSource,
		emojiPickerSource,
		mainCssSource,
		tailwindThemeSource,
		variablesCssSource,
		postPageSource,
	] = await Promise.all([
		readFile(path.join(repoRoot, "src", "components", "comments", "CommentSection.svelte"), "utf8"),
		readFile(
			path.join(repoRoot, "src", "components", "comments", "InlineCommentCaptcha.svelte"),
			"utf8",
		),
		readFile(
			path.join(repoRoot, "src", "components", "comments", "CommentCaptchaHost.svelte"),
			"utf8",
		),
		readFile(
			path.join(repoRoot, "src", "components", "comments", "CommentCaptchaInlineValue.svelte"),
			"utf8",
		),
		readFile(
			path.join(
				repoRoot,
				"src",
				"components",
				"comments",
				"CommentCaptchaIframeWidget.svelte",
			),
			"utf8",
		),
		readFile(path.join(repoRoot, "src", "components", "comments", "CommentComposer.svelte"), "utf8"),
		readFile(path.join(repoRoot, "src", "components", "comments", "CommentList.svelte"), "utf8"),
		readFile(path.join(repoRoot, "src", "components", "comments", "CommentItem.svelte"), "utf8"),
		readFile(path.join(repoRoot, "src", "components", "comments", "EmojiPicker.svelte"), "utf8"),
		readFile(path.join(repoRoot, "src", "styles", "main.css"), "utf8"),
		readFile(path.join(repoRoot, "src", "styles", "tailwind-theme.css"), "utf8"),
		readFile(path.join(repoRoot, "src", "styles", "variables.css"), "utf8"),
		readFile(path.join(repoRoot, "src", "pages", "posts", "[...slug].astro"), "utf8"),
	]);

	assert.match(commentSectionSource, /onMount/);
	assert.match(commentSectionSource, /getQingYanClient\(\)/);
	assert.match(commentSectionSource, /CommentComposer/);
	assert.match(commentSectionSource, /CommentList/);
	assert.match(commentSectionSource, /countCommentsInTree\(/);
	assert.match(commentSectionSource, /fetchPostEngagementBootstrap\(/);
	assert.match(
		commentSectionSource,
		/loadInitialState[\s\S]*bootstrap\.captcha\?\.required[\s\S]*activeCaptchaTarget = \{ kind: "composer" \}/,
	);
	assert.match(commentSectionSource, /qingyanClient\.fetchCommentThread\(\{/);
	assert.match(commentSectionSource, /function applyBootstrap\(/);
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
	assert.match(commentSectionSource, /getAutoDismissMs/);
	assert.match(commentSectionSource, /InlineFeedbackNotice/);
	assert.match(commentSectionSource, /const contentTransitionDuration = 180/);
	assert.doesNotMatch(commentSectionSource, /commentContentMinHeightClass/);
	assert.match(commentSectionSource, /in:fade=\{\{ duration: contentTransitionDuration \}\}/);
	assert.match(commentSectionSource, /out:fade=\{\{ duration: contentTransitionDuration \}\}/);
	assert.match(commentSectionSource, /aria-busy=\{loading\}/);
	assert.doesNotMatch(commentSectionSource, /showCommentLoadingState = loading && comments.length > 0/);
	assert.match(
		commentSectionSource,
		/showCommentEmptyState = comments.length === 0 && capability\?\.enabled/,
	);
	assert.match(commentSectionSource, /showCommentLoadingOverlay = loading && comments.length > 0/);
	assert.match(
		commentSectionSource,
		/showCommentInitialSkeleton = loading && comments.length === 0 && !capability/,
	);
	assert.match(commentSectionSource, /\{#if showCommentInitialSkeleton\}/);
	assert.match(commentSectionSource, /\{:else if comments.length > 0\}/);
	assert.match(commentSectionSource, /\{#if showCommentLoadingOverlay\}/);
	assert.match(commentSectionSource, /comments-content-shell/);
	assert.doesNotMatch(commentSectionSource, /comments-content-shell-stable-empty/);
	assert.match(commentSectionSource, /comments-content-stack/);
	assert.match(commentSectionSource, /comment-loading-overlay/);
	assert.match(commentSectionSource, /comment-thread-skeleton/);
	assert.match(commentSectionSource, /comment-empty-state/);
	assert.match(
		commentSectionSource,
		/async function handleSubmit\(\s*detail: CommentComposerSubmitDetail,\s*\): Promise<boolean>/,
	);
	assert.match(commentSectionSource, /if \(!qingyanClient\) \{\s*return false;\s*\}/);
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
	assert.match(commentSectionSource, /async function handlePollCaptchaStatus\(\)/);
	assert.match(commentSectionSource, /qingyanClient\.getCaptchaStatus\(\{/);
	assert.match(commentSectionSource, /if \(!nextStatus\?\.verified\) \{/);
	assert.match(commentSectionSource, /captchaState = captchaState/);
	assert.match(commentSectionSource, /onPollCaptchaStatus=\{handlePollCaptchaStatus\}/);
	assert.match(commentSectionSource, /commentsCaptchaRequiredTip/);
	assert.match(commentSectionSource, /captchaPrompt/);
	assert.match(commentSectionSource, /scrollIntoView/);
	assert.match(commentSectionSource, /handleVote[\s\S]*requestVoteConfirm/);
	assert.match(commentSectionSource, /submitVote[\s\S]*CommentCaptchaRequiredError/);
	assert.match(commentSectionSource, /voteComment\(/);
	assert.match(commentSectionSource, /supportsVote/);
	assert.match(commentSectionSource, /supportsCaptcha/);
	assert.match(commentSectionSource, /commentForm/);
	assert.match(commentSectionSource, /allowedFields = commentForm\?\.allow \?\? \["nickname", "email", "website"\]/);
	assert.match(commentSectionSource, /requiredFields = commentForm\?\.require \?\? \["nickname", "email"\]/);
	assert.doesNotMatch(commentSectionSource, /requiredAuthorFields = capability\?\.requiredAuthorFields/);
	assert.doesNotMatch(commentSectionSource, /optionalAuthorFields = capability\?\.optionalAuthorFields/);
	assert.doesNotMatch(commentSectionSource, /requiredFields = capability\?\.require/);
	assert.match(commentSectionSource, /CommentList[\s\S]*CommentComposer/);
	assert.match(commentSectionSource, /setComposerNotice/);
	assert.match(commentSectionSource, /setCommentNotice/);
	assert.match(commentSectionSource, /activeCommentNoticeId/);
	assert.match(commentSectionSource, /commentNoticeMessage/);
	assert.doesNotMatch(commentSectionSource, /\{#if submitError\}/);
	assert.doesNotMatch(commentSectionSource, /\{#if submitNotice\}/);
	assert.match(commentSectionSource, /card-base/);
	assert.match(inlineCommentCaptchaSource, /captchaState/);
	assert.match(inlineCommentCaptchaSource, /captchaBusy/);
	assert.match(inlineCommentCaptchaSource, /captchaError/);
	assert.match(inlineCommentCaptchaSource, /captchaPrompt/);
	assert.match(inlineCommentCaptchaSource, /compact/);
	assert.match(inlineCommentCaptchaSource, /export let variant: "card" \| "inline" = "card"/);
	assert.match(inlineCommentCaptchaSource, /variant === "inline"/);
	assert.match(inlineCommentCaptchaSource, /onRefreshCaptcha/);
	assert.match(inlineCommentCaptchaSource, /onVerifyCaptcha/);
	assert.match(inlineCommentCaptchaSource, /commentsCaptcha/);
	assert.match(inlineCommentCaptchaSource, /commentsCaptchaVerified/);
	assert.match(inlineCommentCaptchaSource, /commentsCaptchaUnsupported/);
	assert.match(inlineCommentCaptchaSource, /CommentCaptchaHost/);
	assert.match(inlineCommentCaptchaSource, /InlineFeedbackNotice/);
	assert.match(inlineCommentCaptchaSource, /getAutoDismissMs/);
	assert.match(inlineCommentCaptchaSource, /setTimeout\(/);
	assert.doesNotMatch(inlineCommentCaptchaSource, /6000/);
	assert.match(inlineCommentCaptchaSource, /onDismiss/);
	assert.match(inlineCommentCaptchaSource, /in:fade/);
	assert.match(commentCaptchaHostSource, /CommentCaptchaInlineValue/);
	assert.match(commentCaptchaHostSource, /CommentCaptchaIframeWidget/);
	assert.match(commentCaptchaHostSource, /export let inline = false/);
	assert.match(commentCaptchaHostSource, /challenge\?\.mode === "inline_value"/);
	assert.match(commentCaptchaHostSource, /challenge\?\.mode === "iframe_widget"/);
	assert.match(commentCaptchaHostSource, /inline=\{inline\}/);
	assert.match(commentCaptchaHostSource, /iframeSrc/);
	assert.match(commentCaptchaInlineValueSource, /imageData/);
	assert.match(commentCaptchaInlineValueSource, /export let inline = false/);
	assert.match(commentCaptchaInlineValueSource, /onRefresh/);
	assert.match(commentCaptchaInlineValueSource, /onVerify/);
	assert.match(commentCaptchaInlineValueSource, /class:mt-2=\{!inline\}/);
	assert.match(commentCaptchaInlineValueSource, /commentsCaptchaRefresh/);
	assert.match(commentCaptchaInlineValueSource, /commentsCaptchaVerify/);
	assert.match(commentCaptchaIframeWidgetSource, /iframe/);
	assert.match(commentCaptchaIframeWidgetSource, /onRefresh/);
	assert.match(commentCaptchaIframeWidgetSource, /onCancel/);
	assert.match(commentCaptchaIframeWidgetSource, /max-w-xl/);
	assert.match(commentCaptchaIframeWidgetSource, /h-40/);
	assert.doesNotMatch(commentCaptchaIframeWidgetSource, /h-84 w-full/);
	assert.match(commentComposerSource, /authorName|authorEmail|content/);
	assert.match(commentComposerSource, /EmojiPicker/);
	assert.match(commentComposerSource, /InlineCommentCaptcha/);
	assert.match(commentComposerSource, /showCaptcha/);
	assert.match(commentComposerSource, /InlineFeedbackNotice/);
	assert.match(commentComposerSource, /noticeMessage/);
	assert.match(commentComposerSource, /noticeTone/);
	assert.match(
		commentComposerSource,
		/import \{ fade, scale, slide \} from "svelte\/transition"/,
	);
	assert.match(
		commentComposerSource,
		/\{#if noticeMessage\}[\s\S]*message=\{noticeMessage\}[\s\S]*<div class="flex items-start justify-between gap-3 mb-4">/,
	);
	assert.match(
		commentComposerSource,
		/\{#if validationError\}[\s\S]*message=\{validationError\}[\s\S]*<div class="flex items-start justify-between gap-3 mb-4">/,
	);
	assert.doesNotMatch(
		commentComposerSource,
		/comment-composer-actions[\s\S]*message=\{noticeMessage\}/,
	);
	assert.doesNotMatch(
		commentComposerSource,
		/comment-composer-actions[\s\S]*message=\{validationError\}/,
	);
	assert.match(commentComposerSource, /getAutoDismissMs/);
	assert.match(commentComposerSource, /captchaState/);
	assert.match(commentComposerSource, /captchaBusy/);
	assert.match(commentComposerSource, /captchaError/);
	assert.match(commentComposerSource, /captchaPrompt/);
	assert.match(commentComposerSource, /onRefreshCaptcha/);
	assert.match(commentComposerSource, /onVerifyCaptcha/);
	assert.match(commentComposerSource, /onPollCaptchaStatus/);
	assert.match(commentComposerSource, /onDismissCaptcha/);
	assert.match(commentComposerSource, /<InlineCommentCaptcha[\s\S]*variant="inline"/);
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
	assert.match(commentComposerSource, /transition:slide/);
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
	assert.match(
		commentComposerSource,
		/setValidationErrorNotice\(i18n\(validationResult\)\)/,
	);
	assert.match(commentComposerSource, /requiredFields/);
	assert.match(commentComposerSource, /allowedFields/);
	assert.match(commentComposerSource, /formatFieldLabel\(/);
	assert.match(commentComposerSource, /commentsFormOptionalSuffix/);
	assert.match(commentComposerSource, /showNameField = allowedFields\.includes\("nickname"\)/);
	assert.match(commentComposerSource, /showEmailField = allowedFields\.includes\("email"\)/);
	assert.match(commentComposerSource, /showWebsiteField = allowedFields\.includes\("website"\)/);
	assert.match(commentComposerSource, /requiredFields\.includes\("nickname"\)/);
	assert.match(commentComposerSource, /requiredFields\.includes\("email"\)/);
	assert.match(commentComposerSource, /requiredFields\.includes\("website"\)/);
	assert.match(commentComposerSource, /\{#if showEmailField\}/);
	assert.match(commentComposerSource, /\{#if showWebsiteField\}/);
	assert.match(commentListSource, /CommentItem/);
	assert.match(mainCssSource, /\.comment-sort-tab \{/);
	assert.match(mainCssSource, /\.comment-sort-tab-active \{/);
	assert.match(mainCssSource, /\.comment-sort-tab:disabled \{/);
	assert.match(mainCssSource, /\.comments-content-shell \{/);
	assert.doesNotMatch(mainCssSource, /\.comments-content-shell-stable-empty \{/);
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
	assert.match(commentListSource, /export let activeCommentNoticeId/);
	assert.match(commentListSource, /export let commentNoticeMessage/);
	assert.match(commentListSource, /export let onPollCaptchaStatus/);
	assert.doesNotMatch(commentListSource, /createEventDispatcher/);
	assert.match(commentItemSource, /onReply|commentsReply|commentsCancelReply/);
	assert.match(commentItemSource, /InlineCommentCaptcha/);
	assert.match(commentItemSource, /InlineFeedbackNotice/);
	assert.match(commentItemSource, /activeCommentNoticeId/);
	assert.match(commentItemSource, /commentNoticeMessage/);
	assert.match(commentItemSource, /comment-action/);
	assert.match(commentItemSource, /onReply\?\.\(comment\.id\)/);
	assert.doesNotMatch(commentItemSource, /createEventDispatcher/);
	assert.match(commentItemSource, /depth < maxDepth/);
	assert.match(commentItemSource, /supportsVote/);
	assert.match(commentItemSource, /activeCaptchaCommentId/);
	assert.match(commentItemSource, /comment\.id === activeCaptchaCommentId/);
	assert.match(commentItemSource, /onDismissCaptcha/);
	assert.match(commentItemSource, /onPollCaptchaStatus/);
	assert.match(commentItemSource, /transition:slide/);
	assert.match(commentItemSource, /comment-actions-shell/);
	assert.match(commentItemSource, /comment-action-anchor/);
	assert.match(commentItemSource, /comment-vote-popover-wrap/);
	assert.match(commentItemSource, /comment-vote-popover-wrap-start/);
	assert.match(commentItemSource, /comment-vote-popover-wrap-end/);
	assert.match(commentItemSource, /comment-vote-popover/);
	assert.match(
		commentItemSource,
		/pendingVoteChoice === "up"[\s\S]*comment-vote-popover-wrap comment-vote-popover-wrap-start/,
	);
	assert.match(
		commentItemSource,
		/pendingVoteChoice === "down"[\s\S]*comment-vote-popover-wrap comment-vote-popover-wrap-end/,
	);
	assert.match(commentItemSource, /in:scale/);
	assert.match(commentItemSource, /out:scale/);
	assert.match(commentItemSource, /voteUp|voteDown/);
	assert.match(commentItemSource, /comment-body/);
	assert.match(commentItemSource, /comment-root/);
	assert.match(commentItemSource, /comment-nested/);
	assert.match(emojiPickerSource, /export let onSelect/);
	assert.doesNotMatch(emojiPickerSource, /createEventDispatcher/);
	assert.match(mainCssSource, /\.comment-action\s*\{/);
	assert.match(mainCssSource, /\.comment-action-icon\s*\{/);
	assert.match(mainCssSource, /\.comment-action-active\s*\{/);
	assert.match(mainCssSource, /\.comment-actions-shell\s*\{/);
	assert.match(mainCssSource, /\.comment-action-anchor\s*\{/);
	assert.match(mainCssSource, /\.comment-vote-popover-wrap\s*\{/);
	assert.match(mainCssSource, /\.comment-vote-popover-wrap-start\s*\{/);
	assert.match(mainCssSource, /\.comment-vote-popover-wrap-end\s*\{/);
	assert.match(mainCssSource, /\.comment-vote-popover\s*\{/);
	assert.match(mainCssSource, /\.comment-vote-popover::before\s*\{/);
	assert.doesNotMatch(
		mainCssSource,
		/\.comment-vote-popover-wrap\s*\{[\s\S]*max-width:\s*100%;/,
	);
	assert.match(
		mainCssSource,
		/\.comment-vote-popover\s*\{[\s\S]*background-color: var\(--float-panel-bg\);[\s\S]*transform-origin: top left;/,
	);
	assert.match(
		mainCssSource,
		/\.comment-vote-popover-wrap-end \.comment-vote-popover::before\s*\{/,
	);
	assert.match(tailwindThemeSource, /@utility text-60\s*\{/);
	assert.match(
		tailwindThemeSource,
		/@utility text-60\s*\{[\s\S]*color:\s*rgb\(0 0 0 \/ 0\.6\);[\s\S]*@variant dark \{[\s\S]*color:\s*rgb\(255 255 255 \/ 0\.6\);/,
	);
	assert.match(postPageSource, /CommentSection[\s\S]*client:only="svelte"/);
	assert.match(postPageSource, /getPostKeyFromEntry\(entry.id\)/);
	assert.match(postPageSource, /commentConfig\.enable && commentConfig\.qingyan/);
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
		"commentsCaptchaCancel",
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
		"commentsFormOptionalSuffix",
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

	assert.doesNotMatch(enSource, /now requires captcha verification/);
});
