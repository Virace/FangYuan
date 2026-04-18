<script lang="ts">
import type { AutoDismissTone } from "@utils/notice";
import { onDestroy, tick } from "svelte";

export let message = "";
export let tone: AutoDismissTone = "info";
export let compact = false;
export let duration = 180;
export let className = "";

type NoticePhase = "hidden" | "entering" | "entered" | "exiting";

let renderedMessage = "";
let renderedTone: AutoDismissTone = tone;
let phase: NoticePhase = "hidden";
let activeSignature = "";
let settleTimer: ReturnType<typeof setTimeout> | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

$: toneClass =
	renderedTone === "success"
		? "bg-primary/10 text-primary"
		: renderedTone === "error"
			? "bg-red-500/10 text-red-500"
			: "bg-soft-contrast text-60";

$: paddingClass = compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm";

function clearAnimationState() {
	if (settleTimer) {
		clearTimeout(settleTimer);
		settleTimer = null;
	}

	if (clearTimer) {
		clearTimeout(clearTimer);
		clearTimer = null;
	}
}

function hideNotice() {
	if (!renderedMessage) {
		return;
	}

	clearAnimationState();
	activeSignature = "";
	phase = "exiting";
	clearTimer = setTimeout(() => {
		renderedMessage = "";
		phase = "hidden";
		clearTimer = null;
	}, duration);
}

async function showNotice(
	nextMessage: string,
	nextTone: AutoDismissTone,
	signature: string,
) {
	clearAnimationState();
	activeSignature = signature;
	renderedMessage = nextMessage;
	renderedTone = nextTone;
	phase = "entering";
	await tick();
	settleTimer = setTimeout(() => {
		if (activeSignature === signature) {
			phase = "entered";
		}
		settleTimer = null;
	}, duration);
}

$: {
	const nextSignature = message ? `${tone}:${message}` : "";
	if (!nextSignature) {
		hideNotice();
	} else if (
		nextSignature !== activeSignature ||
		renderedMessage !== message ||
		renderedTone !== tone
	) {
		void showNotice(message, tone, nextSignature);
	}
}

onDestroy(() => {
	clearAnimationState();
});
</script>

{#if renderedMessage}
	<div
		class={`inline-feedback-notice ${className}`.trim()}
		style={`--inline-feedback-duration: ${duration}ms;`}
		data-feedback-state={phase}
	>
		<div class="inline-feedback-notice__body">
			<p
				class={`rounded-xl leading-6 ${toneClass} ${paddingClass}`}
				data-inline-feedback-notice
			>
				{renderedMessage}
			</p>
		</div>
	</div>
{/if}

<style>
	.inline-feedback-notice {
		overflow: hidden;
		max-height: 6rem;
		opacity: 1;
		transform: translateY(0);
	}

	.inline-feedback-notice[data-feedback-state="entering"] {
		animation: inline-feedback-enter var(--inline-feedback-duration, 180ms)
			cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.inline-feedback-notice[data-feedback-state="exiting"] {
		animation: inline-feedback-exit var(--inline-feedback-duration, 180ms)
			cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes inline-feedback-enter {
		from {
			max-height: 0;
			opacity: 0;
			transform: translateY(-0.375rem);
		}

		to {
			max-height: 6rem;
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes inline-feedback-exit {
		from {
			max-height: 6rem;
			opacity: 1;
			transform: translateY(0);
		}

		to {
			max-height: 0;
			opacity: 0;
			transform: translateY(-0.375rem);
		}
	}
</style>
