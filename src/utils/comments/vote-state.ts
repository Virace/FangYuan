import type { CanonicalComment, CommentVoteChoice } from "@/types/comment";

const COMMENT_VOTE_STORAGE_KEY = "fangyuan:comment-votes:v1";

type PersistedCommentVoteStore = Record<string, CommentVoteChoice>;

function buildPersistedVoteKey(postKey: string, commentId: string): string {
	return `${postKey}::${commentId}`;
}

function normalizePersistedVote(value: unknown): CommentVoteChoice | null {
	return value === "up" || value === "down" ? value : null;
}

function readPersistedVoteStore(): PersistedCommentVoteStore {
	if (typeof window === "undefined") {
		return {};
	}

	try {
		const raw = window.localStorage.getItem(COMMENT_VOTE_STORAGE_KEY);
		if (!raw) {
			return {};
		}

		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") {
			return {};
		}

		const voteStore: PersistedCommentVoteStore = {};
		for (const [key, value] of Object.entries(parsed)) {
			const normalizedVote = normalizePersistedVote(value);
			if (normalizedVote) {
				voteStore[key] = normalizedVote;
			}
		}

		return voteStore;
	} catch (error) {
		console.warn("[comments] failed to read persisted votes", error);
		return {};
	}
}

function writePersistedVoteStore(store: PersistedCommentVoteStore) {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.localStorage.setItem(
			COMMENT_VOTE_STORAGE_KEY,
			JSON.stringify(store),
		);
	} catch (error) {
		console.warn("[comments] failed to persist votes", error);
	}
}

export function readPersistedViewerVote(
	postKey: string,
	commentId: string,
): CommentVoteChoice | null {
	const voteStore = readPersistedVoteStore();
	return voteStore[buildPersistedVoteKey(postKey, commentId)] ?? null;
}

export function persistViewerVote(
	postKey: string,
	commentId: string,
	choice: CommentVoteChoice,
) {
	const voteStore = readPersistedVoteStore();
	voteStore[buildPersistedVoteKey(postKey, commentId)] = choice;
	writePersistedVoteStore(voteStore);
}

export function applyPersistedViewerVotes(
	postKey: string,
	comments: CanonicalComment[],
): CanonicalComment[] {
	return comments.map((comment) => {
		const persistedVote = readPersistedViewerVote(postKey, comment.id);
		return {
			...comment,
			viewerVote: comment.viewerVote ?? persistedVote,
			children: applyPersistedViewerVotes(postKey, comment.children),
		};
	});
}
