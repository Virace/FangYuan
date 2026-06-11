<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { RewardOption } from "@utils/page-feedback/provider";
import { onDestroy, tick } from "svelte";

export let open = false;
export let options: RewardOption[] = [];
export let onClose: (() => void) | null = null;

let dialogEl: HTMLDialogElement | null = null;
let activeRewardId = "";
let modalActive = false;
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let mountedRewardIds: ReadonlySet<string> = new Set();
let presentedRewardIds: ReadonlySet<string> = new Set();

$: if (!activeRewardId && options.length > 0) {
	activeRewardId = options[0].id;
}

$: activeOption =
	options.find((option) => option.id === activeRewardId) ?? options[0] ?? null;

$: if (open && activeOption?.image && !mountedRewardIds.has(activeOption.id)) {
	mountedRewardIds = new Set(mountedRewardIds).add(activeOption.id);
}

$: if (open && dialogEl && !dialogEl.open) {
	void openDialog();
}

$: if (!open && dialogEl?.open) {
	closeDialog(false);
}

async function openDialog() {
	if (!dialogEl) {
		return;
	}

	if (closeTimer) {
		clearTimeout(closeTimer);
		closeTimer = null;
	}

	if (!dialogEl.open) {
		dialogEl.showModal();
	}

	modalActive = false;
	await tick();
	requestAnimationFrame(() => {
		modalActive = true;
	});
}

function closeDialog(notify = true) {
	if (!dialogEl?.open) {
		return;
	}

	modalActive = false;
	if (closeTimer) {
		clearTimeout(closeTimer);
	}
	closeTimer = setTimeout(() => {
		dialogEl?.close();
		closeTimer = null;
		if (notify) {
			onClose?.();
		}
	}, 180);
}

function handleBackdropClick(event: MouseEvent) {
	if (event.target === dialogEl) {
		closeDialog();
	}
}

function presentRewardImage(id: string) {
	if (presentedRewardIds.has(id)) {
		return;
	}

	presentedRewardIds = new Set(presentedRewardIds).add(id);
}

onDestroy(() => {
	if (closeTimer) {
		clearTimeout(closeTimer);
	}
});
</script>

<dialog
	bind:this={dialogEl}
	class="feedback-dialog"
	data-open={modalActive ? "true" : "false"}
	on:cancel|preventDefault={() => closeDialog()}
	on:click={handleBackdropClick}
>
	<div
		class="feedback-dialog-panel card-base border border-line-divider bg-card-bg text-75 shadow-[0_32px_90px_-40px_rgb(15_23_42/0.45)]"
		class:feedback-dialog-panel-open={modalActive}
	>
		<div class="flex items-start justify-between gap-4 border-b border-line-divider px-6 py-5">
			<div>
				<p class="text-xs font-semibold uppercase tracking-[0.2em] text-50">
					{i18n(I18nKey.pageFeedbackReward)}
				</p>
				<h3 class="mt-2 text-2xl font-bold tracking-tight text-90">
					{i18n(I18nKey.pageFeedbackRewardTitle)}
				</h3>
				<p class="mt-2 max-w-120 text-sm leading-7 text-50">
					{i18n(I18nKey.pageFeedbackRewardDescription)}
				</p>
			</div>
			<button
				type="button"
				class="btn-plain rounded-full border border-line-divider px-4 py-2 text-sm font-medium"
				aria-label={i18n(I18nKey.pageFeedbackClose)}
				on:click={() => closeDialog()}
			>
				{i18n(I18nKey.pageFeedbackClose)}
			</button>
		</div>

		<div class="px-6 py-6">
			{#if options.length > 0 && activeOption}
				<div class="mb-5 inline-flex rounded-full border border-line-divider bg-soft-contrast p-1">
					{#each options as option (option.id)}
						<button
							type="button"
							class="rounded-full px-4 py-2 text-sm font-medium text-75 transition"
							class:bg-card-bg={option.id === activeRewardId}
							class:text-primary={option.id === activeRewardId}
							on:click={() => (activeRewardId = option.id)}
						>
							{option.name}
						</button>
					{/each}
				</div>

				<div class="rounded-[1.75rem] border border-line-divider bg-soft-contrast p-4">
					<div
						class="relative flex min-h-80 items-center justify-center rounded-[1.25rem] bg-card-bg p-4"
					>
						{#each options as option (option.id)}
							{#if option.image && mountedRewardIds.has(option.id)}
							<img
								class="feedback-reward-image h-72 w-72 rounded-xl object-contain"
								class:hidden={option.id !== activeRewardId}
								class:feedback-reward-image-presented={presentedRewardIds.has(
									option.id,
								)}
								src={option.image}
								alt={option.alt ?? option.name}
								aria-hidden={option.id !== activeRewardId}
								on:load={() => presentRewardImage(option.id)}
								on:error={() => presentRewardImage(option.id)}
							/>
							{/if}
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</dialog>
