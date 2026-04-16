import { pageFeedbackConfig } from "../../config";
import type { GetPageFeedbackInput, LikePageInput } from "./provider";

export function getPageFeedbackClient() {
	const provider = pageFeedbackConfig.enable
		? (pageFeedbackConfig.provider ?? null)
		: null;
	if (!provider) {
		return null;
	}

	return {
		async getCapability(input: GetPageFeedbackInput) {
			return provider.getCapability(input);
		},
		async getState(input: GetPageFeedbackInput) {
			return provider.getState(input);
		},
		async likePage(input: LikePageInput) {
			return provider.likePage(input);
		},
	};
}
