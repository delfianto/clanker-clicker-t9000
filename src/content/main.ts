import type { CCConfig } from "../types/global";
import type { Rule } from "../types/rules";

import { installFeatures } from "../settings/install";
import { installTrustProxy } from "./features/trust";
import { getAllRules } from "./rules/index";
import { matchRule, runRule } from "./engine/dispatcher";

// Resolve the matching rule synchronously at document_start, before any page JS
// runs. This is the single gate for whether the extension touches this page at
// all — if no rule matches (e.g. alldebrid.com, a plain download list), we
// install nothing and leave the page's clickable DOM completely alone.
const hostname = location.hostname.replace(/^www\./, "");
const matched: Rule | undefined = matchRule(getAllRules(), hostname, location.pathname);

// Install the trust proxy only on pages we actually act on, and only at
// document_start — page handlers (e.g. ShrinkMe's DOMContentLoaded click/submit
// listeners) register AFTER this, so they are wrapped and see isTrusted:true on
// our synthetic click events. It must precede page JS, which is why it can't
// wait for the async settings read below. On non-target pages it never installs,
// so EventTarget.prototype.addEventListener is never patched there.
if (matched) installTrustProxy();

// Write state to window so page.evaluate() in the debug script can read it —
// console.log from MAIN-world content scripts goes to the extension inspector,
// not the page's CDP console, so Playwright never sees it.
window.__cc = { ready: true, host: hostname, rule: matched?.id };

// Nothing matched: don't even register the config listener. The page is left
// exactly as the browser delivered it.
if (matched) {
  // Register synchronously at startup — isolated.ts dispatches only after an async
  // storage read, so this listener is always in place before the event fires.
  document.addEventListener(
    "__cc_config__",
    (e) => {
      try {
        const config = JSON.parse((e as CustomEvent<string>).detail) as CCConfig;
        run(config, matched);
      } catch {}
    },
    { once: true },
  );
}

function run(config: CCConfig, rule: Rule): void {
  if (!config.settings.enabled) return;
  const { settings } = config;

  if (rule.requiresFeature && !settings[rule.requiresFeature as keyof typeof settings]) {
    return;
  }

  // Disable timer boost when the rule opts out (server validates elapsed time server-side)
  // or when the first action is a captcha (accelerated timers break reCAPTCHA).
  const suppressBoost = rule.skipTimerBoost === true || rule.actions[0]?.type === "wait-captcha";
  installFeatures({
    ...settings,
    ...(suppressBoost ? { timerBoost: { ...settings.timerBoost, enabled: false } } : {}),
    // Rules that ride the page's own script (e.g. a ShrinkMe countdown) opt out of
    // anti-adblock — these sites bundle the countdown into the adblock-detector
    // file, so removing it freezes the counter.
    ...(rule.skipAntiAdblock ? { antiAdblock: false } : {}),
  });

  runRule(rule, config);
}
