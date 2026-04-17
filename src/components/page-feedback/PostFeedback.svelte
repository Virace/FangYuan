<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import {
	CommentCaptchaRequiredError,
	type CommentCaptchaState,
	type VerifyCommentCaptchaInput,
} from "@utils/comments/provider";
import { type AutoDismissTone, getAutoDismissMs } from "@utils/notice";
import type {
	PageFeedbackCapability,
	RewardOption,
} from "@utils/page-feedback/provider";
import { getQingYanClient } from "@utils/qingyan/client";
import { onDestroy, onMount } from "svelte";
import { fade, slide } from "svelte/transition";
import InlineCommentCaptcha from "../comments/InlineCommentCaptcha.svelte";
import InlineFeedbackNotice from "../misc/InlineFeedbackNotice.svelte";
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
let captchaBusy = false;
let noticeMessage = "";
let noticeTone: AutoDismissTone = "info";
let captchaError = "";
let captchaPrompt = "";
let rewardOpen = false;
let captchaState = null as CommentCaptchaState | null;
let showCaptcha = false;
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
let captchaFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

$: showLike = capability?.supportsLike ?? false;
$: showReward = rewardOptions.length > 0;
$: showCard = showLike || showReward;

function clearNoticeTimer() {
	if (noticeTimer) {
		clearTimeout(noticeTimer);
		noticeTimer = null;
	}
}

function clearCaptchaFeedbackTimer() {
	if (captchaFeedbackTimer) {
		clearTimeout(captchaFeedbackTimer);
		captchaFeedbackTimer = null;
	}
}

function setNotice(message: string, tone: AutoDismissTone) {
	noticeMessage = message;
	noticeTone = tone;
	clearNoticeTimer();
	noticeTimer = setTimeout(
		() => {
			noticeMessage = "";
		},
		getAutoDismissMs(message, tone),
	);
}

function clearCaptchaFeedback() {
	captchaPrompt = "";
	captchaError = "";
	clearCaptchaFeedbackTimer();
}

function setCaptchaPrompt(message: string) {
	captchaPrompt = message;
	captchaError = "";
	clearCaptchaFeedbackTimer();
	captchaFeedbackTimer = setTimeout(
		() => {
			captchaPrompt = "";
		},
		getAutoDismissMs(message, "info"),
	);
}

function setCaptchaError(message: string) {
	captchaError = message;
	clearCaptchaFeedbackTimer();
	captchaFeedbackTimer = setTimeout(
		() => {
			captchaError = "";
		},
		getAutoDismissMs(message, "error"),
	);
}

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
			captchaState = payload.captcha;
		})
		.catch(() => {
			setNotice(i18n(I18nKey.pageFeedbackLikeFailed), "error");
		})
		.finally(() => {
			loading = false;
		});
});

async function handleLike() {
	if (!qingyanClient || !showLike || liked || likeBusy) {
		return;
	}

	if (captchaState?.required && !captchaState.verified) {
		showCaptcha = true;
		noticeMessage = "";
		clearNoticeTimer();
		setCaptchaPrompt(i18n(I18nKey.commentsCaptchaRequiredTip));
		return;
	}

	likeBusy = true;
	noticeMessage = "";
	clearNoticeTimer();

	try {
		const nextState = await qingyanClient.likePage({
			pageKey: postKey,
			pageTitle: postTitle,
			pageUrl: postUrl,
		});
		likeCount = nextState.likeCount;
		liked = nextState.liked;
		showCaptcha = false;
		clearCaptchaFeedback();
		captchaState = null;
	} catch (caughtError) {
		if (caughtError instanceof CommentCaptchaRequiredError) {
			captchaState = caughtError.state;
			showCaptcha = true;
			setCaptchaPrompt(i18n(I18nKey.commentsCaptchaRequiredTip));
			return;
		}
		setNotice(i18n(I18nKey.pageFeedbackLikeFailed), "error");
	} finally {
		likeBusy = false;
	}
}

function handleDismissCaptcha() {
	showCaptcha = false;
	clearCaptchaFeedback();
}

async function handleRefreshCaptcha() {
	if (!qingyanClient) {
		return;
	}

	captchaBusy = true;
	captchaError = "";

	try {
		captchaState = await qingyanClient.refreshCaptcha({
			pageKey: postKey,
			pageTitle: postTitle,
			pageUrl: postUrl,
		});
	} catch {
		setCaptchaError(i18n(I18nKey.commentsLoadFailed));
	} finally {
		captchaBusy = false;
	}
}

async function handleVerifyCaptcha(input: VerifyCommentCaptchaInput) {
	if (!qingyanClient) {
		return;
	}

	captchaBusy = true;
	captchaError = "";

	try {
		captchaState = await qingyanClient.verifyCaptcha({
			pageKey: postKey,
			pageTitle: postTitle,
			pageUrl: postUrl,
			captchaState,
			verification: input,
		});
		if (!captchaState?.verified) {
			setCaptchaError(i18n(I18nKey.commentsCaptchaVerifyFailed));
		}
	} catch {
		setCaptchaError(i18n(I18nKey.commentsCaptchaVerifyFailed));
	} finally {
		captchaBusy = false;
	}
}

onDestroy(() => {
	clearNoticeTimer();
	clearCaptchaFeedbackTimer();
});
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

			<div class="flex w-full flex-col gap-3 lg:w-auto lg:min-w-96 lg:items-end">
				<div class="flex flex-wrap items-center gap-3 lg:justify-end">
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

				{#if noticeMessage}
					<div class="w-full">
						<InlineFeedbackNotice
							message={noticeMessage}
							tone={noticeTone}
							duration={180}
						/>
					</div>
				{/if}

				{#if showCaptcha && captchaState}
					<div
						class="w-full overflow-hidden lg:max-w-96"
						transition:slide={{ duration: 180 }}
					>
						<div in:fade={{ duration: 180 }} out:fade={{ duration: 180 }}>
							<InlineCommentCaptcha
								compact={true}
								captchaState={captchaState}
								captchaBusy={captchaBusy}
								captchaError={captchaError}
								captchaPrompt={captchaPrompt}
								onDismiss={handleDismissCaptcha}
								onRefreshCaptcha={handleRefreshCaptcha}
								onVerifyCaptcha={handleVerifyCaptcha}
							/>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<RewardModal
		open={rewardOpen}
		options={rewardOptions}
		onClose={() => (rewardOpen = false)}
	/>
{/if}
