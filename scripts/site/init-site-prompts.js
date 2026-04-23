import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

export function normalizeInitSiteAnswers(raw) {
	return {
		siteTitle: raw.siteTitle.trim() || "My Site",
		siteSubtitle: raw.siteSubtitle.trim() || "My subtitle",
		profileName: raw.profileName.trim() || "Your Name",
		profileBio: raw.profileBio.trim() || "Write something here.",
		qingyanSiteKey: raw.qingyanSiteKey.trim() || "fangyuan",
		qingyanDevProxyTarget: raw.qingyanDevProxyTarget.trim() || null,
	}
}

export async function promptInitSiteOptions() {
	if (!input.isTTY || !output.isTTY) {
		throw new Error("init-site interactive mode requires a TTY.")
	}

	const rl = readline.createInterface({ input, output })

	try {
		return normalizeInitSiteAnswers({
			siteTitle: await rl.question("Site title: "),
			siteSubtitle: await rl.question("Site subtitle: "),
			profileName: await rl.question("Profile name: "),
			profileBio: await rl.question("Profile bio (optional): "),
			qingyanSiteKey: await rl.question("QingYan site key [fangyuan]: "),
			qingyanDevProxyTarget: await rl.question(
				"Local QingYan proxy target [http://localhost:4401 or blank]: ",
			),
		})
	} finally {
		rl.close()
	}
}
