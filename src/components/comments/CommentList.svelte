<script lang="ts">
import type { AutoDismissTone } from "@utils/browser/notice";
import type { CommentCaptchaState } from "@utils/comments/provider";
import type { CanonicalComment, CommentVoteChoice } from "@/types/comment";
import CommentItem from "./CommentItem.svelte";

export let comments: CanonicalComment[] = [];
export let activeReplyParentId: string | null = null;
export let activeCaptchaCommentId: string | null = null;
export let activeCaptchaVoteChoice: CommentVoteChoice | null = null;
export let activeVoteConfirmCommentId: string | null = null;
export let activeCommentNoticeId: string | null = null;
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
</script>

<div class="space-y-3">
	{#each comments as comment (comment.id)}
		<CommentItem
			comment={comment}
			activeReplyParentId={activeReplyParentId}
			activeCaptchaCommentId={activeCaptchaCommentId}
			activeCaptchaVoteChoice={activeCaptchaVoteChoice}
			activeVoteConfirmCommentId={activeVoteConfirmCommentId}
			activeCommentNoticeId={activeCommentNoticeId}
			depth={1}
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
