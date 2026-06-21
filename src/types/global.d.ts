export type CaptchaProvider = 'nopecha' | 'none';

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

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  timerBoost: { enabled: false, threshold: 1000 },
  popupBlocker: false,
  antiAdblock: false,
  cloudflareTurnstile: true,
  captchaSolver: { provider: 'none', apiKey: '' },
  autoDL: false,
};

declare global {
  interface Window {
    __CC_CONFIG?: CCConfig;
  }
}
