import browser from "webextension-polyfill";
import type { Settings } from "../types/global";
import { DEFAULT_SETTINGS } from "../settings/schema";

function $<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function readForm(): Settings {
  return {
    enabled: $<HTMLInputElement>("enabled").checked,
    timerBoost: {
      enabled: $<HTMLInputElement>("timerBoost").checked,
      threshold: Number($<HTMLInputElement>("timerThreshold").value) || 1000,
    },
    popupBlocker: $<HTMLInputElement>("popupBlocker").checked,
    antiAdblock: $<HTMLInputElement>("antiAdblock").checked,
    cloudflareTurnstile: $<HTMLInputElement>("cloudflareTurnstile").checked,
    captchaSolver: {
      provider: $<HTMLSelectElement>("captchaProvider")
        .value as Settings["captchaSolver"]["provider"],
      apiKey: $<HTMLInputElement>("captchaApiKey").value.trim(),
    },
    autoDL: $<HTMLInputElement>("autoDL").checked,
  };
}

function applyToForm(s: Settings): void {
  $<HTMLInputElement>("enabled").checked = s.enabled;
  $<HTMLInputElement>("timerBoost").checked = s.timerBoost.enabled;
  $<HTMLInputElement>("timerThreshold").value = String(s.timerBoost.threshold);
  $<HTMLInputElement>("popupBlocker").checked = s.popupBlocker;
  $<HTMLInputElement>("antiAdblock").checked = s.antiAdblock;
  $<HTMLInputElement>("cloudflareTurnstile").checked = s.cloudflareTurnstile;
  $<HTMLSelectElement>("captchaProvider").value = s.captchaSolver.provider;
  $<HTMLInputElement>("captchaApiKey").value = s.captchaSolver.apiKey;
  $<HTMLInputElement>("autoDL").checked = s.autoDL;
  syncConditional(s);
}

function syncConditional(s: Settings): void {
  $("threshold-row").classList.toggle("hidden", !s.timerBoost.enabled);
  $("apikey-row").classList.toggle("hidden", s.captchaSolver.provider === "none");
}

function flashStatus(text: string): void {
  const el = $("status");
  el.textContent = text;
  el.classList.add("show");
  window.setTimeout(() => el.classList.remove("show"), 1100);
}

async function persist(): Promise<void> {
  try {
    await browser.storage.local.set(readForm() as unknown as Record<string, unknown>);
    flashStatus("Saved ✓");
  } catch {
    flashStatus("Error");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  let settings: Settings;
  try {
    const stored = await browser.storage.local.get(DEFAULT_SETTINGS);
    settings = stored as Settings;
  } catch {
    settings = DEFAULT_SETTINGS;
  }
  applyToForm(settings);

  // Auto-apply: persist on any change (no Save button). Text inputs are debounced
  // so we don't write storage on every keystroke. Settings take effect on the next
  // page load; the Reload button force-applies them to the current tab.
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const controls = document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select");
  for (const control of controls) {
    const isText =
      control instanceof HTMLInputElement &&
      (control.type === "number" || control.type === "password" || control.type === "text");

    control.addEventListener("change", () => {
      syncConditional(readForm());
      void persist();
    });

    if (isText) {
      control.addEventListener("input", () => {
        window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(() => void persist(), 300);
      });
    }
  }

  $("reloadBtn").addEventListener("click", async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id != null) {
      await browser.tabs.reload(tab.id);
      window.close();
    }
  });
});
