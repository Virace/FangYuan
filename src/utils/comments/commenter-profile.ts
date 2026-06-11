import type { CommentAuthorField } from "./provider";

export type CommenterProfile = {
	authorName: string;
	authorEmail: string;
	authorWebsite: string;
	expiresAt: string;
};

export const COMMENTER_PROFILE_TTL_MS: number = 90 * 24 * 60 * 60 * 1000;

const COMMENTER_PROFILE_STORAGE_PREFIX = "qingyan:commenter-profile:v1";

function buildStorageKey(siteKey: string): string {
	return `${COMMENTER_PROFILE_STORAGE_PREFIX}:${encodeURIComponent(siteKey)}`;
}

function isAllowed(
	allowedFields: CommentAuthorField[],
	field: CommentAuthorField,
): boolean {
	return allowedFields.includes(field);
}

function readString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function normalizeProfile(
	value: unknown,
	allowedFields: CommentAuthorField[],
): CommenterProfile | null {
	if (!value || typeof value !== "object") {
		return null;
	}

	const record = value as Record<string, unknown>;
	const expiresAt = readString(record.expiresAt);
	const expiresAtMs = Date.parse(expiresAt);
	if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
		return null;
	}

	const profile = {
		authorName: isAllowed(allowedFields, "nickname")
			? readString(record.authorName)
			: "",
		authorEmail: isAllowed(allowedFields, "email")
			? readString(record.authorEmail)
			: "",
		authorWebsite: isAllowed(allowedFields, "website")
			? readString(record.authorWebsite)
			: "",
		expiresAt,
	};

	return profile.authorName || profile.authorEmail || profile.authorWebsite
		? profile
		: null;
}

export function clearCommenterProfile(siteKey: string): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.localStorage.removeItem(buildStorageKey(siteKey));
	} catch (error) {
		console.warn("[comments] failed to clear commenter profile", error);
	}
}

export function loadCommenterProfile(
	siteKey: string,
	allowedFields: CommentAuthorField[],
): CommenterProfile | null {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		const key = buildStorageKey(siteKey);
		const raw = window.localStorage.getItem(key);
		if (!raw) {
			return null;
		}

		const profile = normalizeProfile(JSON.parse(raw), allowedFields);
		if (!profile) {
			window.localStorage.removeItem(key);
		}
		return profile;
	} catch (error) {
		console.warn("[comments] failed to read commenter profile", error);
		return null;
	}
}

export function saveCommenterProfile(
	siteKey: string,
	input: Omit<CommenterProfile, "expiresAt">,
	allowedFields: CommentAuthorField[],
): void {
	if (typeof window === "undefined") {
		return;
	}

	const profile: CommenterProfile = {
		authorName: isAllowed(allowedFields, "nickname")
			? input.authorName.trim()
			: "",
		authorEmail: isAllowed(allowedFields, "email")
			? input.authorEmail.trim()
			: "",
		authorWebsite: isAllowed(allowedFields, "website")
			? input.authorWebsite.trim()
			: "",
		expiresAt: new Date(Date.now() + COMMENTER_PROFILE_TTL_MS).toISOString(),
	};

	if (!profile.authorName && !profile.authorEmail && !profile.authorWebsite) {
		clearCommenterProfile(siteKey);
		return;
	}

	try {
		window.localStorage.setItem(
			buildStorageKey(siteKey),
			JSON.stringify(profile),
		);
	} catch (error) {
		console.warn("[comments] failed to save commenter profile", error);
	}
}
