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
	[Key.commentsLoading]: "Memuat komentar...",
	[Key.commentsEmpty]: "Belum ada komentar. Jadilah yang pertama berkomentar.",
	[Key.commentsDisabled]: "Komentar saat ini tidak tersedia.",
	[Key.commentsLoadFailed]: "Gagal memuat komentar.",
	[Key.commentsSubmit]: "Kirim komentar",
	[Key.commentsSubmitting]: "Mengirim...",
	[Key.commentsSubmitFailed]:
		"Gagal mengirim komentar. Silakan coba lagi nanti.",
	[Key.commentsSubmitSuccess]: "Komentar berhasil dikirim.",
	[Key.commentsReply]: "Balas",
	[Key.commentsReplying]: "Sedang membalas komentar ini.",
	[Key.commentsCancelReply]: "Batalkan balasan",
	[Key.commentsEmoji]: "Emoji",
	[Key.commentsCaptcha]: "Captcha",
	[Key.commentsCaptchaRefresh]: "Muat ulang captcha",
	[Key.commentsCaptchaVerify]: "Verifikasi captcha",
	[Key.commentsCaptchaCancel]: "Batalkan verifikasi",
	[Key.commentsCaptchaVerified]:
		"Captcha terverifikasi. Anda dapat melanjutkan komentar atau voting.",
	[Key.commentsCaptchaRequiredTip]:
		"Selesaikan verifikasi yang diperlukan di sini sebelum melanjutkan.",
	[Key.commentsCaptchaUnsupported]:
		"Jenis captcha saat ini belum didukung oleh frontend ini.",
	[Key.commentsCaptchaVerifyFailed]:
		"Verifikasi captcha gagal. Silakan coba lagi.",
	[Key.commentsVoteUp]: "Suka",
	[Key.commentsVoteDown]: "Tidak suka",
	[Key.commentsVoteFailed]: "Gagal mengirim vote. Silakan coba lagi nanti.",
	[Key.commentsVoteConfirmTipUp]:
		"Confirm this upvote? You will not be able to change it later.",
	[Key.commentsVoteConfirmTipDown]:
		"Confirm this downvote? You will not be able to change it later.",
	[Key.commentsVoteConfirmProceed]: "Confirm",
	[Key.commentsVoteConfirmCancel]: "Cancel",
	[Key.commentsSortNewest]: "Terbaru dulu",
	[Key.commentsSortOldest]: "Terlama dulu",
	[Key.commentsPaginationPrevious]: "Sebelumnya",
	[Key.commentsPaginationNext]: "Berikutnya",
	[Key.commentsPaginationStatus]: "Halaman",
	[Key.commentsModerationNotice]: "Menunggu moderasi",
	[Key.commentsFormName]: "Nama",
	[Key.commentsFormEmail]: "Email",
	[Key.commentsFormWebsite]: "Situs web",
	[Key.commentsFormOptionalSuffix]: " (opsional)",
	[Key.commentsFormContent]: "Komentar",
	[Key.commentsPreviewWriteNotice]:
		"Penyedia pratinjau: komentar yang dikirim hanya ada di sesi browser saat ini.",
	[Key.commentCountSingular]: "komentar",
	[Key.commentCountPlural]: "komentar",
	[Key.commentsValidationNameRequired]: "Masukkan nama panggilan.",
	[Key.commentsValidationEmailInvalid]: "Masukkan alamat email yang valid.",
	[Key.commentsValidationContentRequired]: "Isi komentar tidak boleh kosong.",
	[Key.commentsValidationCaptchaRequired]: "Masukkan kode captcha.",
	[Key.commentsValidationContentUnsafe]:
		"Komentar mengandung konten mencurigakan. Silakan perbaiki terlebih dahulu.",
	[Key.commentsValidationWebsiteInvalid]: "Masukkan URL situs web yang valid.",

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
	[Key.pageViews]: "Dilihat",
	[Key.pageFeedbackLike]: "Like",
	[Key.pageFeedbackLiked]: "Liked",
	[Key.pageFeedbackLikeFailed]:
		"Failed to submit the like. Please try again later.",
	[Key.pageFeedbackReward]: "Buy the author a coffee",
	[Key.pageFeedbackRewardTitle]: "Support this post",
	[Key.pageFeedbackRewardDescription]:
		"If this post helped you, you can support the author through the channels below.",
	[Key.pageFeedbackClose]: "Close",
	[Key.license]: "Lisensi",
};
