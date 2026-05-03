import path from "node:path";

export function resolveExternalSiteWatchPaths(siteRoot) {
	return [
		path.join(siteRoot, "site.config.yaml"),
		path.join(siteRoot, "content"),
		path.join(siteRoot, "assets"),
	];
}

export function isInsideExternalSiteRoot(siteRoot, changedPath) {
	const relativePath = path.relative(siteRoot, path.resolve(changedPath));
	return (
		relativePath === "" ||
		(!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
	);
}

function isExternalSiteConfig(siteRoot, changedPath) {
	return path.resolve(changedPath) === path.join(siteRoot, "site.config.yaml");
}

function reloadServer(server) {
	if (server.environments) {
		for (const environment of Object.values(server.environments)) {
			environment.moduleGraph.invalidateAll();
		}
		server.environments.client?.hot.send({ type: "full-reload", path: "*" });
		return;
	}

	server.moduleGraph?.invalidateAll();
	server.ws?.send({ type: "full-reload", path: "*" });
}

export function registerExternalSiteDevWatch({ server, siteRoot, enabled }) {
	if (!enabled) {
		return;
	}

	server.watcher.add(resolveExternalSiteWatchPaths(siteRoot));
	server.watcher.on("all", (_eventName, changedPath) => {
		if (!isInsideExternalSiteRoot(siteRoot, changedPath)) {
			return;
		}

		if (isExternalSiteConfig(siteRoot, changedPath) && server.restart) {
			server.restart();
			return;
		}

		reloadServer(server);
	});
}
