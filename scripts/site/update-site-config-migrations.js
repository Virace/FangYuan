export const currentSiteConfigVersion = 3;

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
	}

	if (!hasOwn(config.siteConfig.postSort, "key")) {
		config.siteConfig.postSort.key = "published";
		actions.push(createAction("siteConfig.postSort.key", "add"));
	}

	if (!hasOwn(config.siteConfig.postSort, "order")) {
		config.siteConfig.postSort.order = "desc";
		actions.push(createAction("siteConfig.postSort.order", "add"));
	}

	const defaultTaxonomySort = {
		categories: {
			key: "name",
			order: "asc",
			uncategorizedPosition: "sorted",
		},
		tags: {
			key: "name",
			order: "asc",
		},
	};

	if (!hasOwn(config.siteConfig, "taxonomySort")) {
		config.siteConfig.taxonomySort = defaultTaxonomySort;
		actions.push(
			createAction(
				"siteConfig.taxonomySort",
				"add",
				"add current default without changing runtime behavior",
			),
		);
		return;
	}

	config.siteConfig.taxonomySort.categories ??= {};
	config.siteConfig.taxonomySort.tags ??= {};

	for (const [key, value] of Object.entries(defaultTaxonomySort.categories)) {
		if (!hasOwn(config.siteConfig.taxonomySort.categories, key)) {
			config.siteConfig.taxonomySort.categories[key] = value;
			actions.push(createAction(`siteConfig.taxonomySort.categories.${key}`, "add"));
		}
	}

	for (const [key, value] of Object.entries(defaultTaxonomySort.tags)) {
		if (!hasOwn(config.siteConfig.taxonomySort.tags, key)) {
			config.siteConfig.taxonomySort.tags[key] = value;
			actions.push(createAction(`siteConfig.taxonomySort.tags.${key}`, "add"));
		}
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

function getLegacyQingYanEntries(config) {
	return [
		["commentConfig.qingyan", config.commentConfig],
		["pageMetricsConfig.qingyan", config.pageMetricsConfig],
		["pageFeedbackConfig.qingyan", config.pageFeedbackConfig],
	]
		.filter(([, featureConfig]) => featureConfig && hasOwn(featureConfig, "qingyan"))
		.map(([path, featureConfig]) => ({
			path,
			value: featureConfig.qingyan,
		}));
}

function findQingYanConflict(config) {
	const entries = getLegacyQingYanEntries(config).filter(
		(entry) => entry.value !== null && entry.value !== undefined,
	);
	if (entries.length === 0) {
		return null;
	}

	const first = entries[0].value;
	if (entries.some((entry) => !valuesEqual(entry.value, first))) {
		return createManualAction(
			"qingyanConfig",
			"legacy QingYan configs differ; choose one shared qingyanConfig before migration",
		);
	}

	if (
		hasOwn(config, "qingyanConfig") &&
		config.qingyanConfig !== null &&
		!valuesEqual(config.qingyanConfig, first)
	) {
		return createManualAction(
			"qingyanConfig",
			"legacy QingYan config and qingyanConfig differ; choose one before migration",
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

function migrateQingYanConfig(config, actions) {
	const entries = getLegacyQingYanEntries(config);
	const shared = entries.find(
		(entry) => entry.value !== null && entry.value !== undefined,
	)?.value;

	if (shared && !hasOwn(config, "qingyanConfig")) {
		config.qingyanConfig = shared;
		actions.push(
			createAction(
				"commentConfig.qingyan/pageMetricsConfig.qingyan/pageFeedbackConfig.qingyan -> qingyanConfig",
				"move",
			),
		);
	}

	for (const entry of entries) {
		const [sectionName] = entry.path.split(".");
		delete config[sectionName].qingyan;
		actions.push(createAction(entry.path, "remove"));
	}
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
	const qingyanConflict = findQingYanConflict(nextConfig);
	if (qingyanConflict) {
		return {
			config,
			changed: false,
			actions: [],
			manualActions: [qingyanConflict],
		};
	}
	migrateQingYanConfig(nextConfig, actions);
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

function migrateFromOne(config) {
	const conflict = findQingYanConflict(config);
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

	migrateQingYanConfig(nextConfig, actions);
	ensureCurrentDefaults(nextConfig, actions);
	nextConfig.fangyuanConfigVersion = currentSiteConfigVersion;
	actions.push(createAction("fangyuanConfigVersion", "update"));

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

	const migration =
		fromVersion === 0
			? migrateFromZero(cloneConfig(config))
			: migrateFromOne(cloneConfig(config));
	return {
		...migration,
		fromVersion,
		toVersion: currentSiteConfigVersion,
	};
}
