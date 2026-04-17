<script lang="ts">
import type { CommentCaptchaState } from "@utils/comments/provider";
import CommentCaptchaIframeWidget from "./CommentCaptchaIframeWidget.svelte";
import CommentCaptchaInlineValue from "./CommentCaptchaInlineValue.svelte";

export let captchaState: CommentCaptchaState | null = null;
export let captchaBusy = false;
export let captchaValue = "";
export let onRefreshCaptcha: (() => void | Promise<void>) | null = null;
export let onVerifyCaptchaValue:
	| ((value: string) => void | Promise<void>)
	| null = null;
export let onPollCaptchaStatus: (() => void | Promise<void>) | null = null;
export let onCancelCaptcha: (() => void) | null = null;

$: challenge = captchaState?.challenge ?? null;
</script>

{#if challenge?.mode === "inline_value"}
	<CommentCaptchaInlineValue
		bind:value={captchaValue}
		imageData={challenge.imageData ?? null}
		captchaBusy={captchaBusy}
		placeholder={challenge.placeholder ?? ""}
		onRefresh={onRefreshCaptcha}
		onVerify={onVerifyCaptchaValue}
	/>
{:else if challenge?.mode === "iframe_widget"}
	{#key challenge.refreshToken ?? challenge.iframeSrc}
		<CommentCaptchaIframeWidget
			iframeSrc={challenge.iframeSrc}
			captchaBusy={captchaBusy}
			onRefresh={onRefreshCaptcha}
			onCancel={onCancelCaptcha}
			onPollCaptchaStatus={onPollCaptchaStatus}
		/>
	{/key}
{/if}
