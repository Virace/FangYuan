import type { CommentConfig } from "@/types/config";

export const DEFAULT_COMMENT_ROOT_LIMIT = 5;
export const DEFAULT_COMMENT_MAX_DEPTH = 3;
export const MIN_COMMENT_ROOT_LIMIT = 1;
export const MIN_COMMENT_MAX_DEPTH = 1;

function clampCommentNumber(
	value: number | undefined,
	fallback: number,
	minimum: number,
): number {
	return Math.max(minimum, Math.floor(value ?? fallback));
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
