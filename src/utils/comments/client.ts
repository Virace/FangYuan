import { commentConfig } from "../../config";
import type {
	CreateCommentInput,
	GetCommentThreadInput,
	VerifyCommentCaptchaInput,
	VoteCommentInput,
} from "./provider";
import { getCommentProvider } from "./provider";
import { buildCommentTree } from "./tree";

export function getCommentClient() {
	const provider = getCommentProvider(commentConfig);
	if (!provider) {
		return null;
	}

	return {
		async getCapability(postKey: string) {
			return provider.getCapability(postKey);
		},
		async getThread(input: GetCommentThreadInput) {
			const threadPage = await provider.getThread(input);
			return {
				...threadPage,
				comments: buildCommentTree(threadPage.comments),
			};
		},
		async getCaptchaState() {
			return provider.getCaptchaState();
		},
		async refreshCaptcha() {
			return provider.refreshCaptcha();
		},
		async verifyCaptcha(input: VerifyCommentCaptchaInput) {
			return provider.verifyCaptcha(input);
		},
		async createComment(input: CreateCommentInput) {
			return provider.createComment(input);
		},
		async voteComment(input: VoteCommentInput) {
			return provider.voteComment(input);
		},
	};
}
