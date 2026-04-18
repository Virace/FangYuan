<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { tick } from "svelte";

export let imageData: string | null = null;
export let captchaBusy = false;
export let value = "";
export let placeholder = "";
export let inline = false;
export let stacked = false;
export let autoFocus = false;
export let onRefresh: (() => void | Promise<void>) | null = null;
export let onSubmit: (() => void | Promise<void>) | null = null;

let inputEl: HTMLInputElement | null = null;
let lastFocusToken = "";

function handleKeydown(event: KeyboardEvent) {
	if (event.key !== "Enter" || !onSubmit) {
		return;
	}

	event.preventDefault();
	void onSubmit();
}

async function focusInput(token: string) {
	await tick();
	if (lastFocusToken !== token) {
		return;
	}

	inputEl?.focus();
	inputEl?.select();
}

$: {
	const nextFocusToken = autoFocus
		? `${imageData ?? "no-image"}:${placeholder}`
		: "";
	if (nextFocusToken && nextFocusToken !== lastFocusToken) {
		lastFocusToken = nextFocusToken;
		void focusInput(nextFocusToken);
	}
}
</script>

<div
	class="flex gap-2"
	class:mt-2={!inline}
	class:flex-wrap={!stacked}
	class:items-center={!stacked}
	class:flex-col={stacked}
	class:items-stretch={stacked}
	class:gap-3={stacked}
>
	<button
		type="button"
		class="rounded-md border border-line-divider bg-white/80 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60"
		class:self-start={stacked}
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
		bind:this={inputEl}
		bind:value
		class="comment-form-input text-sm text-90"
		class:min-w-24={!inline}
		class:flex-1={!inline}
		class:min-w-32={inline}
		class:w-32={inline}
		class:md:max-w-36={!inline}
		class:w-full={stacked}
		placeholder={placeholder || i18n(I18nKey.commentsCaptcha)}
		type="text"
		inputmode="numeric"
		on:keydown={handleKeydown}
	/>
</div>
