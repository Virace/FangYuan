import type { SiteConfig } from "../../types/config";
import {
	normalizeConfiguredBase,
	normalizeConfiguredSite,
} from "./runtime-config.ts";

type PublicDeployEnv = Record<string, string | boolean | undefined>;

function readEnvString(env: PublicDeployEnv, name: string): string | undefined {
	const value = env[name];
	return typeof value === "string" ? value.trim() || undefined : undefined;
}

export function resolvePublicSiteConfigOverride(
	env: PublicDeployEnv,
): Partial<SiteConfig> | null {
	const site = readEnvString(env, "PUBLIC_FANGYUAN_SITE");
	const base = readEnvString(env, "PUBLIC_FANGYUAN_BASE");
	if (!site && base === undefined) {
		return null;
	}

	return {
		...(site ? { site: normalizeConfiguredSite(site) } : {}),
		...(base !== undefined ? { base: normalizeConfiguredBase(base) } : {}),
	};
}
