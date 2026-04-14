import type { CanonicalComment } from "@/types/comment";

export function buildCommentTree(comments: CanonicalComment[]): CanonicalComment[] {
	const commentMap = new Map(
		comments.map((comment) => [comment.id, { ...comment, children: [] as CanonicalComment[] }]),
	);
	const roots: CanonicalComment[] = [];

	for (const comment of commentMap.values()) {
		if (comment.parentId && commentMap.has(comment.parentId)) {
			commentMap.get(comment.parentId)?.children.push(comment);
			continue;
		}

		roots.push(comment);
	}

	const updateReplyCount = (items: CanonicalComment[]): CanonicalComment[] => {
		return items.map((comment) => ({
			...comment,
			children: updateReplyCount(comment.children),
			replyCount: comment.children.length,
		}));
	};

	return updateReplyCount(roots);
}

export function insertPendingComment(
	tree: CanonicalComment[],
	pendingComment: CanonicalComment,
): CanonicalComment[] {
	if (!pendingComment.parentId) {
		return [pendingComment, ...tree];
	}

	return tree.map((comment) => {
		if (comment.id === pendingComment.parentId) {
			return {
				...comment,
				replyCount: comment.replyCount + 1,
				children: [...comment.children, pendingComment],
			};
		}

		if (comment.children.length === 0) {
			return comment;
		}

		return {
			...comment,
			children: insertPendingComment(comment.children, pendingComment),
		};
	});
}
