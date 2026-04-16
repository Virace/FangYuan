import type { CanonicalComment } from "@/types/comment";

export type CommentAuthorField = "name" | "email" | "website";

export type CommentPersistenceMode = "persistent" | "preview_only";

export type CommentIdentityModel = "page_key" | "mirrored_post" | "preview";

export type CommentCapability = {
	enabled: boolean;
	provider: string;
	supportsReply: boolean;
	supportsVote: boolean;
	supportsCaptcha: boolean;
	persistenceMode: CommentPersistenceMode;
	identityModel: CommentIdentityModel;
	requiredAuthorFields: CommentAuthorField[];
	optionalAuthorFields: CommentAuthorField[];
	message?: string;
};

export type CommentCaptchaChallenge = {
	kind: string;
	imageData?: string | null;
	html?: string | null;
	metadata?: Record<string, string>;
};

export type CommentCaptchaState = {
	required: boolean;
	verified: boolean;
	challenge?: CommentCaptchaChallenge | null;
};

export type VerifyCommentCaptchaInput = {
	kind: string;
	value: string;
};

export type CommentSortBy = "date_desc" | "date_asc";

export class CommentCaptchaRequiredError extends Error {
	readonly state: CommentCaptchaState | null;

	constructor(message: string, state: CommentCaptchaState | null = null) {
		super(message);
		this.name = "CommentCaptchaRequiredError";
		this.state = state;
	}
}

export type CreateCommentInput = {
	postKey: string;
	postTitle?: string;
	parentId?: string | null;
	author: {
		name: string;
		email: string;
		website?: string | null;
	};
	content: string;
	captcha?: VerifyCommentCaptchaInput | null;
};

export type VoteCommentInput = {
	commentId: string;
	choice: "up" | "down";
};

export type GetCommentThreadInput = {
	postKey: string;
	sortBy?: CommentSortBy;
	limit?: number;
	offset?: number;
};

export type CommentThreadPage = {
	comments: CanonicalComment[];
	totalCount: number;
	rootsCount: number;
	offset: number;
	limit: number;
	sortBy: CommentSortBy;
};

export abstract class CommentProvider {
	abstract readonly kind: string;

	abstract getCapability(postKey: string): Promise<CommentCapability>;
	abstract getThread(input: GetCommentThreadInput): Promise<CommentThreadPage>;
	abstract createComment(input: CreateCommentInput): Promise<CanonicalComment>;

	async getCaptchaState(): Promise<CommentCaptchaState | null> {
		return null;
	}

	async refreshCaptcha(): Promise<CommentCaptchaState | null> {
		return this.getCaptchaState();
	}

	async verifyCaptcha(
		_input: VerifyCommentCaptchaInput,
	): Promise<CommentCaptchaState> {
		throw new Error("Comment captcha is not supported by this provider.");
	}

	async voteComment(_input: VoteCommentInput): Promise<CanonicalComment> {
		throw new Error("Comment voting is not supported by this provider.");
	}
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
