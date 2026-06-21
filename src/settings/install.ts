import type { Settings } from "../types/global";

import { installTimerBoost } from "../content/features/timers";
import { installVisibilitySpoofing } from "../content/features/visibility";
import { installTrustProxy } from "../content/features/trust";
import { installPopupBlocker } from "../content/features/popup-blocker";
import { installAntiAdblockRemover, DEFAULT_ADBLOCK_PATTERN } from "../content/features/adblock";
import { installCloudflareTurnstileBypass } from "../content/features/cloudflare";

type Feature = {
  name: string;
  enabled: (s: Settings) => boolean;
  install: (s: Settings) => void;
};

// MAIN-world features, in install order. Always-on entries (visibility/trust
// spoofing) are ungated; the rest read their flag from settings. Add a feature
// here and nothing else needs to change.
const FEATURES: readonly Feature[] = [
  {
    name: "timerBoost",
    enabled: (s) => s.timerBoost.enabled,
    install: (s) => installTimerBoost(s.timerBoost.threshold),
  },
  { name: "visibility", enabled: () => true, install: () => installVisibilitySpoofing() },
  { name: "trust", enabled: () => true, install: () => installTrustProxy() },
  { name: "popupBlocker", enabled: (s) => s.popupBlocker, install: () => installPopupBlocker() },
  {
    name: "antiAdblock",
    enabled: (s) => s.antiAdblock,
    install: () => installAntiAdblockRemover(DEFAULT_ADBLOCK_PATTERN),
  },
  {
    name: "cloudflareTurnstile",
    enabled: (s) => s.cloudflareTurnstile,
    install: () => installCloudflareTurnstileBypass(),
  },
];

// The feature names that would be installed for these settings. Pure — exists so
// the gating logic is unit-testable without patching window/Array globals.
export function activeFeatures(settings: Settings): string[] {
  return FEATURES.filter((f) => f.enabled(settings)).map((f) => f.name);
}

export function installFeatures(settings: Settings): void {
  for (const f of FEATURES) {
    if (f.enabled(settings)) f.install(settings);
  }
}
