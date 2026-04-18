import type { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants";
import type { RewardOption } from "@utils/page-feedback/provider";
import type { ImageMetadata } from "astro";

export type SiteConfig = {
	title: string;
	subtitle: string;
	postsPerPage?: number | null;

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
	themeRadius: ThemeRadiusConfig;
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
};

export type ThemeRadiusConfig = {
	level: 0 | 1 | 2 | 3 | 4 | 5 | 6;
	fixed: boolean;
};

export type Favicon = {
	src: string;
	theme?: "light" | "dark";
	sizes?: string;
};

export enum LinkPreset {
	Home = 0,
	Archive = 1,
	About = 2,
}

export type NavBarLink = {
	name: string;
	url: string;
	external?: boolean;
};

export type NavBarConfig = {
	links: (NavBarLink | LinkPreset)[];
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
	prevTitle?: string;
	prevSlug?: string;
	nextTitle?: string;
	nextSlug?: string;
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
