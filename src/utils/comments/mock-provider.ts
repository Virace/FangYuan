import type { CanonicalComment } from "@/types/comment";
import { CommentProvider, type CommentCapability, type CreateCommentInput } from "./provider";
import { renderPlainCommentHtml } from "./validation";

function createMockComment(
	input: Pick<CreateCommentInput, "author" | "content"> & {
		postKey: string;
		id: string;
		parentId?: string | null;
	},
): CanonicalComment {
	const content = input.content.trim();

	return {
		id: input.id,
		postId: input.postKey,
		parentId: input.parentId ?? null,
		author: {
			name: input.author.name,
			email: input.author.email,
			website: input.author.website ?? null,
		},
		content: {
			raw: content,
			html: renderPlainCommentHtml(content),
		},
		status: "local_pending",
		createdAt: new Date().toISOString(),
		replyCount: 0,
		voteUp: 0,
		voteDown: 0,
		viewerVote: null,
		children: [],
	};
}

function createMockThread(postKey: string): CanonicalComment[] {
	return [
		{
			id: "mock-1",
			postId: postKey,
			parentId: null,
			author: {
				name: "Mock Visitor",
				website: "https://example.com",
			},
			content: {
				raw: "This is a mock comment used for static development preview.",
				html: "<p>This is a mock comment used for static development preview.</p>",
			},
			status: "approved",
			createdAt: "2026-04-14T10:00:00.000Z",
			replyCount: 0,
			voteUp: 0,
			voteDown: 0,
			viewerVote: null,
			children: [],
		},
		{
			id: "mock-1-1",
			postId: postKey,
			parentId: "mock-1",
			author: {
				name: "Mock Author",
			},
			content: {
				raw: "Replies are also rendered through the canonical tree.",
				html: "<p>Replies are also rendered through the canonical tree.</p>",
			},
			status: "approved",
			createdAt: "2026-04-14T10:05:00.000Z",
			replyCount: 0,
			voteUp: 0,
			voteDown: 0,
			viewerVote: null,
			children: [],
		},
		{
			id: "mock-1-1-1",
			postId: postKey,
			parentId: "mock-1-1",
			author: {
				name: "Depth Three",
			},
			content: {
				raw: "The mock provider now demonstrates a third visible depth level.",
				html: "<p>The mock provider now demonstrates a third visible depth level.</p>",
			},
			status: "approved",
			createdAt: "2026-04-14T10:06:00.000Z",
			replyCount: 0,
			voteUp: 0,
			voteDown: 0,
			viewerVote: null,
			children: [],
		},
		{
			id: "mock-2",
			postId: postKey,
			parentId: null,
			author: {
				name: "Another Reader",
			},
			content: {
				raw: "Switch this provider off in config to hide comments completely.",
				html: "<p>Switch this provider off in config to hide comments completely.</p>",
			},
			status: "approved",
			createdAt: "2026-04-14T10:10:00.000Z",
			replyCount: 0,
			voteUp: 0,
			voteDown: 0,
			viewerVote: null,
			children: [],
		},
		{
			id: "mock-3",
			postId: postKey,
			parentId: null,
			author: {
				name: "Guide Reader",
			},
			content: {
				raw: "This root comment exists to demonstrate configurable root limits.",
				html: "<p>This root comment exists to demonstrate configurable root limits.</p>",
			},
			status: "approved",
			createdAt: "2026-04-14T10:20:00.000Z",
			replyCount: 0,
			voteUp: 0,
			voteDown: 0,
			viewerVote: null,
			children: [],
		},
		{
			id: "mock-4",
			postId: postKey,
			parentId: null,
			author: {
				name: "Theme Watcher",
			},
			content: {
				raw: "Comment text should follow the site theme instead of staying plain black.",
				html: "<p>Comment text should follow the site theme instead of staying plain black.</p>",
			},
			status: "approved",
			createdAt: "2026-04-14T10:30:00.000Z",
			replyCount: 0,
			voteUp: 0,
			voteDown: 0,
			viewerVote: null,
			children: [],
		},
		{
			id: "mock-5",
			postId: postKey,
			parentId: null,
			author: {
				name: "Pagination Tester",
			},
			content: {
				raw: "Root comment limits are now configurable with a minimum value of 1.",
				html: "<p>Root comment limits are now configurable with a minimum value of 1.</p>",
			},
			status: "approved",
			createdAt: "2026-04-14T10:40:00.000Z",
			replyCount: 0,
			voteUp: 0,
			voteDown: 0,
			viewerVote: null,
			children: [],
		},
		{
			id: "mock-6",
			postId: postKey,
			parentId: null,
			author: {
				name: "Hidden Root",
			},
			content: {
				raw: "This sixth root comment only appears when the configured root limit is greater than five.",
				html: "<p>This sixth root comment only appears when the configured root limit is greater than five.</p>",
			},
			status: "approved",
			createdAt: "2026-04-14T10:50:00.000Z",
			replyCount: 0,
			voteUp: 0,
			voteDown: 0,
			viewerVote: null,
			children: [],
		},
	];
}

export class MockCommentProvider extends CommentProvider {
	readonly kind = "mock";

	async getCapability(_postKey: string) {
		return {
			enabled: true,
			provider: this.kind,
			supportsReply: true,
			supportsVote: false,
		} satisfies CommentCapability;
	}

	async getThread(postKey: string) {
		return createMockThread(postKey);
	}

	async createComment(input: CreateCommentInput) {
		return createMockComment({
			...input,
			id: `mock-${Date.now()}`,
			postKey: input.postKey,
		});
	}
}

export const mockCommentProvider = new MockCommentProvider();
