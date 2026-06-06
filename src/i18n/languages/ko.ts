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
	[Key.pinned]: "고정",
	[Key.pinnedPosts]: "고정된 글",

	[Key.comments]: "댓글",
	[Key.commentsLoading]: "댓글 불러오는 중...",
	[Key.commentsEmpty]: "아직 댓글이 없습니다. 첫 댓글을 남겨보세요.",
	[Key.commentsDisabled]: "현재 댓글을 사용할 수 없습니다.",
	[Key.commentsLoadFailed]: "댓글을 불러오지 못했습니다.",
	[Key.commentsSubmit]: "댓글 작성",
	[Key.commentsSubmitting]: "등록 중...",
	[Key.commentsSubmitFailed]:
		"댓글을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.",
	[Key.commentsSubmitSuccess]: "댓글이 등록되었습니다.",
	[Key.commentsReply]: "답글",
	[Key.commentsReplying]: "이 댓글에 답글을 작성하는 중입니다.",
	[Key.commentsReplyingTo]: "{author}님의 댓글에 답글을 작성하는 중입니다",
	[Key.commentsCancelReply]: "답글 취소",
	[Key.commentsEmoji]: "이모지",
	[Key.commentsCaptcha]: "인증 코드",
	[Key.commentsCaptchaRefresh]: "인증 코드 새로고침",
	[Key.commentsCaptchaVerify]: "인증 코드 확인",
	[Key.commentsCaptchaCancel]: "인증 취소",
	[Key.commentsCaptchaVerified]:
		"인증 코드가 확인되었습니다. 댓글이나 투표를 계속할 수 있습니다.",
	[Key.commentsCaptchaRequiredTip]:
		"계속하기 전에 여기에서 필요한 인증을 완료해 주세요.",
	[Key.commentsCaptchaUnsupported]:
		"현재 인증 코드 유형은 이 프런트엔드에서 아직 지원되지 않습니다.",
	[Key.commentsCaptchaVerifyFailed]:
		"인증 코드 확인에 실패했습니다. 다시 시도해 주세요.",
	[Key.commentsVoteUp]: "추천",
	[Key.commentsVoteDown]: "비추천",
	[Key.commentsVoteFailed]:
		"투표를 전송하지 못했습니다. 잠시 후 다시 시도해 주세요.",
	[Key.commentsVoteConfirmTipUp]:
		"이 추천을 확정하시겠습니까? 이후에는 변경할 수 없습니다.",
	[Key.commentsVoteConfirmTipDown]:
		"이 비추천을 확정하시겠습니까? 이후에는 변경할 수 없습니다.",
	[Key.commentsVoteConfirmProceed]: "확인",
	[Key.commentsVoteConfirmCancel]: "취소",
	[Key.commentsSortNewest]: "최신순",
	[Key.commentsSortOldest]: "오래된순",
	[Key.commentsPaginationPrevious]: "이전",
	[Key.commentsPaginationNext]: "다음",
	[Key.commentsPaginationStatus]: "페이지",
	[Key.commentsModerationNotice]: "검토 대기 중",
	[Key.commentsFormName]: "이름",
	[Key.commentsFormEmail]: "이메일",
	[Key.commentsFormWebsite]: "웹사이트",
	[Key.commentsFormOptionalSuffix]: " (선택)",
	[Key.commentsRememberProfile]: "저장하기",
	[Key.commentsNotifyOnReply]: "답글 알림",
	[Key.commentsFormContent]: "댓글",
	[Key.commentCountSingular]: "댓글",
	[Key.commentCountPlural]: "댓글",
	[Key.commentsValidationNameRequired]: "이름을 입력해 주세요.",
	[Key.commentsValidationEmailInvalid]: "올바른 이메일 주소를 입력해 주세요.",
	[Key.commentsValidationContentRequired]: "댓글 내용을 입력해 주세요.",
	[Key.commentsValidationCaptchaRequired]: "인증 코드를 입력해 주세요.",
	[Key.commentsValidationContentUnsafe]:
		"댓글에 의심스러운 내용이 포함되어 있습니다. 수정한 뒤 다시 시도해 주세요.",
	[Key.commentsValidationWebsiteInvalid]:
		"올바른 웹사이트 URL을 입력해 주세요.",

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
	[Key.pageFeedbackLike]: "좋아요",
	[Key.pageFeedbackLiked]: "좋아요 완료",
	[Key.pageFeedbackLikeFailed]:
		"좋아요를 전송하지 못했습니다. 잠시 후 다시 시도해 주세요.",
	[Key.pageFeedbackReward]: "작성자에게 커피 사주기",
	[Key.pageFeedbackRewardTitle]: "이 글 후원하기",
	[Key.pageFeedbackRewardDescription]:
		"이 글이 도움이 되었다면 아래 방법으로 작성자를 후원할 수 있습니다.",
	[Key.pageFeedbackClose]: "닫기",
	[Key.license]: "라이선스",
};
