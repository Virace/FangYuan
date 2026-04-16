import { createArtalkCaptchaService } from "../artalk/captcha";
import {
	type ArtalkCommentServiceConfig,
	createArtalkCommentService,
} from "../artalk/comments";
import { ArtalkApiError } from "../artalk/core";
import {
	type CommentCapability,
	CommentCaptchaRequiredError,
	type CommentCaptchaState,
	CommentProvider,
	type CreateCommentInput,
	type GetCommentThreadInput,
	type VerifyCommentCaptchaInput,
	type VoteCommentInput,
} from "./provider";

export type ArtalkCommentProviderConfig = ArtalkCommentServiceConfig;

function looksLikeCaptchaRequired(error: unknown): error is ArtalkApiError {
	if (!(error instanceof ArtalkApiError)) {
		return false;
	}

	const message = error.message.toLowerCase();
	return message.includes("captcha") || message.includes("验证码");
}

export class ArtalkCommentProvider extends CommentProvider {
	readonly kind = "artalk";
	private readonly artalkCommentService: ReturnType<
		typeof createArtalkCommentService
	>;
	private readonly artalkCaptchaService: ReturnType<
		typeof createArtalkCaptchaService
	>;

	constructor(config: ArtalkCommentProviderConfig) {
		super();
		this.artalkCommentService = createArtalkCommentService(config);
		this.artalkCaptchaService = createArtalkCaptchaService(config);
	}

	async getCapability(postKey: string): Promise<CommentCapability> {
		return this.artalkCommentService.getCapability(postKey);
	}

	async getThread(input: GetCommentThreadInput) {
		return this.artalkCommentService.getThread(input);
	}

	private async refreshCaptchaStateOrNull(): Promise<CommentCaptchaState | null> {
		try {
			return await this.artalkCaptchaService.refresh();
		} catch (error) {
			console.error(
				"[Artalk captcha] refresh failed after captcha requirement",
				error,
			);
			return null;
		}
	}

	async createComment(input: CreateCommentInput) {
		try {
			return await this.artalkCommentService.createComment(input);
		} catch (error) {
			if (looksLikeCaptchaRequired(error)) {
				const state = await this.refreshCaptchaStateOrNull();
				throw new CommentCaptchaRequiredError(error.message, state);
			}

			throw error;
		}
	}

	async getCaptchaState(): Promise<CommentCaptchaState | null> {
		return this.artalkCaptchaService.getState();
	}

	async refreshCaptcha(): Promise<CommentCaptchaState | null> {
		return this.artalkCaptchaService.refresh();
	}

	async verifyCaptcha(
		input: VerifyCommentCaptchaInput,
	): Promise<CommentCaptchaState> {
		return this.artalkCaptchaService.verify(input);
	}

	async voteComment(input: VoteCommentInput) {
		try {
			return await this.artalkCommentService.voteComment(input);
		} catch (error) {
			if (looksLikeCaptchaRequired(error)) {
				const state = await this.refreshCaptchaStateOrNull();
				throw new CommentCaptchaRequiredError(error.message, state);
			}

			throw error;
		}
	}
}
