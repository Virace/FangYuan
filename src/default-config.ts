import type {
	CommentConfig,
	ExpressiveCodeConfig,
	FooterConfig,
	LicenseConfig,
	NavBarConfig,
	PageFeedbackConfig,
	PageMetricsConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";
import {
	DEFAULT_COMMENT_MAX_DEPTH,
	DEFAULT_COMMENT_ROOT_LIMIT,
} from "./utils/comments/options";

export const defaultSiteConfig: SiteConfig = {
	title: "FangYuan",
	subtitle: "方圆",
	postsPerPage: null, // null / 0 表示使用内置默认分页大小；填数字则会应用你指定的每页文章数
	lang: "zh_CN", // 站点语言代码，例如 "en"、"zh_CN"、"zh_TW"、"ja"
	themeColor: {
		hue: 250, // 默认主题色 Hue，范围 0-360；例如 red=0、teal=200、cyan=250、pink=345
		fixed: false, // true 时隐藏前台主题色选择器，访客不能自行切换主色
	},
	banner: {
		enable: true,
		src: "assets/images/demo-banner.png", // 不以 "/" 开头时相对 src/ 或 site/；以 "/" 开头时相对 public/
		position: "center", // 等价于 object-position，只支持 "top" | "center" | "bottom"
		credit: {
			enable: true, // 是否显示横幅图片署名
			text: "credit 文本", // 署名文案
			url: "", // 可选，点击后跳到原作品或作者主页
		},
	},
	toc: {
		enable: true, // 是否在文章页右侧显示目录
		depth: 2, // 目录最大层级，只支持 1 | 2 | 3
	},
	favicon: [
		// 留空时使用默认 favicon
		// {
		//   src: "/favicon/icon.png",    // 相对 public/ 的路径
		//   theme: "light",              // 可选：light 或 dark；只有亮暗两套图标时才需要
		//   sizes: "32x32",              // 可选：用于区分不同尺寸图标
		// }
	],
	permalink: {
		// 文章公开链接模板。
		// 常见写法：
		// - "/%path%/%slug%"：按内容目录派生公开路径
		// - "/articles/%slug%.html"：生成 .html 风格公开路径
		// - "/%year%/%monthnum%/%day%/%postname%/"：兼容 WordPress 风格日期结构
		//
		// 可用 token：
		// - %slug% / %postname%：frontmatter.alias 或文件名归一化后的公开 slug
		// - %path%：文章在 posts 根目录下的相对目录
		// - %year% / %monthnum% / %day%：published 日期拆分
		// - %id%：内部 entry.id
		// - %type%：posts 或 spec
		postsPattern: "/%path%/%slug%",

		// spec 类页面（例如 about）的公开链接模板。
		// 一般保持 "/%slug%" 即可，例如 about -> /about/
		pagesPattern: "/%slug%",

		// 公开 URL 的斜杠策略：
		// - "auto"：普通路径补末尾斜杠，.html 保持无斜杠
		// - "always"：所有公开路径都补末尾斜杠
		// - "never"：所有公开路径都移除末尾斜杠
		trailingSlash: "auto",

		// 可按文章内部路径覆写全局 postsPattern。
		// 例如 { match: "wp/**", pattern: "/%year%/%monthnum%/%day%/%slug%.html" }
		postPatternRules: [],

		// alias/frontmatter.alias 含 "." 时的处理方式：
		// - "error"：直接报错，要求手工改成干净 slug
		// - "normalize"：自动把 "." 连续段替换成 "-"
		aliasValidation: "error",

		// 更新时间来源：
		// - "manual"：只认 frontmatter.updated
		// - "git"：读取 git 最后提交时间
		// - "filesystem"：读取文件最后修改时间
		// - "none"：不生成更新时间
		updatedDateMode: "manual",

		// 当 updatedDateMode 拿不到值时的 fallback：
		// - "none"：保持为空
		// - "filesystem"：回退到文件最后修改时间
		updatedDateFallback: "none",
	},
};

export const defaultNavBarConfig: NavBarConfig = {
	// About preset 不再写死 /about/。
	// 它会跟随 spec/about 当前解析出来的公开路径，例如 /about/ 或 /about.html。
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "GitHub",
			url: "https://github.com/Virace/FangYuan", // 站内链接不要手动带 base path；外链可直接写完整 URL
			external: true, // true 时显示外链图标，并在新标签页打开
		},
	],
};

export const defaultProfileConfig: ProfileConfig = {
	avatar: "assets/images/demo-avatar.png", // 不以 "/" 开头时相对 src/ 或 site/；以 "/" 开头时相对 public/
	name: "FangYuan",
	bio: "用于后续主题与内容演进的个人站点二开基线。",
	links: [
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/Virace/FangYuan",
		},
		{
			name: "Bilibili",
			icon: "fa6-brands:bilibili",
			url: "https://space.bilibili.com/12353537",
		},
	],
};

export const defaultFooterConfig: FooterConfig = {
	customHtml: "",
	icp: null,
	policeRecord: null,
};

export const defaultLicenseConfig: LicenseConfig = {
	enable: true,
	name: "MIT",
	url: "https://opensource.org/license/mit",
};

export const defaultExpressiveCodeConfig: ExpressiveCodeConfig = {
	// 注意：部分样式（例如背景色）会在 astro.config.mjs 中继续覆写
	// 当前主题仍以深色代码块为主，因此这里建议选择 dark theme
	theme: "github-dark",
};

export const defaultCommentConfig: CommentConfig = {
	enable: true,
	qingyan: null,
	rootLimit: DEFAULT_COMMENT_ROOT_LIMIT,
	maxDepth: DEFAULT_COMMENT_MAX_DEPTH,
};

export const defaultPageMetricsConfig: PageMetricsConfig = {
	enable: false,
	qingyan: null,
};

export const defaultPageFeedbackConfig: PageFeedbackConfig = {
	enable: false,
	qingyan: null,
	rewardOptions: [],
};
