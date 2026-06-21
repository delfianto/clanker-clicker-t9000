import { qs } from "./dom";

const CAPTCHA_POLL_MS = 1_000;
const CAPTCHA_TIMEOUT_MS = 120_000;

type CaptchaWindow = Window & {
  hcaptcha?: { getResponse(): string };
  turnstile?: { getResponse(): string };
  grecaptcha?: { getResponse(): string };
};

export function waitForCaptcha(
  signal?: AbortSignal,
  timeoutMs = CAPTCHA_TIMEOUT_MS,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let timer: ReturnType<typeof setInterval>;

    function cleanup() {
      clearInterval(timer);
      signal?.removeEventListener("abort", onAbort);
    }

    function onAbort() {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    }
    signal?.addEventListener("abort", onAbort, { once: true });

    timer = setInterval(() => {
      if (signal?.aborted) {
        cleanup();
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        cleanup();
        reject(new Error("Captcha timeout"));
        return;
      }

      if (isCaptchaSolved()) {
        cleanup();
        resolve();
      }
    }, CAPTCHA_POLL_MS);
  });
}

function isCaptchaSolved(): boolean {
  const w = window as CaptchaWindow;

  if (qs(".iconcaptcha-modal__body-checkmark")) {
    console.debug("[CC] captcha solved: iconcaptcha");
    return true;
  }

  if (qs("iframe[src^='https://newassets.hcaptcha.com']")) {
    const r = w.hcaptcha?.getResponse();
    if (r && r.length > 0) {
      console.debug("[CC] captcha solved: hcaptcha");
      return true;
    }
  }

  if (qs("input[name='cf-turnstile-response']")) {
    const r = w.turnstile?.getResponse();
    if (r && r.length > 0) {
      console.debug("[CC] captcha solved: turnstile");
      return true;
    }
  }

  // Use the live grecaptcha API for both checkbox and invisible variants.
  // Deliberately avoid reading textarea[name='g-recaptcha-response'] directly —
  // browsers restore its stale value on page refresh, causing a false positive
  // that fires before reCAPTCHA has rendered on the current load.
  if (w.grecaptcha && typeof w.grecaptcha.getResponse === "function") {
    const r = w.grecaptcha.getResponse();
    if (r && r.length > 0) {
      console.debug("[CC] captcha solved: grecaptcha token=" + r.slice(0, 20) + "…");
      return true;
    }
  }

  return false;
}
