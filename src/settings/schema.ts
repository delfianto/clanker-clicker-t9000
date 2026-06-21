import type { Settings } from "../types/global";

// Single source of truth for default settings. Imported by isolated.ts (storage
// read) and the popup (form defaults), so it must stay free of feature/DOM
// imports — pure data only.
export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  timerBoost: { enabled: false, threshold: 1000 },
  popupBlocker: false,
  antiAdblock: false,
  cloudflareTurnstile: true,
  captchaSolver: { provider: "none", apiKey: "" },
  autoDL: false,
};
