<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { AutoDismissTone } from "@utils/browser/notice";
import type { CommentCaptchaState } from "@utils/comments/provider";
import { fade, scale, slide } from "svelte/transition";
import type { CanonicalComment, CommentVoteChoice } from "@/types/comment";
import InlineFeedbackNotice from "../misc/InlineFeedbackNotice.svelte";
import InlineCommentCaptcha from "./InlineCommentCaptcha.svelte";

export let comment: CanonicalComment;
export let activeReplyParentId: string | null = null;
export let activeCaptchaCommentId: string | null = null;
export let activeCaptchaVoteChoice: CommentVoteChoice | null = null;
export let activeVoteConfirmCommentId: string | null = null;
export let activeCommentNoticeId: string | null = null;
export let depth = 1;
export let maxDepth = 3;
export let supportsVote = false;
export let voteBusy = false;
export let pendingVoteChoice: CommentVoteChoice | null = null;
export let captchaState: CommentCaptchaState | null = null;
export let captchaBusy = false;
export let captchaValue = "";
export let captchaError = "";
export let captchaPrompt = "";
export let commentNoticeMessage = "";
export let commentNoticeTone: AutoDismissTone = "info";
export let onVote: ((commentId: string, choice: "up" | "down") => void) | null =
	null;
export let onConfirmVote:
	| ((commentId: string, choice: CommentVoteChoice) => void | Promise<void>)
	| null = null;
export let onCancelVoteConfirm: (() => void) | null = null;
export let onReply: ((commentId: string) => void) | null = null;
export let onRefreshCaptcha: (() => void | Promise<void>) | null = null;
export let onSubmitCaptcha: (() => void | Promise<void>) | null = null;

let failedAvatarKey: string | null = null;

function formatCommentDate(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
}

function triggerReply() {
	onReply?.(comment.id);
}

$: avatarKey = comment.author.avatarUrl
	? `${comment.id}|${comment.author.avatarUrl}`
	: null;
$: showAvatarImage = Boolean(avatarKey && failedAvatarKey !== avatarKey);
$: showVoteConfirm =
	comment.id === activeVoteConfirmCommentId && pendingVoteChoice !== null;
$: voteDisabled = Boolean(comment.viewerVote) || voteBusy;
$: showCommentNotice =
	comment.id === activeCommentNoticeId && commentNoticeMessage.length > 0;
$: showCommentCaptchaUp =
	comment.id === activeCaptchaCommentId &&
	activeCaptchaVoteChoice === "up" &&
	Boolean(captchaState?.required);
$: showCommentCaptchaDown =
	comment.id === activeCaptchaCommentId &&
	activeCaptchaVoteChoice === "down" &&
	Boolean(captchaState?.required);
</script>

<article
	class="comment-item"
	class:comment-root={depth === 1}
	class:comment-nested={depth > 1}
>
	<div class="flex items-start gap-3">
		{#if comment.author.avatarUrl && showAvatarImage}
			<img
				alt={comment.author.name}
				class="h-10 w-10 rounded-full object-cover"
				src={comment.author.avatarUrl}
				on:error={() => {
					failedAvatarKey = avatarKey;
				}}
			/>
		{:else}
			<div class="flex h-10 w-10 items-center justify-center rounded-full bg-btn-plain-bg-hover text-sm font-semibold text-primary">
				{comment.author.name.slice(0, 1).toUpperCase()}
			</div>
		{/if}

		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
				<span class="font-semibold text-90">{comment.author.name}</span>
				{#if comment.author.badge?.label}
					<span class="comment-author-badge">{comment.author.badge.label}</span>
				{/if}
				<span class="text-xs text-50">{formatCommentDate(comment.createdAt)}</span>
				{#if comment.status !== "approved"}
					<span class="rounded-full bg-soft-contrast px-2 py-0.5 text-xs text-50">
						{i18n(I18nKey.commentsModerationNotice)}
					</span>
				{/if}
			</div>

			<div class="comment-body mt-2 text-sm leading-7 text-75">
				{@html comment.content.html}
			</div>

			{#if depth < maxDepth || supportsVote}
				<div class="comment-actions-shell mt-3">
					<div class="comment-actions">
						{#if depth < maxDepth}
							<button
								class="comment-action"
								class:comment-action-active={activeReplyParentId === comment.id}
								type="button"
								on:click={triggerReply}
							>
								{activeReplyParentId === comment.id
									? i18n(I18nKey.commentsCancelReply)
									: i18n(I18nKey.commentsReply)}
							</button>
						{/if}

					{#if supportsVote}
						<div class="comment-action-anchor">
							<button
								type="button"
								class="comment-action"
								class:comment-action-active={comment.viewerVote === "up"}
								aria-label={i18n(I18nKey.commentsVoteUp)}
								disabled={voteDisabled}
								on:click={() => onVote?.(comment.id, "up")}
							>
								<span aria-hidden="true">👍</span>
								<span class="comment-action-count">{comment.voteUp}</span>
							</button>

							{#if showCommentCaptchaUp}
								<div
									class="comment-captcha-popover-wrap comment-captcha-popover-wrap-start"
									data-comment-captcha-target={comment.id}
								>
									<div in:fade={{ duration: 180 }} out:fade={{ duration: 180 }}>
										<div
											class="comment-captcha-popover"
											in:scale={{ duration: 180, start: 0.96 }}
											out:scale={{ duration: 180, start: 0.96 }}
										>
											<InlineCommentCaptcha
												compact={true}
												variant="popover"
												bind:captchaValue
												captchaBusy={captchaBusy}
												captchaError={captchaError}
												captchaPrompt={captchaPrompt}
												captchaState={captchaState}
												onRefreshCaptcha={onRefreshCaptcha}
												onSubmitCaptcha={onSubmitCaptcha}
											/>
										</div>
									</div>
								</div>
							{/if}

							{#if showVoteConfirm && pendingVoteChoice === "up"}
								<div
									class="comment-vote-popover-wrap comment-vote-popover-wrap-start"
									data-comment-vote-confirm-target={comment.id}
								>
									<div in:fade={{ duration: 180 }} out:fade={{ duration: 180 }}>
										<div
											class="comment-vote-popover"
											in:scale={{ duration: 180, start: 0.96 }}
											out:scale={{ duration: 180, start: 0.96 }}
										>
											<p class="text-xs leading-6 text-60">
												{i18n(I18nKey.commentsVoteConfirmTipUp)}
											</p>
											<div class="comment-vote-actions">
												<button
													type="button"
													class="comment-action comment-vote-confirm-btn comment-vote-confirm-btn-primary"
													on:click={() =>
														onConfirmVote?.(comment.id, pendingVoteChoice)}
												>
													{i18n(I18nKey.commentsVoteConfirmProceed)}
												</button>
												<button
													type="button"
													class="comment-action comment-vote-confirm-btn comment-vote-confirm-btn-secondary"
													on:click={() => onCancelVoteConfirm?.()}
												>
													{i18n(I18nKey.commentsVoteConfirmCancel)}
												</button>
											</div>
										</div>
									</div>
								</div>
							{/if}
						</div>

						<div class="comment-action-anchor">
							<button
								type="button"
								class="comment-action"
								class:comment-action-active={comment.viewerVote === "down"}
								aria-label={i18n(I18nKey.commentsVoteDown)}
								disabled={voteDisabled}
								on:click={() => onVote?.(comment.id, "down")}
							>
								<span aria-hidden="true">👎</span>
								<span class="comment-action-count">{comment.voteDown}</span>
							</button>

							{#if showCommentCaptchaDown}
								<div
									class="comment-captcha-popover-wrap comment-captcha-popover-wrap-end"
									data-comment-captcha-target={comment.id}
								>
									<div in:fade={{ duration: 180 }} out:fade={{ duration: 180 }}>
										<div
											class="comment-captcha-popover"
											in:scale={{ duration: 180, start: 0.96 }}
											out:scale={{ duration: 180, start: 0.96 }}
										>
											<InlineCommentCaptcha
												compact={true}
												variant="popover"
												bind:captchaValue
												captchaBusy={captchaBusy}
												captchaError={captchaError}
												captchaPrompt={captchaPrompt}
												captchaState={captchaState}
												onRefreshCaptcha={onRefreshCaptcha}
												onSubmitCaptcha={onSubmitCaptcha}
											/>
										</div>
									</div>
								</div>
							{/if}

							{#if showVoteConfirm && pendingVoteChoice === "down"}
								<div
									class="comment-vote-popover-wrap comment-vote-popover-wrap-end"
									data-comment-vote-confirm-target={comment.id}
								>
									<div in:fade={{ duration: 180 }} out:fade={{ duration: 180 }}>
										<div
											class="comment-vote-popover"
											in:scale={{ duration: 180, start: 0.96 }}
											out:scale={{ duration: 180, start: 0.96 }}
										>
											<p class="text-xs leading-6 text-60">
												{i18n(I18nKey.commentsVoteConfirmTipDown)}
											</p>
											<div class="comment-vote-actions">
												<button
													type="button"
													class="comment-action comment-vote-confirm-btn comment-vote-confirm-btn-primary"
													on:click={() =>
														onConfirmVote?.(comment.id, pendingVoteChoice)}
												>
													{i18n(I18nKey.commentsVoteConfirmProceed)}
												</button>
												<button
													type="button"
													class="comment-action comment-vote-confirm-btn comment-vote-confirm-btn-secondary"
													on:click={() => onCancelVoteConfirm?.()}
												>
													{i18n(I18nKey.commentsVoteConfirmCancel)}
												</button>
											</div>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
				</div>
			{/if}

			<InlineFeedbackNotice
				message={showCommentNotice ? commentNoticeMessage : ""}
				tone={commentNoticeTone}
				compact={true}
				duration={180}
				className="mt-3"
			/>

			{#if depth < maxDepth && comment.children.length > 0}
				<div class="comment-children mt-4 space-y-3">
					{#each comment.children as child (child.id)}
						<svelte:self
							comment={child}
							activeReplyParentId={activeReplyParentId}
							activeCaptchaCommentId={activeCaptchaCommentId}
							activeCaptchaVoteChoice={activeCaptchaVoteChoice}
							activeVoteConfirmCommentId={activeVoteConfirmCommentId}
							activeCommentNoticeId={activeCommentNoticeId}
							depth={depth + 1}
							maxDepth={maxDepth}
							supportsVote={supportsVote}
							voteBusy={voteBusy}
							pendingVoteChoice={pendingVoteChoice}
							captchaState={captchaState}
							captchaBusy={captchaBusy}
							bind:captchaValue
							captchaError={captchaError}
							captchaPrompt={captchaPrompt}
							commentNoticeMessage={commentNoticeMessage}
							commentNoticeTone={commentNoticeTone}
							onVote={onVote}
							onConfirmVote={onConfirmVote}
							onCancelVoteConfirm={onCancelVoteConfirm}
							onReply={onReply}
							onRefreshCaptcha={onRefreshCaptcha}
							onSubmitCaptcha={onSubmitCaptcha}
						/>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</article>
