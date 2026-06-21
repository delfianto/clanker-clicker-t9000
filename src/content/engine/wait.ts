import { qs, isVisible } from "./dom";

const DEFAULT_TIMEOUT_MS = 30_000;
const VISIBILITY_POLL_MS = 500;

export class TimeoutError extends Error {
  constructor(selector: string) {
    super(`Timeout waiting for: ${selector}`);
    this.name = "TimeoutError";
  }
}

export function waitForElement(
  selector: string,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existing = qs(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      const el = qs(selector);
      if (el) {
        cleanup();
        resolve(el);
      }
    });

    function cleanup() {
      clearTimeout(timer);
      observer.disconnect();
      signal?.removeEventListener("abort", onAbort);
    }

    function onAbort() {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    }

    timer = setTimeout(() => {
      cleanup();
      reject(new TimeoutError(selector));
    }, timeoutMs);
    signal?.addEventListener("abort", onAbort, { once: true });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

export function waitForVisible(
  selector: string,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = (): void => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        reject(new TimeoutError(selector));
        return;
      }

      const el = qs(selector);
      if (el && isVisible(el)) {
        resolve(el);
        return;
      }
      setTimeout(check, VISIBILITY_POLL_MS);
    };

    check();
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
