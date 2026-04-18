<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { CommentCaptchaState } from "@utils/comments/provider";
import InlineFeedbackNotice from "../misc/InlineFeedbackNotice.svelte";
import CommentCaptchaHost from "./CommentCaptchaHost.svelte";

export let captchaState: CommentCaptchaState | null = null;
export let captchaBusy = false;
export let captchaError = "";
export let captchaPrompt = "";
export let compact = false;
export let variant: "card" | "popover" = "card";
export let captchaValue = "";
export let onRefreshCaptcha: (() => void | Promise<void>) | null = null;

$: captchaChallenge = captchaState?.challenge ?? null;
$: isPopoverLayout = variant === "popover";
</script>

<section
	class:rounded-panel={!isPopoverLayout}
	class:border={!isPopoverLayout}
	class:border-line-divider={!isPopoverLayout}
	class:bg-card-bg={!isPopoverLayout}
	class:p-3={!isPopoverLayout}
	class:px-4={!isPopoverLayout && !compact}
	class:py-4={!isPopoverLayout && !compact}
>
	{#if !isPopoverLayout}
		<p class="text-xs font-medium text-90">{i18n(I18nKey.commentsCaptcha)}</p>
	{/if}

	{#if captchaPrompt}
		<InlineFeedbackNotice
			message={captchaPrompt}
			tone="info"
			compact={true}
			duration={180}
			className={isPopoverLayout ? "" : "mt-2"}
		/>
	{/if}

	{#if captchaState && !captchaState.verified}
		<div class:mt-2={!isPopoverLayout}>
			{#if captchaChallenge?.mode === "token_widget"}
				<button
					type="button"
					class="comment-action"
					aria-label={i18n(I18nKey.commentsCaptchaUnsupported)}
					disabled={captchaBusy}
					on:click={() => void onRefreshCaptcha?.()}
				>
					{i18n(I18nKey.commentsCaptchaRefresh)}
				</button>
			{:else}
				<CommentCaptchaHost
					bind:captchaValue
					inline={true}
					{captchaState}
					{captchaBusy}
					onRefreshCaptcha={onRefreshCaptcha}
				/>
			{/if}
		</div>
	{/if}

	{#if captchaError}
		<InlineFeedbackNotice
			message={captchaError}
			tone="error"
			compact={true}
			duration={180}
			className="mt-2"
		/>
	{/if}
</section>
