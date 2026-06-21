// Cloudflare Turnstile auto-bypass.
// Auto-clicks the Turnstile checkbox after a short delay. trust.ts makes the
// synthetic click event appear isTrusted so Turnstile accepts it.
// We no longer patch Element.prototype.addEventListener — that caused a timing
// race with reCAPTCHA on pages that use both captcha types.

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
    const checkbox = document.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (checkbox && !checkbox.checked) checkbox.click();
  }, 300);

  return () => {
    clearTimeout(timer);
  };
}
