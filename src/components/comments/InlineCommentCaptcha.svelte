<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type {
	CommentCaptchaState,
	VerifyCommentCaptchaInput,
} from "@utils/comments/provider";
import { getAutoDismissMs } from "@utils/notice";
import { onDestroy } from "svelte";
import { fade, slide } from "svelte/transition";
import InlineFeedbackNotice from "../misc/InlineFeedbackNotice.svelte";
import CommentCaptchaHost from "./CommentCaptchaHost.svelte";

const noticeTransitionDuration = 180;

export let captchaState: CommentCaptchaState | null = null;
export let captchaBusy = false;
export let captchaError = "";
export let captchaPrompt = "";
export let compact = false;
export let variant: "card" | "inline" = "card";
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
$: isInlineLayout = variant === "inline";
$: inlineShowsVerified = showVerifiedNotice || Boolean(captchaState?.verified);
$: inlineStatusMessage = inlineShowsVerified
	? i18n(I18nKey.commentsCaptchaVerified)
	: captchaPrompt || i18n(I18nKey.commentsCaptcha);
$: inlineStatusToneClass = inlineShowsVerified ? "text-primary" : "text-60";
$: if (captchaState?.verified) {
	captchaValue = "";
	validationError = "";
}
$: {
	const isVerified = Boolean(captchaState?.verified);
	if (isVerified && !previousVerified) {
		const verifiedMessage = i18n(I18nKey.commentsCaptchaVerified);
		showVerifiedNotice = true;
		if (verifiedNoticeTimer) {
			clearTimeout(verifiedNoticeTimer);
		}
		verifiedNoticeTimer = setTimeout(
			() => {
				showVerifiedNotice = false;
				setTimeout(() => {
					onDismiss?.();
				}, noticeTransitionDuration);
			},
			getAutoDismissMs(verifiedMessage, "success"),
		);
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
	class:w-full={isInlineLayout}
	class:rounded-panel={!isInlineLayout}
	class:border={!isInlineLayout}
	class:border-line-divider={!isInlineLayout}
	class:bg-card-bg={!isInlineLayout}
	class:p-3={!isInlineLayout}
	class:px-4={!isInlineLayout && !compact}
	class:py-4={!isInlineLayout && !compact}
>
	{#if isInlineLayout}
		<div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
			<div class="min-w-0 overflow-hidden md:flex-1">
				{#key `${showVerifiedNotice ? "verified" : "prompt"}:${inlineStatusMessage}`}
					<p
						class={`text-xs leading-6 ${inlineStatusToneClass}`}
						in:fade={{ duration: noticeTransitionDuration }}
						out:fade={{ duration: noticeTransitionDuration }}
					>
						{inlineStatusMessage}
					</p>
				{/key}
			</div>

			{#if captchaState && !captchaState.verified}
				<div
					class="w-full overflow-hidden md:w-auto md:max-w-full"
					transition:slide={{ duration: noticeTransitionDuration }}
				>
					<div
						in:fade={{ duration: noticeTransitionDuration }}
						out:fade={{ duration: noticeTransitionDuration }}
					>
						{#if captchaChallenge?.mode === "token_widget"}
							<button
								type="button"
								class="comment-action"
								aria-label={i18n(I18nKey.commentsCaptchaUnsupported)}
								disabled={captchaBusy}
								on:click={handleRefreshCaptcha}
							>
								{i18n(I18nKey.commentsCaptchaRefresh)}
							</button>
						{:else}
							<CommentCaptchaHost
								bind:captchaValue
								inline={true}
								{captchaState}
								{captchaBusy}
								onRefreshCaptcha={handleRefreshCaptcha}
								onVerifyCaptchaValue={handleVerifyCaptchaValue}
								onPollCaptchaStatus={onPollCaptchaStatus}
								onCancelCaptcha={onDismiss}
							/>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<p class="text-xs font-medium text-90">{i18n(I18nKey.commentsCaptcha)}</p>

		{#if captchaPrompt}
			<div class="mt-2">
				<InlineFeedbackNotice
					message={captchaPrompt}
					tone="info"
					compact={true}
					duration={noticeTransitionDuration}
				/>
			</div>
		{/if}

		{#if showVerifiedNotice}
			<div class="mt-2">
				<InlineFeedbackNotice
					message={i18n(I18nKey.commentsCaptchaVerified)}
					tone="success"
					compact={true}
					duration={noticeTransitionDuration}
				/>
			</div>
		{/if}

		{#if captchaState && !captchaState.verified}
			<div class="mt-2 overflow-hidden" transition:slide={{ duration: noticeTransitionDuration }}>
				<div
					in:fade={{ duration: noticeTransitionDuration }}
					out:fade={{ duration: noticeTransitionDuration }}
				>
					{#if captchaChallenge?.mode === "token_widget"}
						<button
							type="button"
							class="comment-action"
							aria-label={i18n(I18nKey.commentsCaptchaUnsupported)}
							disabled={captchaBusy}
							on:click={handleRefreshCaptcha}
						>
							{i18n(I18nKey.commentsCaptchaRefresh)}
						</button>
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
				</div>
			</div>
		{/if}
	{/if}

	{#if validationError}
		<div class="mt-2">
			<InlineFeedbackNotice
				message={validationError}
				tone="error"
				compact={true}
				duration={noticeTransitionDuration}
			/>
		</div>
	{/if}

	{#if captchaError}
		<div class="mt-2">
			<InlineFeedbackNotice
				message={captchaError}
				tone="error"
				compact={true}
				duration={noticeTransitionDuration}
			/>
		</div>
	{/if}
</section>
