import type { CCConfig } from '../types/global';

import { installTimerBoost } from './features/timers';
import { installVisibilitySpoofing } from './features/visibility';
import { installTrustProxy } from './features/trust';
import { installPopupBlocker } from './features/popup-blocker';
import { installAntiAdblockRemover, DEFAULT_ADBLOCK_PATTERN } from './features/adblock';
import { installCloudflareTurnstileBypass } from './features/cloudflare';
import { getAllRules, getRegistry } from './rules/index';
import { matchRule, runRule } from './engine/dispatcher';

(function bootstrap(): void {
  // Config may already be set by isolated.ts scripting injection,
  // or it arrives slightly later via script tag fallback.
  // Poll briefly to handle the fallback case.
  const MAX_WAIT_MS = 200;
  const POLL_MS = 10;
  let waited = 0;

  function tryRun(): void {
    const config: CCConfig | undefined = window.__CC_CONFIG;

    if (!config && waited < MAX_WAIT_MS) {
      waited += POLL_MS;
      setTimeout(tryRun, POLL_MS);
      return;
    }

    // Run with whatever we have — if still undefined, use safe defaults
    run(config);
  }

  tryRun();
})();

function run(config: CCConfig | undefined): void {
  if (!config?.settings.enabled) return;
  const { settings } = config;

  // Install MAIN-world features
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

  // Run rule engine
  const hostname = location.hostname.replace(/^www\./, '');
  const rules = getAllRules();
  const matched = matchRule(rules, hostname, location.pathname);
  if (!matched) return;

  // Skip if rule needs a feature that's disabled
  if (matched.requiresFeature && !settings[matched.requiresFeature as keyof typeof settings]) {
    return;
  }

  runRule(matched, config, getRegistry());
}
