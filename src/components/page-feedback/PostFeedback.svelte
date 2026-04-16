<script lang="ts">
	import Icon from "@iconify/svelte";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import { getPageFeedbackClient } from "@utils/page-feedback/client";
	import type { RewardOption } from "@utils/page-feedback/provider";
	import { onMount } from "svelte";
	import RewardModal from "./RewardModal.svelte";

	export let postKey: string;
	export let postTitle = "";
	export let rewardOptions: RewardOption[] = [];

	const pageFeedbackClient = getPageFeedbackClient();

	let likeCount = 0;
	let liked = false;
	let loading = true;
	let likeBusy = false;
	let error = "";
	let rewardOpen = false;

	const showLike = !!pageFeedbackClient;
	$: showReward = rewardOptions.length > 0;
	$: showCard = showLike || showReward;

	onMount(() => {
		if (!pageFeedbackClient) {
			loading = false;
			return;
		}

		void pageFeedbackClient
			.getState({ postKey, postTitle })
			.then((state) => {
				likeCount = state.likeCount;
				liked = state.liked;
			})
			.catch(() => {
				error = i18n(I18nKey.pageFeedbackLikeFailed);
			})
			.finally(() => {
				loading = false;
			});
	});

	async function handleLike() {
		if (!pageFeedbackClient || liked || likeBusy) {
			return;
		}

		likeBusy = true;
		error = "";

		try {
			const nextState = await pageFeedbackClient.likePage({
				postKey,
				postTitle,
			});
			likeCount = nextState.likeCount;
			liked = nextState.liked;
		} catch {
			error = i18n(I18nKey.pageFeedbackLikeFailed);
		} finally {
			likeBusy = false;
		}
	}
</script>

{#if showCard}
	<section class="card-base mb-6 rounded-panel border border-line-divider px-4 py-5 md:px-6">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
			<div class="min-w-0 flex-1">
				<h2 class="text-xl font-bold tracking-tight text-90 md:text-2xl">
					{i18n(I18nKey.pageFeedbackRewardTitle)}
				</h2>
				<p class="mt-2 max-w-[44rem] text-sm leading-7 text-50 md:text-base">
					{i18n(I18nKey.pageFeedbackRewardDescription)}
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-3 lg:flex-nowrap lg:justify-end">
				{#if showLike}
					<button
						type="button"
						class="btn-card inline-flex h-11 items-center gap-2 rounded-full border border-line-divider px-4 text-sm font-semibold text-75 shadow-sm"
						class:border-primary={liked}
						class:text-primary={liked}
						class:bg-btn-plain-bg-hover={liked}
						disabled={loading || likeBusy || liked}
						aria-pressed={liked}
						on:click={handleLike}
					>
						<Icon
							icon={liked ? "material-symbols:thumb-up-rounded" : "material-symbols:thumb-up-outline-rounded"}
							class="text-lg"
						/>
						<span class="whitespace-nowrap">
							{liked ? i18n(I18nKey.pageFeedbackLiked) : i18n(I18nKey.pageFeedbackLike)}
							{" "}
							{likeCount}
						</span>
					</button>
				{/if}

				{#if showReward}
					<button
						type="button"
						class="btn-card inline-flex h-11 items-center gap-2 rounded-full border border-line-divider px-4 text-sm font-semibold text-75 shadow-sm"
						on:click={() => (rewardOpen = true)}
					>
						<span aria-hidden="true" class="text-base leading-none">☕</span>
						<span class="whitespace-nowrap">{i18n(I18nKey.pageFeedbackReward)}</span>
					</button>
				{/if}
			</div>
		</div>

		{#if error}
			<p class="mt-4 text-sm text-red-500">{error}</p>
		{/if}
	</section>

	<RewardModal
		open={rewardOpen}
		options={rewardOptions}
		onClose={() => (rewardOpen = false)}
	/>
{/if}
