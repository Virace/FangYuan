export type PageMetrics = {
	pv: number;
};

export abstract class PageMetricsProvider {
	abstract readonly kind: string;

	abstract recordPageView(input: {
		postKey: string;
		postTitle?: string;
	}): Promise<PageMetrics>;
}
