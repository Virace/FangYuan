<script lang="ts">
import type { I18nKey as I18nKeyType } from "@i18n/i18nKey";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { CommenterProfile } from "@utils/comments/commenter-profile";
import {
	type CommentAuthorField,
	type CommentCaptchaState,
	type CommentInputLimits,
	DEFAULT_COMMENT_INPUT_LIMITS,
} from "@utils/comments/provider";
import {
	type CommentFormValidationField,
	collectCommentFormInvalidFields,
} from "@utils/comments/validation";
import { tick } from "svelte";
import { fade, scale, slide } from "svelte/transition";
import EmojiPicker from "./EmojiPicker.svelte";
import InlineCommentCaptcha from "./InlineCommentCaptcha.svelte";

type CommentComposerSubmitDetail = {
	authorName: string;
	authorEmail: string;
	authorWebsite: string;
	content: string;
	rememberProfile: boolean;
	notifyOnReply: boolean;
};

type ReplyTarget = {
	authorName: string;
	avatarUrl?: string | null;
} | null;

export let submitting = false;
export let replyParentId: string | null = null;
export let replyTarget: ReplyTarget = null;
export let showCaptcha = false;
export let allowedFields: CommentAuthorField[] = [
	"nickname",
	"email",
	"website",
];
export let inputLimits: CommentInputLimits = DEFAULT_COMMENT_INPUT_LIMITS;
export let requiredFields: CommentAuthorField[] = ["nickname", "email"];
export let verifiedAuthor: {
	displayName: string;
	badgeLabel: string;
} | null = null;
export let supportsReplyEmailNotification = false;
export let replyEmailNotificationDefaultChecked = false;
export let initialProfile: CommenterProfile | null = null;
export let captchaState: CommentCaptchaState | null = null;
export let captchaBusy = false;
export let captchaValue = "";
export let captchaError = "";
export let captchaPrompt = "";
export let onSubmit:
	| ((detail: CommentComposerSubmitDetail) => boolean | Promise<boolean>)
	| null = null;
export let onCancelReply: (() => void) | null = null;
export let onRefreshCaptcha: (() => void | Promise<void>) | null = null;

const emojiPopoverDuration = 180;

let authorName = "";
let authorEmail = "";
let authorWebsite = "";
let content = "";
let rememberProfile = true;
let notifyOnReply = false;
let replyEmailNotificationDefaultApplied = false;
let appliedProfileSignature = "";
let showEmojiPicker = false;
let composerForm: HTMLFormElement | null = null;
let emojiTriggerWrap: HTMLDivElement | null = null;
let authorNameInput: HTMLInputElement | null = null;
let authorEmailInput: HTMLInputElement | null = null;
let authorWebsiteInput: HTMLInputElement | null = null;
let contentInput: HTMLTextAreaElement | null = null;
let failedReplyAvatarUrl: string | null = null;
let hasTriedSubmit = false;
let currentInvalidFields: CommentFormValidationField[] = [];
let invalidFieldState: Record<CommentFormValidationField, boolean> = {
	nickname: false,
	email: false,
	website: false,
	content: false,
};
let previousReplyParentId: string | null = null;

$: useVerifiedAuthor = Boolean(verifiedAuthor);
$: showNameField = !useVerifiedAuthor && allowedFields.includes("nickname");
$: showEmailField = !useVerifiedAuthor && allowedFields.includes("email");
$: showWebsiteField = !useVerifiedAuthor && allowedFields.includes("website");
$: canNotifyOnReply =
	supportsReplyEmailNotification && !useVerifiedAuthor && showEmailField;
$: if (canNotifyOnReply && !replyEmailNotificationDefaultApplied) {
	notifyOnReply = replyEmailNotificationDefaultChecked;
	replyEmailNotificationDefaultApplied = true;
}
$: if (!canNotifyOnReply) {
	notifyOnReply = false;
	replyEmailNotificationDefaultApplied = false;
}
$: if (useVerifiedAuthor) {
	appliedProfileSignature = "";
} else if (initialProfile) {
	const nextProfileSignature = JSON.stringify(initialProfile);
	if (nextProfileSignature !== appliedProfileSignature) {
		appliedProfileSignature = nextProfileSignature;
		if (showNameField) {
			authorName = initialProfile.authorName;
		}
		if (showEmailField) {
			authorEmail = initialProfile.authorEmail;
		}
		if (showWebsiteField) {
			authorWebsite = initialProfile.authorWebsite;
		}
		rememberProfile = true;
	}
}
$: submitButtonLabel = submitting
	? i18n(I18nKey.commentsSubmitting)
	: showCaptcha
		? i18n(I18nKey.commentsVoteConfirmProceed)
		: i18n(I18nKey.commentsSubmit);
$: replyTargetName = replyTarget?.authorName ?? "";
$: replyAvatarUrl = replyTarget?.avatarUrl ?? null;
$: showReplyAvatarImage =
	Boolean(replyAvatarUrl) && failedReplyAvatarUrl !== replyAvatarUrl;
$: replyingMessage = replyTargetName
	? i18n(I18nKey.commentsReplyingTo).replace("{author}", replyTargetName)
	: i18n(I18nKey.commentsReplying);
$: if (replyParentId !== previousReplyParentId) {
	previousReplyParentId = replyParentId;
	if (replyParentId) {
		focusComposerContent();
	}
}
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
		rememberProfile: !useVerifiedAuthor && rememberProfile,
		notifyOnReply: canNotifyOnReply && notifyOnReply,
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

async function focusComposerContent() {
	await tick();
	composerForm?.scrollIntoView({
		behavior: "smooth",
		block: "start",
	});
	contentInput?.focus();
}
$: metaFieldCount =
	(showNameField ? 1 : 0) +
	(showEmailField ? 1 : 0) +
	(showWebsiteField ? 1 : 0);
</script>

<svelte:window on:keydown={handleEmojiKeydown} />

<form
	bind:this={composerForm}
	class="comment-composer-shell rounded-panel"
	novalidate
	on:submit|preventDefault={handleSubmit}
>
	{#if replyParentId}
		<div class="p-3 pb-0">
			<div
				class="comment-reply-banner flex items-center justify-between gap-3"
				data-comment-replying="true"
			>
				<div class="flex min-w-0 items-center gap-2.5">
					{#if replyAvatarUrl && showReplyAvatarImage}
						<img
							alt={replyTargetName}
							class="comment-avatar h-7 w-7 rounded-full object-cover"
							src={replyAvatarUrl}
							on:error={() => {
								failedReplyAvatarUrl = replyAvatarUrl;
							}}
						/>
					{:else}
						<div class="comment-avatar flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-accent-foreground">
							{(replyTargetName || "?").slice(0, 1).toUpperCase()}
						</div>
					{/if}
					<p class="min-w-0 truncate text-xs text-75">
						{replyingMessage}
					</p>
				</div>
				<button
					class="comment-action shrink-0"
					type="button"
					on:click={handleCancelReply}
				>
					{i18n(I18nKey.commentsCancelReply)}
				</button>
			</div>
		</div>
	{/if}

	{#if metaFieldCount > 0}
		<div
			class="comment-composer-meta"
			class:comment-composer-meta-two={metaFieldCount === 2}
			class:comment-composer-meta-three={metaFieldCount >= 3}
		>
			{#if showNameField}
				<div
					class="comment-form-field comment-composer-field text-xs"
					class:comment-form-field-invalid={invalidFieldState.nickname}
					data-validation-state={invalidFieldState.nickname ? "invalid" : "idle"}
				>
					<label class="comment-form-field-label shrink-0 font-medium text-muted" for="comment-author-name">
						{formatFieldLabel(I18nKey.commentsFormName, "nickname")}
					</label>
					<input
						id="comment-author-name"
						bind:this={authorNameInput}
						bind:value={authorName}
						aria-invalid={invalidFieldState.nickname}
						autocomplete="name"
						class="comment-form-input comment-form-input-embedded text-sm text-90"
						maxlength={inputLimits.authorNameMaxLength}
						required={requiredFields.includes("nickname")}
						type="text"
					/>
				</div>
			{/if}

			{#if showEmailField}
				<div
					class="comment-form-field comment-composer-field text-xs"
					class:comment-form-field-invalid={invalidFieldState.email}
					data-validation-state={invalidFieldState.email ? "invalid" : "idle"}
				>
					<label class="comment-form-field-label shrink-0 font-medium text-muted" for="comment-author-email">
						{formatFieldLabel(I18nKey.commentsFormEmail, "email")}
					</label>
					<input
						id="comment-author-email"
						bind:this={authorEmailInput}
						bind:value={authorEmail}
						aria-invalid={invalidFieldState.email}
						autocomplete="email"
						class="comment-form-input comment-form-input-embedded text-sm text-90"
						maxlength="120"
						required={requiredFields.includes("email")}
						spellcheck="false"
						type="email"
					/>
				</div>
			{/if}

			{#if showWebsiteField}
				<label
					class="comment-form-field comment-composer-field text-xs"
					class:comment-form-field-invalid={invalidFieldState.website}
					data-validation-state={invalidFieldState.website ? "invalid" : "idle"}
				>
					<span class="comment-form-field-label shrink-0 font-medium text-muted">
						{formatFieldLabel(I18nKey.commentsFormWebsite, "website")}
					</span>
					<input
						bind:this={authorWebsiteInput}
						bind:value={authorWebsite}
						aria-invalid={invalidFieldState.website}
						class="comment-form-input comment-form-input-embedded text-sm text-75"
						maxlength={inputLimits.authorWebsiteMaxLength}
						placeholder="https://"
						required={requiredFields.includes("website")}
						type="url"
					/>
				</label>
			{/if}
		</div>
	{/if}

	<label
		class="comment-form-field comment-composer-textarea-wrap flex flex-col text-sm"
		class:comment-form-field-invalid={invalidFieldState.content}
		data-validation-state={invalidFieldState.content ? "invalid" : "idle"}
	>
		<span class="sr-only">{i18n(I18nKey.commentsFormContent)}</span>
		<textarea
			bind:this={contentInput}
			bind:value={content}
			aria-invalid={invalidFieldState.content}
			aria-label={i18n(I18nKey.commentsFormContent)}
			class="comment-form-input comment-form-input-embedded min-h-28 text-sm leading-6 text-90"
			maxlength={inputLimits.contentMaxLength}
			placeholder={i18n(I18nKey.commentsFormContent)}
			required
		></textarea>
	</label>

	<div class="comment-composer-actions comment-composer-footer flex flex-wrap items-center justify-between gap-2.5">
		<div class="order-2 flex shrink-0 justify-end md:flex-1 md:min-w-0">
			<div class="flex items-center justify-end">
				<div class="comment-captcha-popover-anchor">
					<button
						class="optical-btn-primary comment-submit-btn shrink-0"
						disabled={submitting}
						type="submit"
					>
						<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="m22 2-7 20-4-9-9-4Z" />
							<path d="M22 2 11 13" />
						</svg>
						<span>{submitButtonLabel}</span>
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

		<div class="order-1 mr-auto flex min-w-0 flex-wrap items-center gap-2">
			<div
				bind:this={emojiTriggerWrap}
				role="group"
				class="comment-emoji-trigger-wrap"
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
					<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<circle cx="12" cy="12" r="9" />
						<path d="M8.5 14.5s1.4 2 3.5 2 3.5-2 3.5-2" />
						<circle cx="9" cy="10" r=".8" fill="currentColor" stroke="none" />
						<circle cx="15" cy="10" r=".8" fill="currentColor" stroke="none" />
					</svg>
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

			{#if showNameField}
				<label class="comment-toggle-chip" class:comment-toggle-chip-checked={rememberProfile}>
					<input
						bind:checked={rememberProfile}
						class="comment-toggle-input"
						type="checkbox"
					/>
					<span class="comment-toggle-dot" aria-hidden="true"></span>
					<span>{i18n(I18nKey.commentsRememberProfile)}</span>
				</label>
			{/if}

			{#if canNotifyOnReply}
				<label class="comment-toggle-chip" class:comment-toggle-chip-checked={notifyOnReply}>
					<input
						bind:checked={notifyOnReply}
						class="comment-toggle-input"
						type="checkbox"
					/>
					<span class="comment-toggle-dot" aria-hidden="true"></span>
					<span>{i18n(I18nKey.commentsNotifyOnReply)}</span>
				</label>
			{/if}
		</div>
	</div>
</form>
