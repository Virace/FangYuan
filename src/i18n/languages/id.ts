import Key from "../i18nKey";
import type { Translation } from "../translation";

export const id: Translation = {
	[Key.home]: "Beranda",
	[Key.about]: "Tentang",
	[Key.archive]: "Arsip",
	[Key.search]: "Cari",

	[Key.tags]: "Tag",
	[Key.categories]: "Kategori",
	[Key.recentPosts]: "Postingan Terbaru",

	[Key.comments]: "Komentar",
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

	[Key.untitled]: "Tanpa Judul",
	[Key.uncategorized]: "Tanpa Kategori",
	[Key.noTags]: "Tanpa Tag",

	[Key.wordCount]: "kata",
	[Key.wordsCount]: "kata",
	[Key.minuteCount]: "menit",
	[Key.minutesCount]: "menit",
	[Key.postCount]: "postingan",
	[Key.postsCount]: "postingan",

	[Key.themeColor]: "Warna Tema",

	[Key.lightMode]: "Terang",
	[Key.darkMode]: "Gelap",
	[Key.systemMode]: "Sistem",

	[Key.more]: "Lainnya",

	[Key.author]: "Penulis",
	[Key.publishedAt]: "Diterbitkan pada",
	[Key.license]: "Lisensi",
};
