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

export type CommentFormValidationField = CommentAuthorField | "content";

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
	const invalidFields = collectCommentFormInvalidFields(input, rules);

	if (invalidFields.includes("nickname")) {
		return I18nKey.commentsValidationNameRequired;
	}

	if (invalidFields.includes("email")) {
		return I18nKey.commentsValidationEmailInvalid;
	}

	if (invalidFields.includes("content")) {
		return suspiciousSqlPattern.test(input.content.trim())
			? I18nKey.commentsValidationContentUnsafe
			: I18nKey.commentsValidationContentRequired;
	}

	if (invalidFields.includes("website")) {
		return I18nKey.commentsValidationWebsiteInvalid;
	}

	return null;
}

export function collectCommentFormInvalidFields(
	input: CommentFormInput,
	rules: CommentFormValidationRules,
): CommentFormValidationField[] {
	const authorName = input.authorName.trim();
	const authorEmail = input.authorEmail.trim();
	const authorWebsite = input.authorWebsite.trim();
	const content = input.content.trim();
	const invalidFields: CommentFormValidationField[] = [];

	if (rules.requiredFields.includes("nickname") && !authorName) {
		invalidFields.push("nickname");
	}

	if (
		(rules.requiredFields.includes("email") && !authorEmail) ||
		(authorEmail && !emailPattern.test(authorEmail))
	) {
		invalidFields.push("email");
	}

	if (!content) {
		invalidFields.push("content");
	}

	if (
		suspiciousSqlPattern.test(authorName) ||
		suspiciousSqlPattern.test(content)
	) {
		if (!invalidFields.includes("content")) {
			invalidFields.push("content");
		}
	}

	if (rules.requiredFields.includes("website") && !authorWebsite) {
		invalidFields.push("website");
	}

	if (authorWebsite) {
		try {
			new URL(authorWebsite);
		} catch {
			if (!invalidFields.includes("website")) {
				invalidFields.push("website");
			}
		}
	}

	return invalidFields;
}
