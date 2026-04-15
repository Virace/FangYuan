import {
	createArtalkCommentService,
	type ArtalkCommentServiceConfig,
} from "../artalk/comments";
import {
	CommentProvider,
	type CommentCapability,
	type CreateCommentInput,
	type VoteCommentInput,
} from "./provider";

export type ArtalkCommentProviderConfig = ArtalkCommentServiceConfig;

export class ArtalkCommentProvider extends CommentProvider {
	readonly kind = "artalk";
	private readonly artalkCommentService: ReturnType<typeof createArtalkCommentService>;

	constructor(config: ArtalkCommentProviderConfig) {
		super();
		this.artalkCommentService = createArtalkCommentService(config);
	}

	async getCapability(postKey: string): Promise<CommentCapability> {
		return this.artalkCommentService.getCapability(postKey);
	}

	async getThread(postKey: string) {
		return this.artalkCommentService.getThread(postKey);
	}

	async createComment(input: CreateCommentInput) {
		return this.artalkCommentService.createComment(input);
	}

	async voteComment(input: VoteCommentInput) {
		return this.artalkCommentService.voteComment(input);
	}
}
