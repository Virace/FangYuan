import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

function parseYesNo(value, fallback) {
  const normalized = value.trim().toLowerCase()

  if (!normalized) {
    return fallback
  }

  return normalized === "y" || normalized === "yes"
}

export function normalizeInitSiteAnswers(raw) {
  return {
    siteTitle: raw.siteTitle.trim() || "My Site",
    siteSubtitle: raw.siteSubtitle.trim() || "My subtitle",
    profileName: raw.profileName.trim() || "Your Name",
    profileBio: raw.profileBio.trim(),
    qingyanSiteKey: raw.qingyanSiteKey.trim() || "fangyuan",
    qingyanApiBase: "/api",
    qingyanDevProxyTarget: raw.qingyanDevProxyTarget.trim() || null,
    enableComments: parseYesNo(raw.enableComments, true),
    enablePageMetrics: parseYesNo(raw.enablePageMetrics, true),
    enablePageFeedback: parseYesNo(raw.enablePageFeedback, true),
    includeRewardPlaceholders: parseYesNo(raw.includeRewardPlaceholders, true),
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
      enableComments: await rl.question("Enable comments? [Y/n]: "),
      enablePageMetrics: await rl.question("Enable page metrics? [Y/n]: "),
      enablePageFeedback: await rl.question("Enable page feedback? [Y/n]: "),
      includeRewardPlaceholders: await rl.question(
        "Add reward placeholders? [Y/n]: ",
      ),
    })
  } finally {
    rl.close()
  }
}
