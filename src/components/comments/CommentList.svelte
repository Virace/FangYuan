<script lang="ts">
import type { CanonicalComment } from "@/types/comment";
import type {
	CommentCaptchaState,
	VerifyCommentCaptchaInput,
} from "@utils/comments/provider";
import CommentItem from "./CommentItem.svelte";

export let comments: CanonicalComment[] = [];
export let activeReplyParentId: string | null = null;
export let activeCaptchaCommentId: string | null = null;
export let maxDepth = 3;
export let supportsVote = false;
export let captchaState: CommentCaptchaState | null = null;
export let captchaBusy = false;
export let captchaError = "";
export let captchaPrompt = "";
export let onVote: ((commentId: string, choice: "up" | "down") => void) | null = null;
export let onReply: ((commentId: string) => void) | null = null;
export let onDismissCaptcha: (() => void) | null = null;
export let onRefreshCaptcha: (() => void | Promise<void>) | null = null;
export let onVerifyCaptcha:
	| ((input: VerifyCommentCaptchaInput) => void | Promise<void>)
	| null = null;
</script>

<div class="space-y-3">
	{#each comments as comment (comment.id)}
		<CommentItem
			comment={comment}
			activeReplyParentId={activeReplyParentId}
			activeCaptchaCommentId={activeCaptchaCommentId}
			depth={1}
			maxDepth={maxDepth}
			supportsVote={supportsVote}
			captchaState={captchaState}
			captchaBusy={captchaBusy}
			captchaError={captchaError}
			captchaPrompt={captchaPrompt}
			onVote={onVote}
			onReply={onReply}
			onDismissCaptcha={onDismissCaptcha}
			onRefreshCaptcha={onRefreshCaptcha}
			onVerifyCaptcha={onVerifyCaptcha}
		/>
	{/each}
</div>
