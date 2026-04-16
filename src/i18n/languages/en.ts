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
	[Key.commentsSubmitFailed]:
		"Failed to submit the comment. Please try again later.",
	[Key.commentsSubmitSuccess]: "Comment submitted successfully.",
	[Key.commentsReply]: "Reply",
	[Key.commentsReplying]: "Replying to this comment.",
	[Key.commentsCancelReply]: "Cancel reply",
	[Key.commentsEmoji]: "Emoji",
	[Key.commentsCaptcha]: "Captcha",
	[Key.commentsCaptchaRefresh]: "Refresh captcha",
	[Key.commentsCaptchaVerify]: "Verify captcha",
	[Key.commentsCaptchaVerified]:
		"Captcha verified. You can continue commenting or voting.",
	[Key.commentsCaptchaRequiredTip]:
		"Artalk now requires captcha verification. Please complete it here before commenting or voting again.",
	[Key.commentsCaptchaUnsupported]:
		"The current captcha type is not supported by this frontend yet.",
	[Key.commentsCaptchaVerifyFailed]:
		"Captcha verification failed. Please try again.",
	[Key.commentsVoteUp]: "Upvote",
	[Key.commentsVoteDown]: "Downvote",
	[Key.commentsVoteFailed]:
		"Failed to submit the vote. Please try again later.",
	[Key.commentsVoteConfirmTipUp]:
		"Confirm this upvote? You will not be able to change it later.",
	[Key.commentsVoteConfirmTipDown]:
		"Confirm this downvote? You will not be able to change it later.",
	[Key.commentsVoteConfirmProceed]: "Confirm",
	[Key.commentsVoteConfirmCancel]: "Cancel",
	[Key.commentsSortNewest]: "Newest first",
	[Key.commentsSortOldest]: "Oldest first",
	[Key.commentsPaginationPrevious]: "Previous",
	[Key.commentsPaginationNext]: "Next",
	[Key.commentsPaginationStatus]: "Page",
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
	[Key.commentsValidationCaptchaRequired]: "Please enter the captcha code.",
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
	[Key.pageViews]: "Views",
	[Key.pageFeedbackLike]: "Like",
	[Key.pageFeedbackLiked]: "Liked",
	[Key.pageFeedbackLikeFailed]:
		"Failed to submit the like. Please try again later.",
	[Key.pageFeedbackReward]: "Buy the author a coffee",
	[Key.pageFeedbackRewardTitle]: "Support this post",
	[Key.pageFeedbackRewardDescription]:
		"If this post helped you, you can support the author through the channels below.",
	[Key.pageFeedbackClose]: "Close",
	[Key.license]: "License",
};
