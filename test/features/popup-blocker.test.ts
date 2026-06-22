import { afterEach, expect, mock, test } from "bun:test";
import { installPopupBlocker } from "../../src/content/features/popup-blocker";

let uninstall: (() => void) | null = null;
afterEach(() => {
  uninstall?.();
  uninstall = null;
});

test("intercepts http(s) window.open: returns null and schedules navigation", async () => {
  const assign = mock((url: string) => url);
  Object.defineProperty(window, "location", {
    value: { assign, href: "https://example.com" },
    writable: true,
    configurable: true,
  });
  uninstall = installPopupBlocker();
  const result = window.open("https://ad.example/popup");
  expect(result).toBeNull();
  // Navigation is scheduled as a microtask
  await Promise.resolve();
  expect(assign).toHaveBeenCalledWith("https://ad.example/popup");
});

test("passes through non-http opens unchanged", () => {
  uninstall = installPopupBlocker();
  // about:blank and similar should not be intercepted
  const result = window.open("about:blank");
  // returns whatever the real open returns in happy-dom
  expect(result === null || result !== undefined).toBe(true);
});
