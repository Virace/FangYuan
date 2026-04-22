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
	[Key.pinned]: "TOP",
	[Key.pinnedPosts]: "Pinned",

	[Key.comments]: "コメント",
	[Key.commentsLoading]: "コメントを読み込み中...",
	[Key.commentsEmpty]: "まだコメントはありません。最初のコメントをどうぞ。",
	[Key.commentsDisabled]: "現在コメントは利用できません。",
	[Key.commentsLoadFailed]: "コメントの読み込みに失敗しました。",
	[Key.commentsSubmit]: "コメントを投稿",
	[Key.commentsSubmitting]: "投稿中...",
	[Key.commentsSubmitFailed]:
		"コメントの送信に失敗しました。後でもう一度お試しください。",
	[Key.commentsSubmitSuccess]: "コメントを送信しました。",
	[Key.commentsReply]: "返信",
	[Key.commentsReplying]: "このコメントに返信しています。",
	[Key.commentsCancelReply]: "返信をキャンセル",
	[Key.commentsEmoji]: "絵文字",
	[Key.commentsCaptcha]: "認証コード",
	[Key.commentsCaptchaRefresh]: "認証コードを更新",
	[Key.commentsCaptchaVerify]: "認証コードを確認",
	[Key.commentsCaptchaCancel]: "認証をキャンセル",
	[Key.commentsCaptchaVerified]:
		"認証コードを確認しました。コメントや投票を続けられます。",
	[Key.commentsCaptchaRequiredTip]:
		"続行する前に、ここで必要な認証を完了してください。",
	[Key.commentsCaptchaUnsupported]:
		"現在の認証コード形式はこのフロントエンドでは未対応です。",
	[Key.commentsCaptchaVerifyFailed]:
		"認証コードの確認に失敗しました。もう一度お試しください。",
	[Key.commentsVoteUp]: "高評価",
	[Key.commentsVoteDown]: "低評価",
	[Key.commentsVoteFailed]:
		"投票の送信に失敗しました。後でもう一度お試しください。",
	[Key.commentsVoteConfirmTipUp]:
		"Confirm this upvote? You will not be able to change it later.",
	[Key.commentsVoteConfirmTipDown]:
		"Confirm this downvote? You will not be able to change it later.",
	[Key.commentsVoteConfirmProceed]: "Confirm",
	[Key.commentsVoteConfirmCancel]: "Cancel",
	[Key.commentsSortNewest]: "新しい順",
	[Key.commentsSortOldest]: "古い順",
	[Key.commentsPaginationPrevious]: "前へ",
	[Key.commentsPaginationNext]: "次へ",
	[Key.commentsPaginationStatus]: "ページ",
	[Key.commentsModerationNotice]: "承認待ち",
	[Key.commentsFormName]: "名前",
	[Key.commentsFormEmail]: "メールアドレス",
	[Key.commentsFormWebsite]: "ウェブサイト",
	[Key.commentsFormOptionalSuffix]: "（任意）",
	[Key.commentsFormContent]: "コメント",
	[Key.commentCountSingular]: "件のコメント",
	[Key.commentCountPlural]: "件のコメント",
	[Key.commentsValidationNameRequired]: "名前を入力してください。",
	[Key.commentsValidationEmailInvalid]:
		"有効なメールアドレスを入力してください。",
	[Key.commentsValidationContentRequired]: "コメント内容を入力してください。",
	[Key.commentsValidationCaptchaRequired]: "認証コードを入力してください。",
	[Key.commentsValidationContentUnsafe]:
		"コメントに不審な内容が含まれています。修正してから送信してください。",
	[Key.commentsValidationWebsiteInvalid]:
		"有効なウェブサイト URL を入力してください。",

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
	[Key.pageViews]: "閲覧数",
	[Key.pageFeedbackLike]: "Like",
	[Key.pageFeedbackLiked]: "Liked",
	[Key.pageFeedbackLikeFailed]:
		"Failed to submit the like. Please try again later.",
	[Key.pageFeedbackReward]: "Buy the author a coffee",
	[Key.pageFeedbackRewardTitle]: "Support this post",
	[Key.pageFeedbackRewardDescription]:
		"If this post helped you, you can support the author through the channels below.",
	[Key.pageFeedbackClose]: "Close",
	[Key.license]: "ライセンス",
};
