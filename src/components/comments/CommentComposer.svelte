<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { createEventDispatcher } from "svelte";
import { validateCommentForm } from "@utils/comments/validation";
import EmojiPicker from "./EmojiPicker.svelte";

type CommentComposerSubmitDetail = {
	authorName: string;
	authorEmail: string;
	authorWebsite: string;
	content: string;
};

const dispatch = createEventDispatcher<{
	submit: CommentComposerSubmitDetail;
	cancelReply: void;
}>();

export let submitting = false;
export let replyParentId: string | null = null;

let authorName = "";
let authorEmail = "";
let authorWebsite = "";
let content = "";
let validationError = "";
let showEmojiPicker = false;

$: canSubmit =
	!submitting &&
	authorName.trim().length > 0 &&
	authorEmail.trim().length > 0 &&
	content.trim().length > 0;

function handleSubmit() {
	const validationResult = validateCommentForm({
		authorName,
		authorEmail,
		authorWebsite,
		content,
	});

	if (validationResult) {
		validationError = i18n(validationResult);
		return;
	}

	if (!canSubmit) {
		return;
	}

	validationError = "";
	dispatch("submit", {
		authorName: authorName.trim(),
		authorEmail: authorEmail.trim(),
		authorWebsite: authorWebsite.trim(),
		content: content.trim(),
	});
	content = "";
}

function handleCancelReply() {
	validationError = "";
	showEmojiPicker = false;
	dispatch("cancelReply");
}

function insertEmoji(event: CustomEvent<string>) {
	content = `${content}${event.detail}`;
	showEmojiPicker = false;
}
</script>

<form class="card-base rounded-panel p-5" on:submit|preventDefault={handleSubmit}>
	<div class="flex items-start justify-between gap-3 mb-4">
		<div>
			<h3 class="font-semibold text-90">{i18n(I18nKey.commentsSubmit)}</h3>
			{#if replyParentId}
				<p class="text-sm text-50">{i18n(I18nKey.commentsReplying)}</p>
			{/if}
		</div>
		{#if replyParentId}
			<button
				class="btn-plain rounded-lg px-3 h-9 text-sm"
				type="button"
				on:click={handleCancelReply}
			>
				{i18n(I18nKey.commentsCancelReply)}
			</button>
		{/if}
	</div>

	{#if validationError}
		<p class="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
			{validationError}
		</p>
	{/if}

	<div class="grid gap-3 md:grid-cols-2">
		<label class="flex flex-col gap-1 text-sm text-50">
			<span>{i18n(I18nKey.commentsFormName)}</span>
			<input
				bind:value={authorName}
				class="rounded-xl border border-line-divider bg-card-bg px-3 py-2 text-90 outline-none"
				maxlength="80"
				required
				type="text"
			/>
		</label>

		<label class="flex flex-col gap-1 text-sm text-50">
			<span>{i18n(I18nKey.commentsFormEmail)}</span>
			<input
				bind:value={authorEmail}
				class="rounded-xl border border-line-divider bg-card-bg px-3 py-2 text-90 outline-none"
				maxlength="120"
				required
				type="email"
			/>
		</label>

		<label class="flex flex-col gap-1 text-sm text-50 md:col-span-2">
			<span>{i18n(I18nKey.commentsFormWebsite)}</span>
			<input
				bind:value={authorWebsite}
				class="rounded-xl border border-line-divider bg-card-bg px-3 py-2 text-90 outline-none"
				maxlength="200"
				type="url"
			/>
		</label>

		<label class="flex flex-col gap-1 text-sm text-50 md:col-span-2">
			<span>{i18n(I18nKey.commentsFormContent)}</span>
			<textarea
				bind:value={content}
				class="min-h-32 rounded-xl border border-line-divider bg-card-bg px-3 py-2 text-90 outline-none"
				maxlength="5000"
				required
			></textarea>
		</label>
	</div>

	<div class="mt-4 flex items-center justify-end">
		<div class="mr-auto">
			<button
				type="button"
				class="btn-plain rounded-lg px-3 h-9 text-sm"
				aria-controls="comment-emojis-panel"
				aria-expanded={showEmojiPicker}
				on:click={() => (showEmojiPicker = !showEmojiPicker)}
			>
				{i18n(I18nKey.commentsEmoji)}
			</button>
		</div>
		<button
			class="btn-regular rounded-xl px-4 h-10 text-sm font-medium"
			disabled={!canSubmit}
			type="submit"
		>
			{#if submitting}
				{i18n(I18nKey.commentsSubmitting)}
			{:else}
				{i18n(I18nKey.commentsSubmit)}
			{/if}
		</button>
	</div>

	{#if showEmojiPicker}
		<div id="comment-emojis-panel" class="mt-4 rounded-xl border border-line-divider p-3">
			<EmojiPicker on:select={insertEmoji} />
		</div>
	{/if}
</form>
