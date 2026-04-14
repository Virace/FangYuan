import Key from "../i18nKey";
import type { Translation } from "../translation";

export const ja: Translation = {
	[Key.home]: "Home",
	[Key.about]: "About",
	[Key.archive]: "Archive",
	[Key.search]: "検索",

	[Key.tags]: "タグ",
	[Key.categories]: "カテゴリ",
	[Key.recentPosts]: "最近の投稿",

	[Key.comments]: "コメント",
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

	[Key.untitled]: "タイトルなし",
	[Key.uncategorized]: "カテゴリなし",
	[Key.noTags]: "タグなし",

	[Key.wordCount]: "文字",
	[Key.wordsCount]: "文字",
	[Key.minuteCount]: "分",
	[Key.minutesCount]: "分",
	[Key.postCount]: "件の投稿",
	[Key.postsCount]: "件の投稿",

	[Key.themeColor]: "テーマカラー",

	[Key.lightMode]: "ライト",
	[Key.darkMode]: "ダーク",
	[Key.systemMode]: "システム",

	[Key.more]: "もっと",

	[Key.author]: "作者",
	[Key.publishedAt]: "公開日",
	[Key.license]: "ライセンス",
};
