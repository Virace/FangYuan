import I18nKey from "../../i18n/i18nKey";
import type { CommentAuthorField } from "./provider";

export type CommentFormInput = {
	authorName: string;
	authorEmail: string;
	authorWebsite: string;
	content: string;
};

export type CommentFormValidationRules = {
	requiredFields: CommentAuthorField[];
};

const suspiciousSqlPattern =
	/\b(select\s+.+from|insert\s+into|update\s+\w+\s+set|delete\s+from|drop\s+table|union\s+select|truncate\s+table|alter\s+table)\b|--|\/\*|\*\//i;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export function renderPlainCommentHtml(value: string): string {
	return `<p>${escapeHtml(value).replaceAll("\n", "<br />")}</p>`;
}

export function validateCommentForm(
	input: CommentFormInput,
	rules: CommentFormValidationRules,
): I18nKey | null {
	const authorName = input.authorName.trim();
	const authorEmail = input.authorEmail.trim();
	const authorWebsite = input.authorWebsite.trim();
	const content = input.content.trim();

	if (rules.requiredFields.includes("nickname") && !authorName) {
		return I18nKey.commentsValidationNameRequired;
	}

	if (
		rules.requiredFields.includes("email") &&
		!emailPattern.test(authorEmail)
	) {
		return I18nKey.commentsValidationEmailInvalid;
	}

	if (!content) {
		return I18nKey.commentsValidationContentRequired;
	}

	if (
		suspiciousSqlPattern.test(authorName) ||
		suspiciousSqlPattern.test(content)
	) {
		return I18nKey.commentsValidationContentUnsafe;
	}

	if (rules.requiredFields.includes("website") && !authorWebsite) {
		return I18nKey.commentsValidationWebsiteInvalid;
	}

	if (authorWebsite) {
		try {
			new URL(authorWebsite);
		} catch {
			return I18nKey.commentsValidationWebsiteInvalid;
		}
	}

	return null;
}
