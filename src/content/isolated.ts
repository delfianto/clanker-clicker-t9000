import browser from "webextension-polyfill";
import type { Settings, CCConfig } from "../types/global";

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  timerBoost: { enabled: false, threshold: 1000 },
  popupBlocker: false,
  antiAdblock: false,
  cloudflareTurnstile: true,
  captchaSolver: { provider: "none", apiKey: "" },
  autoDL: false,
};

async function init(): Promise<void> {
  let settings: Settings;
  try {
    const stored = await browser.storage.local.get(DEFAULT_SETTINGS);
    settings = stored as Settings;
  } catch {
    settings = DEFAULT_SETTINGS;
  }

  if (!settings.enabled) return;

  const config: CCConfig = { settings, timestamp: Date.now() };

  // CustomEvent on document crosses ISOLATED→MAIN boundary without triggering CSP —
  // DOM events are not script execution. main.ts registers its listener synchronously
  // at startup, before this async path resumes after the storage await.
  document.dispatchEvent(
    new CustomEvent("__cc_config__", { detail: JSON.stringify(config) }),
  );

  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window || event.data?.type !== "CC_REQUEST") return;
    handleMainWorldRequest(event.data).catch(() => {});
  });
}

interface CCRequest {
  type: "CC_REQUEST";
  action: "openTab" | "copyText" | "fetch";
  id: string;
  url?: string;
  text?: string;
  fetchOpts?: { method?: string; headers?: Record<string, string>; body?: string };
}

async function handleMainWorldRequest(req: CCRequest): Promise<void> {
  let result: unknown;
  try {
    switch (req.action) {
      case "openTab":
        if (req.url) await browser.tabs.create({ url: req.url });
        result = { ok: true };
        break;

      case "fetch":
        if (!req.url) throw new Error("no url");
        result = await browser.runtime.sendMessage({
          type: "CC_FETCH",
          url: req.url,
          method: req.fetchOpts?.method,
          headers: req.fetchOpts?.headers,
          body: req.fetchOpts?.body,
        });
        break;

      default:
        result = { error: "unknown action" };
    }
  } catch (e) {
    result = { error: String(e) };
  }
  window.postMessage({ type: "CC_RESPONSE", id: req.id, result }, "*");
}

init().catch(() => {});
