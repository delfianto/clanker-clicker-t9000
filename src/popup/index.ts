import browser from "webextension-polyfill";
import type { Settings } from "../types/global";

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  timerBoost: { enabled: false, threshold: 1000 },
  popupBlocker: false,
  antiAdblock: false,
  cloudflareTurnstile: true,
  captchaSolver: { provider: "none", apiKey: "" },
  autoDL: false,
};

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
  const threshRow = $("threshold-row");
  const apikeyRow = $("apikey-row");
  threshRow.classList.toggle("hidden", !s.timerBoost.enabled);
  apikeyRow.classList.toggle("hidden", s.captchaSolver.provider === "none");
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

  // Live conditional visibility
  $<HTMLInputElement>("timerBoost").addEventListener("change", () => {
    $("threshold-row").classList.toggle("hidden", !$<HTMLInputElement>("timerBoost").checked);
  });
  $<HTMLSelectElement>("captchaProvider").addEventListener("change", () => {
    $("apikey-row").classList.toggle(
      "hidden",
      $<HTMLSelectElement>("captchaProvider").value === "none",
    );
  });

  $("saveBtn").addEventListener("click", async () => {
    const btn = $<HTMLButtonElement>("saveBtn");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      await browser.storage.local.set(readForm() as unknown as Record<string, unknown>);
      btn.textContent = "Saved!";
      setTimeout(() => {
        btn.textContent = "Save";
        btn.disabled = false;
      }, 1200);
    } catch {
      btn.textContent = "Error";
      btn.disabled = false;
    }
  });

  $("reloadBtn").addEventListener("click", async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id != null) {
      await browser.tabs.reload(tab.id);
      window.close();
    }
  });
});
