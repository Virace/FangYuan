import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

function normalizeYesNo(value, defaultValue) {
	const normalized = String(value ?? "").trim().toLowerCase()
	if (!normalized) {
		return defaultValue
	}
	if (["y", "yes", "true", "1"].includes(normalized)) {
		return true
	}
	if (["n", "no", "false", "0"].includes(normalized)) {
		return false
	}
	return defaultValue
}

export function normalizeInitSiteAnswers(rawAnswers) {
	return {
		siteTitle: rawAnswers.siteTitle.trim() || "My Site",
		siteSubtitle: rawAnswers.siteSubtitle.trim() || "My subtitle",
		profileName: rawAnswers.profileName.trim() || "Your Name",
		profileBio: rawAnswers.profileBio.trim() || "Write something here.",
		qingyanSiteKey: rawAnswers.qingyanSiteKey.trim() || "fangyuan",
		qingyanDevProxyTarget: rawAnswers.qingyanDevProxyTarget.trim() || null,
		includeFrontmatterConfig: normalizeYesNo(
			rawAnswers.includeFrontmatterConfig,
			true,
		),
		includeVSCodeConfig: normalizeYesNo(
			rawAnswers.includeVSCodeConfig,
			true,
		),
	}
}

export async function promptInitSiteOptions() {
	if (!input.isTTY || !output.isTTY) {
		throw new Error("init-site interactive mode requires a TTY.")
	}

	const readlineInterface = readline.createInterface({ input, output })

	try {
		return normalizeInitSiteAnswers({
			siteTitle: await readlineInterface.question("Site title: "),
			siteSubtitle: await readlineInterface.question("Site subtitle: "),
			profileName: await readlineInterface.question("Profile name: "),
			profileBio: await readlineInterface.question("Profile bio (optional): "),
			qingyanSiteKey: await readlineInterface.question(
				"QingYan site key [fangyuan]: ",
			),
			qingyanDevProxyTarget: await readlineInterface.question(
				"Local QingYan proxy target [http://localhost:4401 or blank]: ",
			),
			includeFrontmatterConfig: await readlineInterface.question(
				"Create Front Matter CMS config? [Y/n]: ",
			),
			includeVSCodeConfig: await readlineInterface.question(
				"Create VS Code recommendations/settings? [Y/n]: ",
			),
		})
	} finally {
		readlineInterface.close()
	}
}
