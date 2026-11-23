<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getAutoDismissMs } from "@utils/browser/notice";
import { getPageNoticeScope, showNotice } from "@utils/browser/notifications";
import {
	CommentCaptchaRequiredError,
	type CommentCaptchaState,
	type CommentCaptchaWriteInput,
} from "@utils/comments/provider";
import type {
	PageFeedbackCapability,
	RewardOption,
} from "@utils/page-feedback/provider";
import { getQingYanClient } from "@utils/qingyan/client";
import type { QingYanClientConfig } from "@utils/qingyan/contracts";
import { onDestroy, onMount } from "svelte";
import { fade, scale } from "svelte/transition";
import InlineCommentCaptcha from "../comments/InlineCommentCaptcha.svelte";
import RewardModal from "./RewardModal.svelte";

export let postKey: string;
export let postTitle = "";
export let postUrl = "";
export let enableLike = true;
export let rewardItems: RewardOption[] = [];
export let qingyan: QingYanClientConfig | null = null;

const qingyanClient = getQingYanClient(qingyan);
const pageScope = getPageNoticeScope();

type FangYuanDebugWindow = Window & {
	__FANGYUAN_QINGYAN_DEBUG__?: Record<string, unknown>;
};

let capability: PageFeedbackCapability | null = null;
let likeCount = 0;
let liked = false;
let loading = true;
let likeBusy = false;
let captchaBusy = false;
let celebrating = false;
let celebrationTimer: ReturnType<typeof setTimeout> | null = null;
const confetti = Array.from({ length: 12 }, (_, index) => ({
	x: Math.cos((index * Math.PI) / 6) * (28 + (index % 3) * 8),
	y: Math.sin((index * Math.PI) / 6) * (28 + (index % 3) * 8),
	angle: index * 37,
}));
let captchaError = "";
let captchaPrompt = "";
let captchaValue = "";
let rewardOpen = false;
let captchaState = null as CommentCaptchaState | null;
let showCaptcha = false;
let pendingLikeAction = false;
let captchaFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

$: showLike = enableLike && (capability?.supportsLike ?? false);
$: showReward = rewardItems.length > 0;
$: showCard = showLike || showReward;

function clearCaptchaFeedbackTimer() {
	if (captchaFeedbackTimer) {
		clearTimeout(captchaFeedbackTimer);
		captchaFeedbackTimer = null;
	}
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

function updatePageFeedbackDebugHook() {
	if (!import.meta.env.DEV || typeof window === "undefined") {
		return;
	}

	const nextDebug = {
		...((window as FangYuanDebugWindow).__FANGYUAN_QINGYAN_DEBUG__ ?? {}),
		pageFeedback: {
			postKey,
			likeBusy,
			liked,
			likeCount,
			showCaptcha,
			pendingLikeAction,
			captchaState,
			captchaPrompt,
			captchaError,
			retryPendingAction: () => void handleLike(),
			refreshCaptcha: () => void handleRefreshCaptcha(),
		},
	};
	(window as FangYuanDebugWindow).__FANGYUAN_QINGYAN_DEBUG__ = nextDebug;
}

function buildLikeCaptchaPayload(): CommentCaptchaWriteInput | null {
	if (captchaState?.challenge?.mode !== "inline_value") {
		return null;
	}

	const challengeId = captchaState.challenge.metadata?.challengeId;
	const value = captchaValue.trim();
	if (!challengeId || !value) {
		return null;
	}

	return {
		challengeId,
		mode: "inline_value",
		value,
	};
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
		})
		.catch(() => {
			showNotice({
				message: i18n(I18nKey.engagementLoadFailed),
				tone: "error",
				priority: "important",
				scope: pageScope,
				key: "engagement-bootstrap",
			});
		})
		.finally(() => {
			loading = false;
		});
});

async function handleLike() {
	if (!qingyanClient || !showLike || liked || likeBusy) {
		return;
	}

	if (pendingLikeAction && showCaptcha) {
		if (!buildLikeCaptchaPayload()) {
			setCaptchaError(i18n(I18nKey.commentsValidationCaptchaRequired));
			return;
		}
	} else if (captchaState?.required && !captchaState.verified) {
		showCaptcha = true;
		setCaptchaPrompt(i18n(I18nKey.commentsCaptchaRequiredTip));
		pendingLikeAction = true;
		return;
	}

	likeBusy = true;

	try {
		const nextState = await qingyanClient.likePage({
			pageKey: postKey,
			pageTitle: postTitle,
			pageUrl: postUrl,
			captcha: pendingLikeAction ? buildLikeCaptchaPayload() : null,
		});
		likeCount = nextState.likeCount;
		liked = nextState.liked;
		if (liked && pageScope === getPageNoticeScope()) {
			celebrating = true;
			celebrationTimer = setTimeout(() => {
				celebrating = false;
			}, 700);
		}
		showCaptcha = false;
		pendingLikeAction = false;
		captchaValue = "";
		clearCaptchaFeedback();
		captchaState = null;
	} catch (caughtError) {
		if (caughtError instanceof CommentCaptchaRequiredError) {
			captchaState = caughtError.state;
			showCaptcha = true;
			pendingLikeAction = true;
			captchaValue = "";
			setCaptchaPrompt(i18n(I18nKey.commentsCaptchaRequiredTip));
			return;
		}
		if (pendingLikeAction) {
			setCaptchaError(i18n(I18nKey.commentsCaptchaVerifyFailed));
		} else {
			showNotice({
				message: i18n(I18nKey.pageFeedbackLikeFailed),
				tone: "error",
				priority: "important",
				scope: pageScope,
				key: "page-like-failed",
			});
		}
	} finally {
		likeBusy = false;
	}
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
		captchaValue = "";
	} catch {
		setCaptchaError(i18n(I18nKey.commentsCaptchaRefreshFailed));
	} finally {
		captchaBusy = false;
	}
}

$: updatePageFeedbackDebugHook();

onDestroy(() => {
	if (celebrationTimer) clearTimeout(celebrationTimer);
	clearCaptchaFeedbackTimer();
	if (import.meta.env.DEV && typeof window !== "undefined") {
		const nextDebug = {
			...((window as FangYuanDebugWindow).__FANGYUAN_QINGYAN_DEBUG__ ?? {}),
		};
		delete nextDebug.pageFeedback;
		(window as FangYuanDebugWindow).__FANGYUAN_QINGYAN_DEBUG__ = nextDebug;
	}
});
</script>

{#if showCard}
	<section class="card-base mb-6 rounded-panel border border-line-divider px-4 py-4 md:px-6">
		<div class="flex flex-col">
			<div class="post-feedback-row">
				<div class="min-w-0 flex-1">
					<p class="text-base font-semibold text-90 md:text-lg">
						{i18n(I18nKey.pageFeedbackRewardTitle)}
					</p>
				</div>

				<div class="post-feedback-actions">
					{#if showLike}
						<div class="comment-captcha-popover-anchor post-like-anchor">
							<button
								type="button"
								class="btn-card post-feedback-button rounded-full border border-line-divider text-75"
								class:border-primary={liked}
								class:text-primary={liked}
								class:bg-btn-plain-bg-hover={liked}
								disabled={loading || likeBusy || liked}
								aria-pressed={liked}
								on:click={handleLike}
							>
								<svg class="post-feedback-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="10" width="4.2" height="10.5" rx="1.4" /><path d="M9.1 20.5V10l3.1-6.1a1.65 1.65 0 0 1 3.1 1.2L14.1 10h4.4a2.2 2.2 0 0 1 2.1 2.8l-1.5 5.7a2.7 2.7 0 0 1-2.6 2H9.1Z" /></svg>
								<span class="whitespace-nowrap">
									{liked ? i18n(I18nKey.pageFeedbackLiked) : i18n(I18nKey.pageFeedbackLike)}
									{" "}
									{likeCount}
								</span>
							</button>
							{#if celebrating}<span class="post-like-burst" aria-hidden="true">{#each confetti as particle, index}<i style={`--burst-x:${particle.x}px;--burst-y:${particle.y}px;--burst-angle:${particle.angle}deg;--burst-hue:${index * 30};`}></i>{/each}</span>{/if}

							{#if showCaptcha && captchaState}
								<div
									class="comment-captcha-popover-wrap comment-captcha-popover-wrap-end"
									data-page-feedback-captcha-target="like"
								>
									<div in:fade={{ duration: 180 }} out:fade={{ duration: 180 }}>
										<div
											class="comment-captcha-popover"
											in:scale={{ duration: 180, start: 0.92, opacity: 0.5 }}
											out:scale={{ duration: 150, start: 1, opacity: 0.4 }}
										>
											<InlineCommentCaptcha
												compact={true}
												variant="popover"
												bind:captchaValue
												stacked={true}
												autoFocusCaptchaInput={true}
												captchaState={captchaState}
												captchaBusy={captchaBusy}
												captchaError={captchaError}
												captchaPrompt={captchaPrompt}
												onRefreshCaptcha={handleRefreshCaptcha}
												onSubmitCaptcha={handleLike}
											/>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/if}

					{#if showReward}
						<button
							type="button"
							class="btn-card post-feedback-button rounded-full border border-line-divider text-75"
							on:click={() => (rewardOpen = true)}
						>
							<svg class="post-feedback-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h12v5.5a5.5 5.5 0 0 1-5.5 5.5h-1A5.5 5.5 0 0 1 4 14.5V9ZM16 10h1.5a3 3 0 0 1 0 6H16M3 22h15M7 3v2M11 2v3M15 3v2" /></svg>
							<span class="whitespace-nowrap">{i18n(I18nKey.pageFeedbackReward)}</span>
						</button>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<RewardModal
		open={rewardOpen}
		options={rewardItems}
		onClose={() => (rewardOpen = false)}
	/>
{/if}
