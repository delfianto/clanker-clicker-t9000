import type { CCConfig } from "../types/global";

import { installTimerBoost } from "./features/timers";
import { installVisibilitySpoofing } from "./features/visibility";
import { installTrustProxy } from "./features/trust";
import { installPopupBlocker } from "./features/popup-blocker";
import { installAntiAdblockRemover, DEFAULT_ADBLOCK_PATTERN } from "./features/adblock";
import { installCloudflareTurnstileBypass } from "./features/cloudflare";
import { getAllRules, getRegistry } from "./rules/index";
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

  if (settings.timerBoost.enabled) {
    installTimerBoost(settings.timerBoost.threshold);
  }

  installVisibilitySpoofing();
  installTrustProxy();

  if (settings.popupBlocker) {
    installPopupBlocker();
  }
  if (settings.antiAdblock) {
    installAntiAdblockRemover(DEFAULT_ADBLOCK_PATTERN);
  }
  if (settings.cloudflareTurnstile) {
    installCloudflareTurnstileBypass();
  }

  const hostname = location.hostname.replace(/^www\./, "");
  const rules = getAllRules();
  const matched = matchRule(rules, hostname, location.pathname);
  if (!matched) return;

  if (matched.requiresFeature && !settings[matched.requiresFeature as keyof typeof settings]) {
    return;
  }

  runRule(matched, config, getRegistry());
}
