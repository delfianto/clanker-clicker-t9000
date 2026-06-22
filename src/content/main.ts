import type { CCConfig } from "../types/global";

import { installFeatures } from "../settings/install";
import { getAllRules } from "./rules/index";
import { matchRule, runRule } from "./engine/dispatcher";

// Write state to window so page.evaluate() in the debug script can read it —
// console.log from MAIN-world content scripts goes to the extension inspector,
// not the page's CDP console, so Playwright never sees it.
(window as Record<string, unknown>)["__cc"] = { ready: true, host: location.hostname };

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

  (window as Record<string, unknown>)["__cc"] = {
    ready: true,
    host: hostname,
    rule: matched.id,
  };
  // Disable timer boost when the rule opts out (server validates elapsed time server-side)
  // or when the first action is a captcha (accelerated timers break reCAPTCHA).
  const suppressBoost =
    matched.skipTimerBoost === true || matched.actions[0]?.type === "wait-captcha";
  installFeatures(
    suppressBoost
      ? { ...settings, timerBoost: { ...settings.timerBoost, enabled: false } }
      : settings,
  );

  runRule(matched, config);
}
