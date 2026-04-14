import type { CanonicalComment } from "@/types/comment";

export type CommentCapability = {
	enabled: boolean;
	provider: string;
	supportsReply: boolean;
	message?: string;
};

export type CreateCommentInput = {
	postKey: string;
	parentId?: string | null;
	author: {
		name: string;
		email: string;
		website?: string | null;
	};
	content: string;
};

export abstract class CommentProvider {
	abstract readonly kind: string;

	abstract getCapability(postKey: string): Promise<CommentCapability>;
	abstract getThread(postKey: string): Promise<CanonicalComment[]>;
	abstract createComment(input: CreateCommentInput): Promise<CanonicalComment>;
}

export function getCommentProvider(config: {
	enable: boolean;
	provider?: CommentProvider | null;
}): CommentProvider | null {
	if (!config.enable) {
		return null;
	}

	return config.provider ?? null;
}
