import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");

test("comment vote UX should require inline confirmation, lock repeated votes, and persist viewer choice locally", async () => {
	const [
		commentSectionSource,
		commentItemSource,
		voteStateSource,
		i18nKeySource,
		enSource,
	] = await Promise.all([
		readFile(
			path.join(
				repoRoot,
				"src",
				"components",
				"comments",
				"CommentSection.svelte",
			),
			"utf8",
		),
		readFile(
			path.join(
				repoRoot,
				"src",
				"components",
				"comments",
				"CommentItem.svelte",
			),
			"utf8",
		),
		readFile(
			path.join(repoRoot, "src", "utils", "comments", "vote-state.ts"),
			"utf8",
		),
		readFile(path.join(repoRoot, "src", "i18n", "i18nKey.ts"), "utf8"),
		readFile(
			path.join(repoRoot, "src", "i18n", "languages", "en.ts"),
			"utf8",
		),
	]);

	assert.match(commentSectionSource, /applyPersistedViewerVotes\(/);
	assert.match(commentSectionSource, /persistViewerVote\(/);
	assert.match(commentSectionSource, /let voteBusyCommentId: string \| null = null;/);
	assert.match(commentSectionSource, /let pendingVoteTarget: VoteConfirmTarget = null;/);
	assert.match(
		commentSectionSource,
		/comments = applyPersistedViewerVotes\(postKey, threadPage\.comments\);/,
	);
	assert.match(commentSectionSource, /if \(!previousComment \|\| previousComment\.viewerVote\) \{/);
	assert.match(commentSectionSource, /requestVoteConfirm\(commentId, choice\);/);
	assert.match(commentSectionSource, /async function handleConfirmVote\(/);
	assert.match(
		commentSectionSource,
		/persistViewerVote\(postKey, commentId, updatedComment\.viewerVote \?\? choice\);/,
	);
	assert.match(commentItemSource, /activeVoteConfirmCommentId/);
	assert.match(commentItemSource, /pendingVoteChoice/);
	assert.match(commentItemSource, /showVoteConfirm/);
	assert.match(commentItemSource, /disabled=\{voteDisabled\}/);
	assert.match(commentItemSource, /Boolean\(comment\.viewerVote\) \|\| voteBusy/);
	assert.match(commentItemSource, /commentsVoteConfirmTipUp/);
	assert.match(commentItemSource, /commentsVoteConfirmTipDown/);
	assert.match(commentItemSource, /commentsVoteConfirmProceed/);
	assert.match(commentItemSource, /commentsVoteConfirmCancel/);
	assert.match(voteStateSource, /COMMENT_VOTE_STORAGE_KEY/);
	assert.match(voteStateSource, /window\.localStorage\.getItem/);
	assert.match(voteStateSource, /window\.localStorage\.setItem/);
	assert.match(voteStateSource, /buildPersistedVoteKey/);

	for (const key of [
		"commentsVoteConfirmTipUp",
		"commentsVoteConfirmTipDown",
		"commentsVoteConfirmProceed",
		"commentsVoteConfirmCancel",
	]) {
		assert.match(i18nKeySource, new RegExp(`${key}\\s*=`));
		assert.match(enSource, new RegExp(`\\[Key\\.${key}\\]`));
	}
});
