<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type {
	CommentCaptchaState,
	VerifyCommentCaptchaInput,
} from "@utils/comments/provider";
import { onDestroy } from "svelte";
import { fade } from "svelte/transition";
import CommentCaptchaHost from "./CommentCaptchaHost.svelte";

const VERIFIED_MESSAGE_TIMEOUT_MS = 6000;

export let captchaState: CommentCaptchaState | null = null;
export let captchaBusy = false;
export let captchaError = "";
export let captchaPrompt = "";
export let compact = false;
export let onDismiss: (() => void) | null = null;
export let onRefreshCaptcha: (() => void | Promise<void>) | null = null;
export let onVerifyCaptcha:
	| ((input: VerifyCommentCaptchaInput) => void | Promise<void>)
	| null = null;
export let onPollCaptchaStatus: (() => void | Promise<void>) | null = null;

let captchaValue = "";
let validationError = "";
let showVerifiedNotice = false;
let previousVerified = false;
let verifiedNoticeTimer: ReturnType<typeof setTimeout> | null = null;

$: captchaChallenge = captchaState?.challenge ?? null;
$: if (captchaState?.verified) {
	captchaValue = "";
	validationError = "";
}
$: {
	const isVerified = Boolean(captchaState?.verified);
	if (isVerified && !previousVerified) {
		showVerifiedNotice = true;
		if (verifiedNoticeTimer) {
			clearTimeout(verifiedNoticeTimer);
		}
		verifiedNoticeTimer = setTimeout(() => {
			showVerifiedNotice = false;
			onDismiss?.();
		}, VERIFIED_MESSAGE_TIMEOUT_MS);
	}
	if (!isVerified) {
		showVerifiedNotice = false;
		if (verifiedNoticeTimer) {
			clearTimeout(verifiedNoticeTimer);
			verifiedNoticeTimer = null;
		}
	}
	previousVerified = isVerified;
}

onDestroy(() => {
	if (verifiedNoticeTimer) {
		clearTimeout(verifiedNoticeTimer);
	}
});

async function handleRefreshCaptcha() {
	validationError = "";
	await onRefreshCaptcha?.();
}

function handleVerifyCaptchaValue(value: string) {
	if (!value.trim()) {
		validationError = i18n(I18nKey.commentsValidationCaptchaRequired);
		return;
	}

	validationError = "";
	void onVerifyCaptcha?.({
		mode: "inline_value",
		value: value.trim(),
	});
}
</script>

<section
	class="rounded-panel border border-line-divider bg-card-bg p-3"
	class:px-4={!compact}
	class:py-4={!compact}
	in:fade={{ duration: 180 }}
	out:fade={{ duration: 180 }}
>
	<div class="flex flex-wrap items-center gap-2">
		<p class="text-xs font-medium text-90">{i18n(I18nKey.commentsCaptcha)}</p>
		{#if captchaPrompt}
			<p class="text-xs text-50">{captchaPrompt}</p>
		{/if}
		{#if showVerifiedNotice}
			<p class="text-xs text-primary">
				{i18n(I18nKey.commentsCaptchaVerified)}
			</p>
		{/if}
	</div>

	{#if captchaState && !captchaState.verified}
		{#if captchaChallenge?.mode === "token_widget"}
			<div class="mt-2">
				<button
					type="button"
					class="comment-action"
					aria-label={i18n(I18nKey.commentsCaptchaUnsupported)}
					disabled={captchaBusy}
					on:click={handleRefreshCaptcha}
				>
					{i18n(I18nKey.commentsCaptchaRefresh)}
				</button>
			</div>
		{:else}
			<CommentCaptchaHost
				bind:captchaValue
				{captchaState}
				{captchaBusy}
				onRefreshCaptcha={handleRefreshCaptcha}
				onVerifyCaptchaValue={handleVerifyCaptchaValue}
				onPollCaptchaStatus={onPollCaptchaStatus}
				onCancelCaptcha={onDismiss}
			/>
		{/if}

		{#if validationError}
			<p class="mt-2 text-xs text-red-500">{validationError}</p>
		{/if}

		{#if captchaError}
			<p class="mt-2 text-xs text-red-500">{captchaError}</p>
		{/if}
	{/if}
</section>
