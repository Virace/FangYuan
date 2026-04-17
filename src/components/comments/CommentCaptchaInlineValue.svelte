<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

export let imageData: string | null = null;
export let captchaBusy = false;
export let value = "";
export let placeholder = "";
export let inline = false;
export let onRefresh: (() => void | Promise<void>) | null = null;
export let onVerify: ((value: string) => void | Promise<void>) | null = null;

function handleVerify() {
	void onVerify?.(value.trim());
}
</script>

<div class="flex flex-wrap items-center gap-2" class:mt-2={!inline}>
	<button
		type="button"
		class="rounded-md border border-line-divider bg-white/80 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60"
		aria-label={i18n(I18nKey.commentsCaptchaRefresh)}
		disabled={captchaBusy}
		title={i18n(I18nKey.commentsCaptchaRefresh)}
		on:click={() => void onRefresh?.()}
	>
		{#if imageData}
			<img alt="" class="block h-10 w-auto object-contain" src={imageData} />
		{:else}
			<span class="text-xs text-60">{i18n(I18nKey.commentsCaptchaRefresh)}</span>
		{/if}
	</button>
	<input
		bind:value
		class="min-w-24 flex-1 rounded-xl border border-line-divider bg-card-bg px-3 py-2 text-sm text-90 outline-none md:max-w-36"
		placeholder={placeholder || i18n(I18nKey.commentsCaptcha)}
		type="text"
	/>
	<button
		type="button"
		class="comment-action"
		disabled={captchaBusy}
		on:click={handleVerify}
	>
		{i18n(I18nKey.commentsCaptchaVerify)}
	</button>
</div>
