import I18nKey from "../i18n/i18nKey.ts";
import type { NavBarLink } from "../types/config.ts";

type LinkPresetMap = {
	Home: NavBarLink;
	Archive: NavBarLink;
	About: NavBarLink;
};

export const LinkPresets: LinkPresetMap = {
	Home: {
		id: "home",
		name: I18nKey.home,
		url: "/",
	},
	Archive: {
		id: "archive",
		name: I18nKey.archive,
		url: "/archive/",
	},
	About: {
		id: "about",
		name: I18nKey.about,
		ref: {
			collection: "spec",
			id: "about",
		},
	},
};
