<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import type {
	PageFeedbackCapability,
	RewardOption,
} from "@utils/page-feedback/provider";
import { getQingYanClient } from "@utils/qingyan/client";
import { onMount } from "svelte";
import RewardModal from "./RewardModal.svelte";

export let postKey: string;
export let postTitle = "";
export let postUrl = "";
export let rewardOptions: RewardOption[] = [];

const qingyanClient = getQingYanClient();

let capability: PageFeedbackCapability | null = null;
let likeCount = 0;
let liked = false;
let loading = true;
let likeBusy = false;
let error = "";
let rewardOpen = false;

$: showLike = capability?.supportsLike ?? false;
$: showReward = rewardOptions.length > 0;
$: showCard = showLike || showReward;

onMount(() => {
	if (!qingyanClient) {
		loading = false;
		return;
	}

	void qingyanClient
		.fetchPostEngagementBootstrap({
			pageKey: postKey,
			pageTitle: postTitle,
			pageUrl: postUrl,
		})
		.then((payload) => {
			capability = {
				supportsLike: payload.pageFeedback.supportsLike,
			};
			likeCount = payload.pageFeedback.likeCount;
			liked = payload.pageFeedback.liked;
		})
		.catch(() => {
			error = i18n(I18nKey.pageFeedbackLikeFailed);
		})
		.finally(() => {
			loading = false;
		});
});

async function handleLike() {
	if (!qingyanClient || !showLike || liked || likeBusy) {
		return;
	}

	likeBusy = true;
	error = "";

	try {
		const nextState = await qingyanClient.likePage({
			pageKey: postKey,
			pageTitle: postTitle,
			pageUrl: postUrl,
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
				<p class="text-base font-semibold text-90 md:text-lg">
					{i18n(I18nKey.pageFeedbackRewardTitle)}
				</p>
				<p class="mt-1.5 max-w-176 text-xs leading-6 text-50 md:text-sm">
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
