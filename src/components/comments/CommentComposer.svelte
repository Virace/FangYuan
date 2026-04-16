<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import type {
	CommentCaptchaState,
	VerifyCommentCaptchaInput,
} from "@utils/comments/provider";
import { validateCommentForm } from "@utils/comments/validation";
import { fade } from "svelte/transition";
import EmojiPicker from "./EmojiPicker.svelte";
import InlineCommentCaptcha from "./InlineCommentCaptcha.svelte";

type CommentComposerSubmitDetail = {
	authorName: string;
	authorEmail: string;
	authorWebsite: string;
	content: string;
};

export let submitting = false;
export let replyParentId: string | null = null;
export let showCaptcha = false;
export let captchaState: CommentCaptchaState | null = null;
export let captchaBusy = false;
export let captchaError = "";
export let captchaPrompt = "";
export let onSubmit:
	| ((detail: CommentComposerSubmitDetail) => boolean | Promise<boolean>)
	| null = null;
export let onDismissCaptcha: (() => void) | null = null;
export let onCancelReply: (() => void) | null = null;
export let onRefreshCaptcha: (() => void | Promise<void>) | null = null;
export let onVerifyCaptcha:
	| ((input: VerifyCommentCaptchaInput) => void | Promise<void>)
	| null = null;

let authorName = "";
let authorEmail = "";
let authorWebsite = "";
let content = "";
let validationError = "";
let showEmojiPicker = false;

$: canSubmit =
	!submitting &&
	authorName.trim().length > 0 &&
	authorEmail.trim().length > 0 &&
	content.trim().length > 0;

async function handleSubmit() {
	const validationResult = validateCommentForm({
		authorName,
		authorEmail,
		authorWebsite,
		content,
	});

	if (validationResult) {
		validationError = i18n(validationResult);
		return;
	}

	if (!canSubmit) {
		return;
	}

	validationError = "";
	const submitSucceeded = await onSubmit?.({
		authorName: authorName.trim(),
		authorEmail: authorEmail.trim(),
		authorWebsite: authorWebsite.trim(),
		content: content.trim(),
	});
	if (submitSucceeded) {
		content = "";
	}
}

function handleCancelReply() {
	validationError = "";
	showEmojiPicker = false;
	onCancelReply?.();
}

function insertEmoji(emoji: string) {
	content = `${content}${emoji}`;
	showEmojiPicker = false;
}
</script>

<form class="card-base rounded-panel p-5" on:submit|preventDefault={handleSubmit}>
	<div class="flex items-start justify-between gap-3 mb-4">
		<div>
			<h3 class="font-semibold text-90">{i18n(I18nKey.commentsSubmit)}</h3>
			{#if replyParentId}
				<p class="text-sm text-50">{i18n(I18nKey.commentsReplying)}</p>
			{/if}
		</div>
		{#if replyParentId}
			<button
				class="comment-action"
				type="button"
				on:click={handleCancelReply}
			>
				{i18n(I18nKey.commentsCancelReply)}
			</button>
		{/if}
	</div>

	{#if validationError}
		<p class="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
			{validationError}
		</p>
	{/if}

	<div class="grid gap-3 md:grid-cols-2">
		<label class="flex flex-col gap-1 text-sm text-50">
			<span>{i18n(I18nKey.commentsFormName)}</span>
			<input
				bind:value={authorName}
				class="rounded-xl border border-line-divider bg-card-bg px-3 py-2 text-90 outline-none"
				maxlength="80"
				required
				type="text"
			/>
		</label>

		<label class="flex flex-col gap-1 text-sm text-50">
			<span>{i18n(I18nKey.commentsFormEmail)}</span>
			<input
				bind:value={authorEmail}
				class="rounded-xl border border-line-divider bg-card-bg px-3 py-2 text-90 outline-none"
				maxlength="120"
				required
				type="email"
			/>
		</label>

		<label class="flex flex-col gap-1 text-sm text-50 md:col-span-2">
			<span>{i18n(I18nKey.commentsFormWebsite)}</span>
			<input
				bind:value={authorWebsite}
				class="rounded-xl border border-line-divider bg-card-bg px-3 py-2 text-90 outline-none"
				maxlength="200"
				type="url"
			/>
		</label>

		<label class="flex flex-col gap-1 text-sm text-50 md:col-span-2">
			<span>{i18n(I18nKey.commentsFormContent)}</span>
			<textarea
				bind:value={content}
				class="min-h-32 rounded-xl border border-line-divider bg-card-bg px-3 py-2 text-90 outline-none"
				maxlength="5000"
				required
			></textarea>
		</label>
	</div>

	<div class="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
		<div class="mr-auto">
			<button
				type="button"
				class="comment-action comment-action-icon"
				class:comment-action-active={showEmojiPicker}
				aria-label={i18n(I18nKey.commentsEmoji)}
				aria-controls="comment-emojis-panel"
				aria-expanded={showEmojiPicker}
				title={i18n(I18nKey.commentsEmoji)}
				on:click={() => (showEmojiPicker = !showEmojiPicker)}
			>
				<Icon icon="material-symbols:heart-smile-rounded" class="text-lg" />
			</button>
		</div>

		<div class="flex w-full flex-col gap-3 md:w-auto md:min-w-[32rem] md:flex-row md:items-center md:justify-end">
			{#if showCaptcha}
				<div
					class="w-full"
					data-comment-captcha-target="composer"
					in:fade={{ duration: 180 }}
					out:fade={{ duration: 180 }}
				>
					<InlineCommentCaptcha
						compact={true}
						captchaBusy={captchaBusy}
						captchaError={captchaError}
						captchaPrompt={captchaPrompt}
						captchaState={captchaState}
						onDismiss={onDismissCaptcha}
						onRefreshCaptcha={onRefreshCaptcha}
						onVerifyCaptcha={onVerifyCaptcha}
					/>
				</div>
			{/if}

			<button
				class="btn-regular rounded-xl px-4 h-10 text-sm font-medium md:shrink-0"
				disabled={!canSubmit}
				type="submit"
			>
				{#if submitting}
					{i18n(I18nKey.commentsSubmitting)}
				{:else}
					{i18n(I18nKey.commentsSubmit)}
				{/if}
			</button>
		</div>
	</div>

	{#if showEmojiPicker}
		<div id="comment-emojis-panel" class="mt-4 rounded-xl border border-line-divider p-3">
			<EmojiPicker onSelect={insertEmoji} />
		</div>
	{/if}
</form>
