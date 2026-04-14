import Key from "../i18nKey";
import type { Translation } from "../translation";

export const en: Translation = {
	[Key.home]: "Home",
	[Key.about]: "About",
	[Key.archive]: "Archive",
	[Key.search]: "Search",

	[Key.tags]: "Tags",
	[Key.categories]: "Categories",
	[Key.recentPosts]: "Recent Posts",

	[Key.comments]: "Comments",
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

	[Key.untitled]: "Untitled",
	[Key.uncategorized]: "Uncategorized",
	[Key.noTags]: "No Tags",

	[Key.wordCount]: "word",
	[Key.wordsCount]: "words",
	[Key.minuteCount]: "minute",
	[Key.minutesCount]: "minutes",
	[Key.postCount]: "post",
	[Key.postsCount]: "posts",

	[Key.themeColor]: "Theme Color",

	[Key.lightMode]: "Light",
	[Key.darkMode]: "Dark",
	[Key.systemMode]: "System",

	[Key.more]: "More",

	[Key.author]: "Author",
	[Key.publishedAt]: "Published at",
	[Key.license]: "License",
};
