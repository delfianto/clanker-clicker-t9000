import { expect, test } from "bun:test";
import { DEFAULT_SETTINGS } from "../../src/settings/schema";

// Locks the default settings so the two consumers (isolated.ts storage read +
// popup form defaults) can never silently drift apart again.
test("DEFAULT_SETTINGS has the exact expected shape and values", () => {
  expect(DEFAULT_SETTINGS).toEqual({
    enabled: true,
    timerBoost: { enabled: false, threshold: 1000 },
    popupBlocker: false,
    antiAdblock: false,
    cloudflareTurnstile: true,
    captchaSolver: { provider: "none", apiKey: "" },
    autoDL: false,
  });
});
