export const currentSiteConfigVersion = 1;

function cloneConfig(config) {
	return structuredClone(config ?? {});
}

function getConfigVersion(config) {
	const version = config?.fangyuanConfigVersion;
	return Number.isInteger(version) ? version : 0;
}

function hasOwn(object, key) {
	return Object.prototype.hasOwnProperty.call(object, key);
}

function valuesEqual(left, right) {
	return JSON.stringify(left) === JSON.stringify(right);
}

function createAction(path, action, reason) {
	return {
		file: "site.config.yaml",
		path,
		action,
		status: "planned",
		...(reason ? { reason } : {}),
	};
}

function createManualAction(path, reason) {
	return {
		file: "site.config.yaml",
		path,
		reason,
	};
}

function ensureCurrentDefaults(config, actions) {
	config.siteConfig ??= {};

	if (!hasOwn(config.siteConfig, "showPinnedInArchiveTimeline")) {
		config.siteConfig.showPinnedInArchiveTimeline = true;
		actions.push(
			createAction(
				"siteConfig.showPinnedInArchiveTimeline",
				"add",
				"add current default without changing runtime behavior",
			),
		);
	}

	if (!hasOwn(config.siteConfig, "postSort")) {
		config.siteConfig.postSort = {
			key: "published",
			order: "desc",
		};
		actions.push(
			createAction(
				"siteConfig.postSort",
				"add",
				"add current default without changing runtime behavior",
			),
		);
		return;
	}

	if (!hasOwn(config.siteConfig.postSort, "key")) {
		config.siteConfig.postSort.key = "published";
		actions.push(createAction("siteConfig.postSort.key", "add"));
	}

	if (!hasOwn(config.siteConfig.postSort, "order")) {
		config.siteConfig.postSort.order = "desc";
		actions.push(createAction("siteConfig.postSort.order", "add"));
	}
}

function findRewardConflict(config) {
	const pageFeedbackConfig = config.pageFeedbackConfig;
	if (!pageFeedbackConfig || !hasOwn(pageFeedbackConfig, "rewardOptions")) {
		return null;
	}

	const legacyOptions = pageFeedbackConfig.rewardOptions;
	const hasNewOptions =
		pageFeedbackConfig.reward &&
		typeof pageFeedbackConfig.reward === "object" &&
		hasOwn(pageFeedbackConfig.reward, "options");

	if (hasNewOptions && !valuesEqual(legacyOptions, pageFeedbackConfig.reward.options)) {
		return createManualAction(
			"pageFeedbackConfig.rewardOptions",
			"old and new reward config coexist; choose one before migration",
		);
	}

	return null;
}

function migrateRewardOptions(config, actions) {
	const pageFeedbackConfig = config.pageFeedbackConfig;
	if (!pageFeedbackConfig || !hasOwn(pageFeedbackConfig, "rewardOptions")) {
		return;
	}

	pageFeedbackConfig.reward ??= {};
	if (!hasOwn(pageFeedbackConfig.reward, "options")) {
		pageFeedbackConfig.reward.options = pageFeedbackConfig.rewardOptions;
		actions.push(
			createAction(
				"pageFeedbackConfig.rewardOptions -> pageFeedbackConfig.reward.options",
				"move",
			),
		);
	}

	delete pageFeedbackConfig.rewardOptions;
	actions.push(createAction("pageFeedbackConfig.rewardOptions", "remove"));
}

function migrateFromZero(config) {
	const conflict = findRewardConflict(config);
	if (conflict) {
		return {
			config,
			changed: false,
			actions: [],
			manualActions: [conflict],
		};
	}

	const nextConfig = cloneConfig(config);
	const actions = [];

	migrateRewardOptions(nextConfig, actions);
	ensureCurrentDefaults(nextConfig, actions);

	nextConfig.fangyuanConfigVersion = currentSiteConfigVersion;
	actions.push(createAction("fangyuanConfigVersion", "add"));

	return {
		config: nextConfig,
		changed: true,
		actions,
		manualActions: [],
	};
}

export function migrateSiteConfigObject(config, options = {}) {
	const fromVersion = getConfigVersion(config);

	if (fromVersion > currentSiteConfigVersion) {
		return {
			config: cloneConfig(config),
			changed: false,
			fromVersion,
			toVersion: currentSiteConfigVersion,
			actions: [],
			manualActions: [
				createManualAction(
					"fangyuanConfigVersion",
					`config version ${fromVersion} is newer than this updater supports`,
				),
			],
		};
	}

	if (fromVersion === currentSiteConfigVersion) {
		return {
			config: cloneConfig(config),
			changed: false,
			fromVersion,
			toVersion: currentSiteConfigVersion,
			actions: [],
			manualActions: [],
		};
	}

	const migration = migrateFromZero(cloneConfig(config));
	return {
		...migration,
		fromVersion,
		toVersion: currentSiteConfigVersion,
	};
}
