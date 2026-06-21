import { afterEach, expect, test } from "bun:test";
import { installVisibilitySpoofing } from "../../src/content/features/visibility";

let uninstall: (() => void) | null = null;
afterEach(() => {
  uninstall?.();
  uninstall = null;
});

test("spoofs visibility + focus to look foregrounded", () => {
  uninstall = installVisibilitySpoofing();
  expect(document.hidden).toBe(false);
  expect(document.visibilityState).toBe("visible");
  expect(document.hasFocus()).toBe(true);
});

test("uninstall restores document.hasFocus", () => {
  const before = document.hasFocus();
  uninstall = installVisibilitySpoofing();
  expect(document.hasFocus()).toBe(true);
  uninstall();
  uninstall = null;
  expect(document.hasFocus()).toBe(before);
});
