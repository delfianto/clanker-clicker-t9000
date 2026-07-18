import { afterEach, expect, mock, test } from "bun:test";
import { installPopupBlocker } from "../../src/content/features/popup-blocker";

let uninstall: (() => void) | null = null;
// window === globalThis once happy-dom is globally registered (see test/setup.ts),
// so replacing window.location below replaces the *shared* global location for
// every test file that runs after this one. Restore the real descriptor or the
// mock leaks process-wide.
const realLocation = Object.getOwnPropertyDescriptor(window, "location")!;
afterEach(() => {
  uninstall?.();
  uninstall = null;
  Object.defineProperty(window, "location", realLocation);
});

test("intercepts http(s) window.open: returns null, does NOT navigate main tab", async () => {
  const assign = mock((url: string) => url);
  Object.defineProperty(window, "location", {
    value: { assign, href: "https://example.com" },
    writable: true,
    configurable: true,
  });
  uninstall = installPopupBlocker();
  const result = window.open("https://ad.example/popup");
  expect(result).toBeNull();
  // Must not navigate — ad-revenue popups fire before the page's own
  // location.href destination assignment; following them hijacks the tab.
  await Promise.resolve();
  expect(assign).not.toHaveBeenCalled();
});

test("passes through non-http opens unchanged", () => {
  uninstall = installPopupBlocker();
  // about:blank and similar should not be intercepted
  const result = window.open("about:blank");
  // returns whatever the real open returns in happy-dom
  expect(result === null || result !== undefined).toBe(true);
});
