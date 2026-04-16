import { createArtalkPageMetricsService } from "../artalk/pages";
import { type PageMetrics, PageMetricsProvider } from "./provider";

type ArtalkPageMetricsProviderConfig = {
	apiBase: string;
	siteName: string;
};

export class ArtalkPageMetricsProvider extends PageMetricsProvider {
	readonly kind = "artalk";
	private readonly artalkPageMetricsService: ReturnType<
		typeof createArtalkPageMetricsService
	>;

	constructor(config: ArtalkPageMetricsProviderConfig) {
		super();
		this.artalkPageMetricsService = createArtalkPageMetricsService(config);
	}

	async recordPageView(input: {
		postKey: string;
		postTitle?: string;
	}): Promise<PageMetrics> {
		return this.artalkPageMetricsService.recordPageView(input);
	}
}
