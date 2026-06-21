import { afterEach, expect, test } from "bun:test";
import { installTimerBoost } from "../../src/content/features/timers";

let uninstall: (() => void) | null = null;
afterEach(() => {
  uninstall?.();
  uninstall = null;
});

test("accelerates setTimeout delays >= threshold down to ~50ms", async () => {
  uninstall = installTimerBoost(1000);
  const start = Date.now();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 5000));
  expect(Date.now() - start).toBeLessThan(1500);
});

test("leaves sub-threshold delays unchanged", async () => {
  uninstall = installTimerBoost(1000);
  const start = Date.now();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 40));
  expect(Date.now() - start).toBeGreaterThanOrEqual(25);
});
