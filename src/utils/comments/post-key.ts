export type ContentCommentKind = "post" | "spec";

function normalizeEntryId(entryId: string): string {
	return entryId.replace(/^\/+|\/+$/g, "");
}

export function getContentCommentKey(
	kind: ContentCommentKind,
	entryId: string,
): string {
	const normalizedEntryId = normalizeEntryId(entryId);

	if (kind === "post") {
		return normalizedEntryId;
	}

	return `spec:${normalizedEntryId}`;
}

export function getPostKeyFromEntry(entryId: string): string {
	return getContentCommentKey("post", entryId);
}
