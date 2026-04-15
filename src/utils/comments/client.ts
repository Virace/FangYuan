import { commentConfig } from "../../config";
import { buildCommentTree } from "./tree";
import { getCommentProvider } from "./provider";
import type { CreateCommentInput, VoteCommentInput } from "./provider";

export function getCommentClient() {
	const provider = getCommentProvider(commentConfig);
	if (!provider) {
		return null;
	}

	return {
		async getCapability(postKey: string) {
			return provider.getCapability(postKey);
		},
		async getThread(postKey: string) {
			const comments = await provider.getThread(postKey);
			return buildCommentTree(comments);
		},
		async createComment(input: CreateCommentInput) {
			return provider.createComment(input);
		},
		async voteComment(input: VoteCommentInput) {
			return provider.voteComment(input);
		},
	};
}
