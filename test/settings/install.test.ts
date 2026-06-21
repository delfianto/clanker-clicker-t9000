import { describe, expect, test } from "bun:test";
import { activeFeatures } from "../../src/settings/install";
import { DEFAULT_SETTINGS } from "../../src/settings/schema";

// Tests the install gating logic directly (pure) — no module mocks, so it can't
// leak patched globals into the feature tests.
describe("activeFeatures", () => {
  test("always includes the ungated visibility + trust spoofing", () => {
    const active = activeFeatures(DEFAULT_SETTINGS);
    expect(active).toContain("visibility");
    expect(active).toContain("trust");
  });

  test("default settings: gated features off except cloudflareTurnstile", () => {
    expect(activeFeatures(DEFAULT_SETTINGS)).toEqual([
      "visibility",
      "trust",
      "cloudflareTurnstile",
    ]);
  });

  test("enables gated features per their flags, preserving install order", () => {
    const active = activeFeatures({
      ...DEFAULT_SETTINGS,
      timerBoost: { enabled: true, threshold: 500 },
      popupBlocker: true,
      antiAdblock: true,
      cloudflareTurnstile: false,
    });
    expect(active).toEqual(["timerBoost", "visibility", "trust", "popupBlocker", "antiAdblock"]);
  });
});
