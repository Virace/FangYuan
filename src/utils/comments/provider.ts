export type CommentAuthorField = "nickname" | "email" | "website";

export type CommentForm = {
	allow: CommentAuthorField[];
	require: CommentAuthorField[];
};

export type CommentPersistenceMode = "persistent";

export type CommentIdentityModel = "page_key" | "mirrored_post";

export type CommentCapability = {
	enabled: boolean;
	provider: string;
	supportsReply: boolean;
	supportsVote: boolean;
	supportsCaptcha: boolean;
	supportsReplyEmailNotification: boolean;
	persistenceMode: CommentPersistenceMode;
	identityModel: CommentIdentityModel;
	message?: string;
};

export type CommentCaptchaHostMode =
	| "inline_value"
	| "iframe_widget"
	| "token_widget";

export type CommentCaptchaVerificationModel =
	| "backend_session"
	| "request_token";

export type CommentCaptchaChallenge =
	| {
			mode: "inline_value";
			inputType: "text";
			imageData?: string | null;
			placeholder?: string;
			metadata?: Record<string, string>;
	  }
	| {
			mode: "iframe_widget";
			iframeSrc: string;
			refreshToken?: string;
			metadata?: Record<string, string>;
	  }
	| {
			mode: "token_widget";
			providerKey: string;
			scriptSrc?: string;
			siteKey?: string;
			metadata?: Record<string, string>;
	  };

export type CommentCaptchaState = {
	required: boolean;
	verified: boolean;
	mode: CommentCaptchaHostMode | null;
	verificationModel: CommentCaptchaVerificationModel | null;
	challenge?: CommentCaptchaChallenge | null;
};

export type VerifyCommentCaptchaInput = {
	mode: "inline_value";
	value: string;
};

export type CommentCaptchaWriteInput = VerifyCommentCaptchaInput & {
	challengeId: string;
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
	captcha?: CommentCaptchaWriteInput | null;
	notifyOnReply?: boolean;
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
