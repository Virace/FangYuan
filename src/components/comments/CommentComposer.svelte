<script lang="ts">
import type { I18nKey as I18nKeyType } from "@i18n/i18nKey";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type {
	CommentAuthorField,
	CommentCaptchaState,
} from "@utils/comments/provider";
import {
	type CommentFormValidationField,
	collectCommentFormInvalidFields,
} from "@utils/comments/validation";
import type { AutoDismissTone } from "@utils/notice";
import { tick } from "svelte";
import { fade, scale, slide } from "svelte/transition";
import InlineFeedbackNotice from "../misc/InlineFeedbackNotice.svelte";
import EmojiPicker from "./EmojiPicker.svelte";
import InlineCommentCaptcha from "./InlineCommentCaptcha.svelte";

type CommentComposerSubmitDetail = {
	authorName: string;
	authorEmail: string;
	authorWebsite: string;
	content: string;
};

export let submitting = false;
export let replyParentId: string | null = null;
export let showCaptcha = false;
export let allowedFields: CommentAuthorField[] = [
	"nickname",
	"email",
	"website",
];
export let requiredFields: CommentAuthorField[] = ["nickname", "email"];
export let captchaState: CommentCaptchaState | null = null;
export let captchaBusy = false;
export let captchaValue = "";
export let captchaError = "";
export let captchaPrompt = "";
export let noticeMessage = "";
export let noticeTone: AutoDismissTone = "info";
export let onSubmit:
	| ((detail: CommentComposerSubmitDetail) => boolean | Promise<boolean>)
	| null = null;
export let onCancelReply: (() => void) | null = null;
export let onRefreshCaptcha: (() => void | Promise<void>) | null = null;

const emojiPopoverDuration = 180;
const emojiTriggerIcon = "\u{1F642}";

let authorName = "";
let authorEmail = "";
let authorWebsite = "";
let content = "";
let showEmojiPicker = false;
let emojiTriggerWrap: HTMLDivElement | null = null;
let authorNameInput: HTMLInputElement | null = null;
let authorEmailInput: HTMLInputElement | null = null;
let authorWebsiteInput: HTMLInputElement | null = null;
let contentInput: HTMLTextAreaElement | null = null;
let hasTriedSubmit = false;
let currentInvalidFields: CommentFormValidationField[] = [];
let invalidFieldState: Record<CommentFormValidationField, boolean> = {
	nickname: false,
	email: false,
	website: false,
	content: false,
};

$: showNameField = allowedFields.includes("nickname");
$: showEmailField = allowedFields.includes("email");
$: showWebsiteField = allowedFields.includes("website");
$: submitButtonLabel = submitting
	? i18n(I18nKey.commentsSubmitting)
	: showCaptcha
		? i18n(I18nKey.commentsVoteConfirmProceed)
		: i18n(I18nKey.commentsSubmit);
$: currentInvalidFields = hasTriedSubmit
	? collectCommentFormInvalidFields(
			{
				authorName,
				authorEmail,
				authorWebsite,
				content,
			},
			{
				requiredFields,
			},
		)
	: [];
$: invalidFieldState = {
	nickname: currentInvalidFields.includes("nickname"),
	email: currentInvalidFields.includes("email"),
	website: currentInvalidFields.includes("website"),
	content: currentInvalidFields.includes("content"),
};

function formatFieldLabel(key: I18nKeyType, field: CommentAuthorField): string {
	const label = i18n(key);
	return requiredFields.includes(field)
		? `${label}*`
		: `${label}${i18n(I18nKey.commentsFormOptionalSuffix)}`;
}

function focusInvalidField(field: CommentFormValidationField) {
	const target =
		field === "nickname"
			? authorNameInput
			: field === "email"
				? authorEmailInput
				: field === "website"
					? authorWebsiteInput
					: contentInput;

	target?.focus();
}

async function handleSubmit() {
	if (submitting) {
		return;
	}

	const invalidFields = collectCommentFormInvalidFields(
		{
			authorName,
			authorEmail,
			authorWebsite,
			content,
		},
		{
			requiredFields,
		},
	);

	if (invalidFields.length > 0) {
		hasTriedSubmit = true;
		await tick();
		focusInvalidField(invalidFields[0]);
		return;
	}
	hasTriedSubmit = false;
	const submitSucceeded = await onSubmit?.({
		authorName: authorName.trim(),
		authorEmail: authorEmail.trim(),
		authorWebsite: authorWebsite.trim(),
		content: content.trim(),
	});
	if (submitSucceeded) {
		content = "";
		hasTriedSubmit = false;
		showEmojiPicker = false;
	}
}

function handleCancelReply() {
	hasTriedSubmit = false;
	showEmojiPicker = false;
	onCancelReply?.();
}

function insertEmoji(emoji: string) {
	content = `${content}${emoji}`;
	showEmojiPicker = false;
}

function handleEmojiFocusOut(event: FocusEvent) {
	const nextTarget = event.relatedTarget;

	if (nextTarget instanceof Node && emojiTriggerWrap?.contains(nextTarget)) {
		return;
	}

	showEmojiPicker = false;
}

function handleEmojiKeydown(event: KeyboardEvent) {
	if (!showEmojiPicker || event.key !== "Escape") {
		return;
	}

	showEmojiPicker = false;
}
</script>

<svelte:window on:keydown={handleEmojiKeydown} />

<form class="card-base rounded-panel p-5" novalidate on:submit|preventDefault={handleSubmit}>
	<InlineFeedbackNotice
		message={noticeMessage}
		tone={noticeTone}
		duration={180}
		className="mb-4"
	/>

	<div class="flex items-start justify-between gap-3 mb-4">
		<div>
			<h3 class="font-semibold text-90">{i18n(I18nKey.commentsSubmit)}</h3>
			{#if replyParentId}
				<p class="text-sm text-50">{i18n(I18nKey.commentsReplying)}</p>
			{/if}
		</div>
		{#if replyParentId}
			<button
				class="comment-action"
				type="button"
				on:click={handleCancelReply}
			>
				{i18n(I18nKey.commentsCancelReply)}
			</button>
		{/if}
	</div>

	<div class="grid gap-3 md:grid-cols-2">
		{#if showNameField}
			<label
				class="comment-form-field flex flex-col gap-1 text-sm text-50"
				class:comment-form-field-invalid={invalidFieldState.nickname}
				data-validation-state={invalidFieldState.nickname ? "invalid" : "idle"}
			>
				<span class="comment-form-field-label">
					{formatFieldLabel(I18nKey.commentsFormName, "nickname")}
				</span>
				<input
					bind:this={authorNameInput}
					bind:value={authorName}
					aria-invalid={invalidFieldState.nickname}
					class="comment-form-input text-90"
					maxlength="80"
					required={requiredFields.includes("nickname")}
					type="text"
				/>
			</label>
		{/if}

		{#if showEmailField}
			<label
				class="comment-form-field flex flex-col gap-1 text-sm text-50"
				class:comment-form-field-invalid={invalidFieldState.email}
				data-validation-state={invalidFieldState.email ? "invalid" : "idle"}
			>
				<span class="comment-form-field-label">
					{formatFieldLabel(I18nKey.commentsFormEmail, "email")}
				</span>
				<input
					bind:this={authorEmailInput}
					bind:value={authorEmail}
					aria-invalid={invalidFieldState.email}
					class="comment-form-input text-90"
					maxlength="120"
					required={requiredFields.includes("email")}
					type="email"
				/>
			</label>
		{/if}

		{#if showWebsiteField}
			<label
				class="comment-form-field flex flex-col gap-1 text-sm text-50 md:col-span-2"
				class:comment-form-field-invalid={invalidFieldState.website}
				data-validation-state={invalidFieldState.website ? "invalid" : "idle"}
			>
				<span class="comment-form-field-label">
					{formatFieldLabel(I18nKey.commentsFormWebsite, "website")}
				</span>
				<input
					bind:this={authorWebsiteInput}
					bind:value={authorWebsite}
					aria-invalid={invalidFieldState.website}
					class="comment-form-input text-90"
					maxlength="200"
					required={requiredFields.includes("website")}
					type="url"
				/>
			</label>
		{/if}

		<label
			class="comment-form-field flex flex-col gap-1 text-sm text-50 md:col-span-2"
			class:comment-form-field-invalid={invalidFieldState.content}
			data-validation-state={invalidFieldState.content ? "invalid" : "idle"}
		>
			<span class="comment-form-field-label">{i18n(I18nKey.commentsFormContent)}</span>
			<textarea
				bind:this={contentInput}
				bind:value={content}
				aria-invalid={invalidFieldState.content}
				class="comment-form-input min-h-32 text-90"
				maxlength="5000"
				required
			></textarea>
		</label>
	</div>

	<div class="comment-composer-actions mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
		<div class="w-full md:order-2 md:flex-1 md:min-w-0">
			<div class="flex items-center justify-end">
				<div class="comment-captcha-popover-anchor">
					<button
						class="btn-regular rounded-xl px-4 h-10 text-sm font-medium w-full md:w-auto md:shrink-0"
						disabled={submitting}
						type="submit"
					>
						{submitButtonLabel}
					</button>

					{#if showCaptcha}
						<div
							class="comment-captcha-popover-wrap comment-captcha-popover-wrap-end"
							data-comment-captcha-target="composer"
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
										captchaBusy={captchaBusy}
										captchaError={captchaError}
										captchaPrompt={captchaPrompt}
										captchaState={captchaState}
										onRefreshCaptcha={onRefreshCaptcha}
									/>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div
			bind:this={emojiTriggerWrap}
			role="group"
			class="comment-emoji-trigger-wrap mr-auto"
			on:focusout={handleEmojiFocusOut}
		>
			<button
				type="button"
				class="comment-emoji-trigger comment-action"
				class:comment-action-active={showEmojiPicker}
				aria-label={i18n(I18nKey.commentsEmoji)}
				aria-controls="comment-emojis-panel"
				aria-expanded={showEmojiPicker}
				title={i18n(I18nKey.commentsEmoji)}
				on:click={() => (showEmojiPicker = !showEmojiPicker)}
			>
				<span aria-hidden="true" class="comment-emoji-trigger-icon">{emojiTriggerIcon}</span>
			</button>

			{#if showEmojiPicker}
				<div
					id="comment-emojis-panel"
					class="comment-emoji-popover-wrap"
					in:fade={{ duration: emojiPopoverDuration }}
					out:fade={{ duration: emojiPopoverDuration }}
				>
					<div
						class="comment-emoji-popover"
						in:scale={{ duration: emojiPopoverDuration, start: 0.92, opacity: 0.5 }}
						out:scale={{ duration: 150, start: 1, opacity: 0.4 }}
					>
						<EmojiPicker onSelect={insertEmoji} />
					</div>
				</div>
			{/if}
		</div>
	</div>
</form>
