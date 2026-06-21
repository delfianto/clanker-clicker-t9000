import { afterEach, expect, test } from "bun:test";
import { installPopupBlocker } from "../../src/content/features/popup-blocker";

let uninstall: (() => void) | null = null;
afterEach(() => {
  uninstall?.();
  uninstall = null;
  document.getElementById("cc-popup-notice")?.remove();
});

test("intercepts http(s) window.open: returns null and shows a notice with the URL", () => {
  uninstall = installPopupBlocker();
  const result = window.open("https://ad.example/popup");
  expect(result).toBeNull();
  const notice = document.getElementById("cc-popup-notice");
  expect(notice).not.toBeNull();
  expect(notice?.textContent).toContain("ad.example");
});

test("does not show a notice before any popup is attempted", () => {
  uninstall = installPopupBlocker();
  expect(document.getElementById("cc-popup-notice")).toBeNull();
});
