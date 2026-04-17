<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onDestroy, onMount } from "svelte";

export let iframeSrc = "";
export let captchaBusy = false;
export let onRefresh: (() => void | Promise<void>) | null = null;
export let onCancel: (() => void) | null = null;
export let onPollCaptchaStatus: (() => void | Promise<void>) | null = null;

let pollTimer: ReturnType<typeof setInterval> | null = null;

onMount(() => {
	pollTimer = setInterval(() => {
		void onPollCaptchaStatus?.();
	}, 1000);
});

onDestroy(() => {
	if (pollTimer) {
		clearInterval(pollTimer);
	}
});
</script>

<div class="mt-2 space-y-3">
	<iframe
		class="mx-auto block h-40 w-full max-w-xl rounded-xl border border-line-divider bg-card-bg"
		referrerpolicy="strict-origin-when-cross-origin"
		src={iframeSrc}
		title={i18n(I18nKey.commentsCaptcha)}
	></iframe>
	<div class="flex flex-wrap gap-2">
		<button
			type="button"
			class="comment-action"
			disabled={captchaBusy}
			on:click={() => void onRefresh?.()}
		>
			{i18n(I18nKey.commentsCaptchaRefresh)}
		</button>
		<button type="button" class="comment-action" on:click={() => onCancel?.()}>
			{i18n(I18nKey.commentsCaptchaCancel)}
		</button>
	</div>
</div>
