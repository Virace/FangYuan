function shouldNormalizeQingYanApiPath(pathname) {
	return (
		pathname.startsWith("/api/") &&
		pathname !== "/api/" &&
		!pathname.endsWith("/")
	);
}

function appendTrailingSlash(requestPath) {
	const url = new URL(requestPath, "http://localhost");
	if (shouldNormalizeQingYanApiPath(url.pathname)) {
		url.pathname = `${url.pathname}/`;
	}
	return `${url.pathname}${url.search}`;
}

export function normalizeQingYanDevProxyRequestPath(requestPath) {
	return appendTrailingSlash(requestPath);
}

export function normalizeQingYanDevProxyPath(requestPath) {
	const normalizedRequestPath = appendTrailingSlash(requestPath);
	const url = new URL(normalizedRequestPath, "http://localhost");
	if (url.pathname.startsWith("/api/") && url.pathname.endsWith("/")) {
		url.pathname = url.pathname.slice(0, -1);
	}
	return `${url.pathname}${url.search}`;
}
