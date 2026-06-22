import type { CCConfig } from "../types/global";

import { installFeatures } from "../settings/install";
import { getAllRules } from "./rules/index";
import { matchRule, runRule } from "./engine/dispatcher";

// Register synchronously at startup — isolated.ts dispatches only after an async
// storage read, so this listener is always in place before the event fires.
document.addEventListener(
  "__cc_config__",
  (e) => {
    try {
      const config = JSON.parse((e as CustomEvent<string>).detail) as CCConfig;
      run(config);
    } catch {}
  },
  { once: true },
);

function run(config: CCConfig): void {
  if (!config.settings.enabled) return;
  const { settings } = config;

  const hostname = location.hostname.replace(/^www\./, "");
  const rules = getAllRules();
  const matched = matchRule(rules, hostname, location.pathname);
  if (!matched) return;

  if (matched.requiresFeature && !settings[matched.requiresFeature as keyof typeof settings]) {
    return;
  }

  // Install features only on pages with a matching rule — keeps visibility
  // spoofing, trust proxy, and cloudflare bypass off unrelated sites.
  installFeatures(settings);

  runRule(matched, config);
}
