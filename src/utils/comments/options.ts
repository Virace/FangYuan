import type { CommentConfig } from "@/types/config";

import type { CommentSortBy } from "./provider";

export const DEFAULT_COMMENT_ROOT_LIMIT = 5;
export const DEFAULT_COMMENT_MAX_DEPTH = 3;
export const MIN_COMMENT_ROOT_LIMIT = 1;
export const MIN_COMMENT_MAX_DEPTH = 1;
export const DEFAULT_COMMENT_SORT_BY: CommentSortBy = "date_desc";

function clampCommentNumber(
	value: number | undefined,
	fallback: number,
	minimum: number,
): number {
	return Math.max(minimum, Math.floor(value ?? fallback));
}

export function normalizeCommentOffset(value: number | undefined): number {
	return Math.max(0, Math.floor(value ?? 0));
}

export function normalizeCommentConfig(config: CommentConfig): CommentConfig {
	return {
		...config,
		rootLimit: clampCommentNumber(
			config.rootLimit,
			DEFAULT_COMMENT_ROOT_LIMIT,
			MIN_COMMENT_ROOT_LIMIT,
		),
		maxDepth: clampCommentNumber(
			config.maxDepth,
			DEFAULT_COMMENT_MAX_DEPTH,
			MIN_COMMENT_MAX_DEPTH,
		),
	};
}
