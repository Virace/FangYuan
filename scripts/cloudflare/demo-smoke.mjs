export async function waitForHealthz(origin, child) {
	const deadline = Date.now() + 45_000;
	let lastError = null;
	while (Date.now() < deadline) {
		if (child.exitCode !== null) {
			throw new Error(`wrangler dev exited early with code ${child.exitCode}`);
		}
		try {
			const response = await fetch(`${origin}/healthz`);
			if (response.ok) {
				return;
			}
			lastError = new Error(`healthz returned ${response.status}`);
		} catch (error) {
			lastError = error;
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw lastError ?? new Error("Timed out waiting for wrangler dev.");
}

async function fetchJson(origin, path, init) {
	const response = await fetch(`${origin}${path}`, init);
	const body = await response.json();
	if (!response.ok) {
		throw new Error(
			`${path} returned ${response.status}: ${JSON.stringify(body)}`,
		);
	}
	const cookies =
		response.headers.getSetCookie?.() ??
		(response.headers.get("set-cookie")
			? [response.headers.get("set-cookie")]
			: []);
	return { body, cookies };
}

function findCookie(cookies, name) {
	const cookie = cookies.find((value) => value.startsWith(`${name}=`));
	return cookie?.split(";")[0] ?? "";
}

async function smokeDefaultComments(origin) {
	const pageKey = "post:cloudflare-default-smoke";
	const bootstrap = await fetchJson(
		origin,
		`/api/comments/bootstrap/?siteKey=default&pageKey=${encodeURIComponent(pageKey)}&pageTitle=Cloudflare%20Default%20Smoke&limit=5`,
	);
	if (
		bootstrap.body.pagination.rootCount < 6 ||
		bootstrap.body.comments.length !== 5
	) {
		throw new Error("QingYan default mock comments did not fill two pages.");
	}
	const nestedRoot = bootstrap.body.comments.find(
		(comment) => comment.id === "dev_post_cloudflare-default-smoke_root_1",
	);
	if (!nestedRoot?.children?.[0]?.children?.[0]) {
		throw new Error("QingYan default mock comments did not include nesting.");
	}

	const secondPage = await fetchJson(
		origin,
		`/api/comments/thread/?siteKey=default&pageKey=${encodeURIComponent(pageKey)}&limit=5&offset=5`,
	);
	if (secondPage.body.comments.length < 1) {
		throw new Error("QingYan default mock comments second page is empty.");
	}

	return {
		pageKey,
		visitorCookie: findCookie(bootstrap.cookies, "qingyan_visitor"),
	};
}

export async function runSmoke(origin) {
	await fetchJson(origin, "/healthz");
	const defaultThread = await smokeDefaultComments(origin);
	const session = await fetchJson(origin, "/api/dev/session", {
		method: "POST",
		body: JSON.stringify({ token: "dev-token" }),
		headers: { "content-type": "application/json" },
	});
	const adminCookie = findCookie(session.cookies, "qingyan_admin");
	if (!adminCookie) {
		throw new Error("QingYan dev session did not return qingyan_admin cookie.");
	}

	const like = await fetchJson(origin, "/api/page-feedback/like", {
		method: "POST",
		body: JSON.stringify({
			siteKey: "default",
			pageKey: defaultThread.pageKey,
			pageTitle: "Cloudflare Default Smoke",
			pageUrl: `${origin}/posts/cloudflare-default-smoke/`,
		}),
		headers: {
			"content-type": "application/json",
			cookie: defaultThread.visitorCookie,
		},
	});
	if (like.body.pageFeedback.likeCount !== 1) {
		throw new Error("QingYan page feedback mock did not update like count.");
	}

	const home = await fetch(`${origin}/`);
	if (!home.ok) {
		throw new Error(`Static asset smoke returned ${home.status}`);
	}
	console.log("[cloudflare-demo] smoke passed");
}
