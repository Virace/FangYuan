import fs from "node:fs";
import { describeStudioSettings } from "../../src/utils/site-source/studio-settings.ts";
import {
	applySiteConfigUpdate,
	planSiteConfigUpdate,
} from "./update-site-config.js";

const source = fs.readFileSync(0, "utf8");
const mode = process.argv[2];
if (mode === "plan-migration" || mode === "apply-migration") {
	const plan = await planSiteConfigUpdate(process.env.FANGYUAN_SITE_ROOT);
	if (plan.source !== undefined && plan.source !== source) {
		process.stdout.write(JSON.stringify({ conflict: true }));
	} else {
		const next =
			mode === "apply-migration" ? await applySiteConfigUpdate(plan) : plan;
		process.stdout.write(
			JSON.stringify({
				...next,
				source: undefined,
				configPath: undefined,
				siteRoot: undefined,
			}),
		);
	}
} else {
	process.stdout.write(JSON.stringify(describeStudioSettings(source)));
}
