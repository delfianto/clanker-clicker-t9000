export type CaptchaProvider = "nopecha" | "none";

export type Settings = {
  enabled: boolean;
  timerBoost: { enabled: boolean; threshold: number };
  popupBlocker: boolean;
  antiAdblock: boolean;
  cloudflareTurnstile: boolean;
  captchaSolver: { provider: CaptchaProvider; apiKey: string };
  autoDL: boolean;
};

export type CCConfig = {
  settings: Settings;
  timestamp: number;
};

declare global {
  interface Window {
    __CC_CONFIG?: CCConfig;
    __cc?: { ready: boolean; host: string; rule: string | undefined };
  }
}
