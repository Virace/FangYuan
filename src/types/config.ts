import type { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants";
import type { RewardOption } from "@utils/page-feedback/provider";
import type { ImageMetadata } from "astro";

export type TrailingSlashStrategy = "auto" | "always" | "never";
export type AliasValidationMode = "error" | "normalize";
export type UpdatedDateMode = "manual" | "git" | "filesystem" | "none";
export type UpdatedDateFallback = "none" | "filesystem";

export type PostPatternRule = {
	match: string;
	pattern: string;
};

export type PostSortKey =
	| "title"
	| "published"
	| "updated"
	| "alias"
	| "filename";

export type SortOrder = "asc" | "desc";

export type PostSortConfig = {
	key: PostSortKey;
	order: SortOrder;
};

export type PermalinkConfig = {
	postsPattern: string;
	pagesPattern: string;
	trailingSlash: TrailingSlashStrategy;
	postPatternRules: PostPatternRule[];
	aliasValidation: AliasValidationMode;
	updatedDateMode: UpdatedDateMode;
	updatedDateFallback: UpdatedDateFallback;
};

export type SiteConfig = {
	title: string;
	subtitle: string;
	site: string | null;
	base: string;
	postsPerPage?: number | null;
	postSort: PostSortConfig;
	showPinnedInArchiveTimeline: boolean;

	lang:
		| "en"
		| "zh_CN"
		| "zh_TW"
		| "ja"
		| "ko"
		| "es"
		| "th"
		| "vi"
		| "tr"
		| "id";

	themeColor: {
		hue: number;
		fixed: boolean;
	};
	banner: {
		enable: boolean;
		src: string;
		position?: "top" | "center" | "bottom";
		credit: {
			enable: boolean;
			text: string;
			url?: string;
		};
	};
	toc: {
		enable: boolean;
		depth: 1 | 2 | 3;
	};

	favicon: Favicon[];
	permalink: PermalinkConfig;
};

export type Favicon = {
	src: string;
	theme?: "light" | "dark";
	sizes?: string;
};

export type NavBarContentRef = {
	collection: "spec" | "posts";
	id: string;
};

export type NavBarLinkBase = {
	id?: string;
	name: string;
};

export type NavBarUrlLink = NavBarLinkBase & {
	url: string;
	external?: boolean;
	ref?: never;
};

export type NavBarRefLink = NavBarLinkBase & {
	ref: NavBarContentRef;
	url?: never;
	external?: never;
};

export type NavBarLink = NavBarUrlLink | NavBarRefLink;

export type NavBarI18nConfig = Record<string, string>;

export type ResolvedNavBarLink = {
	id: string;
	name: string;
	url: string;
	external: boolean;
};

export type NavBarConfig = {
	links: NavBarLink[];
};

export type FooterConfig = {
	customHtml?: string;
	icp?: string | null;
	policeRecord?: string | null;
};

export type ProfileConfig = {
	avatar?: string;
	name: string;
	bio?: string;
	links: {
		name: string;
		url: string;
		icon: string;
	}[];
};

export type LicenseConfig = {
	enable: boolean;
	name: string;
	url: string;
};

export type LIGHT_DARK_MODE =
	| typeof LIGHT_MODE
	| typeof DARK_MODE
	| typeof AUTO_MODE;

export type BlogPostData = {
	body: string;
	title: string;
	published: Date;
	description: string;
	tags: string[];
	draft?: boolean;
	image?: string | ImageMetadata;
	category?: string;
	sticky?: number;
	prevTitle?: string;
	prevSlug?: string;
	nextTitle?: string;
	nextSlug?: string;
	prevPermalink?: string;
	nextPermalink?: string;
};

export type ExpressiveCodeConfig = {
	theme: string;
};

export type QingYanClientConfig = {
	siteKey: string;
	apiBase?: string;
};

export type CommentConfig = {
	enable: boolean;
	qingyan?: QingYanClientConfig | null;
	rootLimit?: number;
	maxDepth?: number;
};

export type PageMetricsConfig = {
	enable: boolean;
	qingyan?: QingYanClientConfig | null;
};

export type PageFeedbackConfig = {
	enable: boolean;
	qingyan?: QingYanClientConfig | null;
	rewardOptions?: RewardOption[];
};
