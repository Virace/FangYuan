export function getPostKeyFromEntry(entryId: string): string {
	return entryId.replace(/^\/+|\/+$/g, "");
}
