// Cloudflare Turnstile auto-bypass.
// Auto-clicks the Turnstile checkbox after a short delay via simulateClick,
// which marks its events synthetic so trust.ts spoofs isTrusted:true on them —
// Turnstile only accepts a trusted click. A plain checkbox.click() would NOT be
// marked, so the selective trust proxy would leave it isTrusted:false.
// We no longer patch Element.prototype.addEventListener — that caused a timing
// race with reCAPTCHA on pages that use both captcha types.

import { simulateClick } from "../engine/synthetic";

function hasRecaptcha(): boolean {
  return !!(
    document.querySelector(".g-recaptcha") ??
    document.querySelector("textarea[name='g-recaptcha-response']") ??
    document.querySelector("iframe[title='reCAPTCHA']")
  );
}

export function installCloudflareTurnstileBypass(): () => void {
  // Skip if reCAPTCHA is on the page — its checkbox sits in a sandboxed iframe
  // so querySelector can't reach it, but guard against edge cases anyway.
  const timer = setTimeout(() => {
    if (hasRecaptcha()) return;
    // Scope to pages that actually have a Turnstile widget — avoids clicking
    // unrelated checkboxes (e.g. dark-mode toggles) on non-Turnstile pages.
    if (!document.querySelector("input[name='cf-turnstile-response']")) return;
    const checkbox = document.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (checkbox && !checkbox.checked) simulateClick(checkbox);
  }, 300);

  return () => {
    clearTimeout(timer);
  };
}
