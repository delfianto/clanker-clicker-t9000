import type { Settings } from "../types/global";

import { installTimerBoost } from "../content/features/timers";
import { installVisibilitySpoofing } from "../content/features/visibility";
import { installTrustProxy } from "../content/features/trust";
import { installPopupBlocker } from "../content/features/popup-blocker";
import { installAntiAdblockRemover, DEFAULT_ADBLOCK_PATTERN } from "../content/features/adblock";
import { installCloudflareTurnstileBypass } from "../content/features/cloudflare";

// MAIN-world feature installers, in install order. Always-on features
// (visibility/trust spoofing) have no gate; the rest read their flag from
// settings. Add a feature here — nothing else in main.ts needs to change.
const INSTALLERS: ReadonlyArray<(s: Settings) => void> = [
  (s) => {
    if (s.timerBoost.enabled) installTimerBoost(s.timerBoost.threshold);
  },
  () => installVisibilitySpoofing(),
  () => installTrustProxy(),
  (s) => {
    if (s.popupBlocker) installPopupBlocker();
  },
  (s) => {
    if (s.antiAdblock) installAntiAdblockRemover(DEFAULT_ADBLOCK_PATTERN);
  },
  (s) => {
    if (s.cloudflareTurnstile) installCloudflareTurnstileBypass();
  },
];

export function installFeatures(settings: Settings): void {
  for (const install of INSTALLERS) install(settings);
}
