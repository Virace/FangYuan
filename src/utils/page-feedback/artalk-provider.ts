import {
	createArtalkPageFeedbackService,
	type ArtalkPageFeedbackServiceConfig,
} from "../artalk/pages";
import {
	type GetPageFeedbackInput,
	type LikePageInput,
	type PageFeedbackState,
	PageFeedbackProvider,
} from "./provider";

export class ArtalkPageFeedbackProvider extends PageFeedbackProvider {
	readonly kind = "artalk";
	private readonly artalkPageFeedbackService: ReturnType<
		typeof createArtalkPageFeedbackService
	>;

	constructor(config: ArtalkPageFeedbackServiceConfig) {
		super();
		this.artalkPageFeedbackService = createArtalkPageFeedbackService(config);
	}

	async getState(input: GetPageFeedbackInput): Promise<PageFeedbackState> {
		return this.artalkPageFeedbackService.getState(input);
	}

	async likePage(input: LikePageInput): Promise<PageFeedbackState> {
		return this.artalkPageFeedbackService.likePage(input);
	}
}
