import Key from "../i18nKey";
import type { Translation } from "../translation";

export const tr: Translation = {
	[Key.home]: "Anasayfa",
	[Key.about]: "Hakkında",
	[Key.archive]: "Arşiv",
	[Key.search]: "Ara",

	[Key.tags]: "Taglar",
	[Key.categories]: "Katagoriler",
	[Key.recentPosts]: "Son Paylaşımlar",
	[Key.pinned]: "TOP",
	[Key.pinnedPosts]: "Pinned",

	[Key.comments]: "Yorumlar",
	[Key.commentsLoading]: "Yorumlar yükleniyor...",
	[Key.commentsEmpty]: "Henüz yorum yok. İlk yorumu sen yap.",
	[Key.commentsDisabled]: "Yorumlar şu anda kullanılamıyor.",
	[Key.commentsLoadFailed]: "Yorumlar yüklenemedi.",
	[Key.commentsSubmit]: "Yorum gönder",
	[Key.commentsSubmitting]: "Gönderiliyor...",
	[Key.commentsSubmitFailed]:
		"Yorum gönderilemedi. Lütfen daha sonra tekrar deneyin.",
	[Key.commentsSubmitSuccess]: "Yorum başarıyla gönderildi.",
	[Key.commentsReply]: "Yanıtla",
	[Key.commentsReplying]: "Bu yoruma yanıt yazılıyor.",
	[Key.commentsCancelReply]: "Yanıtı iptal et",
	[Key.commentsEmoji]: "Emoji",
	[Key.commentsCaptcha]: "Doğrulama kodu",
	[Key.commentsCaptchaRefresh]: "Doğrulama kodunu yenile",
	[Key.commentsCaptchaVerify]: "Doğrula",
	[Key.commentsCaptchaCancel]: "Doğrulamayı iptal et",
	[Key.commentsCaptchaVerified]:
		"Doğrulama tamamlandı. Yorum yapmaya veya oy vermeye devam edebilirsiniz.",
	[Key.commentsCaptchaRequiredTip]:
		"Devam etmeden önce gerekli doğrulamayı burada tamamlayın.",
	[Key.commentsCaptchaUnsupported]:
		"Mevcut captcha türü bu arayüzde henüz desteklenmiyor.",
	[Key.commentsCaptchaVerifyFailed]:
		"Captcha doğrulaması başarısız oldu. Lütfen tekrar deneyin.",
	[Key.commentsVoteUp]: "Olumlu oy",
	[Key.commentsVoteDown]: "Olumsuz oy",
	[Key.commentsVoteFailed]:
		"Oy gönderilemedi. Lütfen daha sonra tekrar deneyin.",
	[Key.commentsVoteConfirmTipUp]:
		"Confirm this upvote? You will not be able to change it later.",
	[Key.commentsVoteConfirmTipDown]:
		"Confirm this downvote? You will not be able to change it later.",
	[Key.commentsVoteConfirmProceed]: "Confirm",
	[Key.commentsVoteConfirmCancel]: "Cancel",
	[Key.commentsSortNewest]: "En yeni önce",
	[Key.commentsSortOldest]: "En eski önce",
	[Key.commentsPaginationPrevious]: "Önceki",
	[Key.commentsPaginationNext]: "Sonraki",
	[Key.commentsPaginationStatus]: "Sayfa",
	[Key.commentsModerationNotice]: "Onay bekliyor",
	[Key.commentsFormName]: "Ad",
	[Key.commentsFormEmail]: "E-posta",
	[Key.commentsFormWebsite]: "Web sitesi",
	[Key.commentsFormOptionalSuffix]: " (isteğe bağlı)",
	[Key.commentsFormContent]: "Yorum",
	[Key.commentCountSingular]: "yorum",
	[Key.commentCountPlural]: "yorum",
	[Key.commentsValidationNameRequired]: "Lütfen bir ad girin.",
	[Key.commentsValidationEmailInvalid]:
		"Lütfen geçerli bir e-posta adresi girin.",
	[Key.commentsValidationContentRequired]: "Yorum içeriği boş olamaz.",
	[Key.commentsValidationCaptchaRequired]: "Lütfen captcha kodunu girin.",
	[Key.commentsValidationContentUnsafe]:
		"Yorum şüpheli içerik içeriyor. Lütfen düzenleyip tekrar deneyin.",
	[Key.commentsValidationWebsiteInvalid]:
		"Lütfen geçerli bir web sitesi URL’si girin.",

	[Key.untitled]: "Başlıksız",
	[Key.uncategorized]: "Katagorisiz",
	[Key.noTags]: "Tag Bulunamadı",

	[Key.wordCount]: "kelime",
	[Key.wordsCount]: "kelime",
	[Key.minuteCount]: "dakika",
	[Key.minutesCount]: "dakika",
	[Key.postCount]: "gönderi",
	[Key.postsCount]: "gönderiler",

	[Key.themeColor]: "Tema Rengi",

	[Key.lightMode]: "Aydınlık",
	[Key.darkMode]: "Koyu",
	[Key.systemMode]: "Sistem",

	[Key.more]: "Daha Fazla",

	[Key.author]: "Yazar",
	[Key.publishedAt]: "Yayınlanma:",
	[Key.pageViews]: "Görüntülenme",
	[Key.pageFeedbackLike]: "Like",
	[Key.pageFeedbackLiked]: "Liked",
	[Key.pageFeedbackLikeFailed]:
		"Failed to submit the like. Please try again later.",
	[Key.pageFeedbackReward]: "Buy the author a coffee",
	[Key.pageFeedbackRewardTitle]: "Support this post",
	[Key.pageFeedbackRewardDescription]:
		"If this post helped you, you can support the author through the channels below.",
	[Key.pageFeedbackClose]: "Close",
	[Key.license]: "Lisans",
};
