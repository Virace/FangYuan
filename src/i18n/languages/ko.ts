import Key from "../i18nKey";
import type { Translation } from "../translation";

export const ko: Translation = {
	[Key.home]: "홈",
	[Key.about]: "소개",
	[Key.archive]: "아카이브",
	[Key.search]: "검색",

	[Key.tags]: "태그",
	[Key.categories]: "카테고리",
	[Key.recentPosts]: "최근 게시물",

	[Key.comments]: "댓글",
	[Key.commentsLoading]: "Loading comments...",
	[Key.commentsEmpty]: "No comments yet. Start the conversation.",
	[Key.commentsDisabled]: "Comments are currently unavailable.",
	[Key.commentsLoadFailed]: "Failed to load comments.",
	[Key.commentsSubmit]: "Post Comment",
	[Key.commentsSubmitting]: "Posting...",
	[Key.commentsSubmitSuccess]: "Comment submitted successfully.",
	[Key.commentsReply]: "Reply",
	[Key.commentsReplying]: "Replying to this comment.",
	[Key.commentsCancelReply]: "Cancel reply",
	[Key.commentsEmoji]: "이모지",
	[Key.commentsVoteUp]: "추천",
	[Key.commentsVoteDown]: "비추천",
	[Key.commentsModerationNotice]: "Awaiting moderation",
	[Key.commentsFormName]: "Name",
	[Key.commentsFormEmail]: "Email",
	[Key.commentsFormWebsite]: "Website",
	[Key.commentsFormContent]: "Comment",
	[Key.commentCountSingular]: "comment",
	[Key.commentCountPlural]: "comments",
	[Key.commentsValidationNameRequired]: "Please enter a nickname.",
	[Key.commentsValidationEmailInvalid]: "Please enter a valid email address.",
	[Key.commentsValidationContentRequired]: "Comment content cannot be empty.",
	[Key.commentsValidationContentUnsafe]:
		"Comment contains suspicious content. Please revise it.",
	[Key.commentsValidationWebsiteInvalid]: "Please enter a valid website URL.",

	[Key.untitled]: "제목 없음",
	[Key.uncategorized]: "분류되지 않음",
	[Key.noTags]: "태그 없음",

	[Key.wordCount]: "단어",
	[Key.wordsCount]: "단어",
	[Key.minuteCount]: "분",
	[Key.minutesCount]: "분",
	[Key.postCount]: "게시물",
	[Key.postsCount]: "게시물",

	[Key.themeColor]: "테마 색상",

	[Key.lightMode]: "밝은 모드",
	[Key.darkMode]: "어두운 모드",
	[Key.systemMode]: "시스템 모드",

	[Key.more]: "더 보기",

	[Key.author]: "저자",
	[Key.publishedAt]: "게시일",
	[Key.pageViews]: "조회수",
	[Key.license]: "라이선스",
};
