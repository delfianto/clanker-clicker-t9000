import { defineConfig } from "vite-plus";
import webExtension from "vite-plugin-web-extension";

type Browser = "chrome" | "firefox";

const browser = (process.env["BROWSER"] ?? "chrome") as Browser;

const EXCLUDE_MATCHES = [
  "*://*.github.com/*",
  "*://*.reddit.com/*",
  "*://*.microsoft.com/*",
  "*://*.whatsapp.com/*",
  "*://*.amazon.com/*",
  "*://*.ebay.com/*",
  "*://*.paypal.com/*",
  "*://*.stripe.com/*",
  "*://*.discord.com/*",
  "*://*.netflix.com/*",
  "*://*.spotify.com/*",
  "*://*.linkedin.com/*",
  "*://*.twitter.com/*",
  "*://*.x.com/*",
  "*://*.wikipedia.org/*",
  "*://*.greasyfork.org/*",
  "*://*.openuserjs.org/*",
  "*://*.telegram.org/*",
  "*://*.proton.me/*",
  "*://*.deepseek.com/*",
  "*://*.openai.com/*",
  "*://*.chatgpt.com/*",
  "*://*.anthropic.com/*",
  "*://*.doubleclick.net/*",
  "*://*.googlesyndication.com/*",
  "*://*.gstatic.com/*",
  "*://*.edu/*",
  "*://*.gov/*",
] as const;

function makeManifest(target: Browser): Record<string, unknown> {
  const base: Record<string, unknown> = {
    manifest_version: 3,
    name: "Clanker Clicker T9000",
    version: "1.0.0",
    description: "Bypass shortlinks automatically. Clean, private, no external server.",
    icons: { "48": "icons/icon-48.png", "96": "icons/icon-96.png" },
    permissions: ["storage", "activeTab", "tabs", "scripting", "clipboardWrite"],
    host_permissions: ["<all_urls>"],
    background: { service_worker: "src/background/index.ts", type: "module" },
    action: {
      default_popup: "src/popup/index.html",
      default_icon: { "48": "icons/icon-48.png", "96": "icons/icon-96.png" },
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        exclude_matches: EXCLUDE_MATCHES,
        js: ["src/content/isolated.ts"],
        run_at: "document_start",
        all_frames: false,
        world: "ISOLATED",
      },
      {
        matches: ["<all_urls>"],
        exclude_matches: EXCLUDE_MATCHES,
        js: ["src/content/main.ts"],
        run_at: "document_start",
        all_frames: false,
        world: "MAIN",
      },
      {
        matches: ["*://newassets.hcaptcha.com/*", "*://*.hcaptcha.com/*"],
        js: ["src/content/main.ts"],
        run_at: "document_start",
        all_frames: true,
        world: "MAIN",
      },
    ],
  };

  if (target === "firefox") {
    base["browser_specific_settings"] = {
      gecko: {
        id: "clanker-clicker@delfianto",
        strict_min_version: "128.0",
      },
    };
  }

  return base;
}

export default defineConfig({
  build: {
    outDir: `build/${browser}`,
    emptyOutDir: true,
    sourcemap: process.env["NODE_ENV"] !== "production",
    minify: process.env["NODE_ENV"] === "production" ? "esbuild" : false,
  },

  lint: {
    ignorePatterns: [
      "build/**",
      "node_modules/**",
      "aio-bypass-addon/**",
      "bypass-all-shortlinks.user.js",
    ],
    rules: {
      "no-console": "off",
    },
  },

  fmt: {
    ignorePatterns: [
      "build/**",
      "node_modules/**",
      "aio-bypass-addon/**",
      "bypass-all-shortlinks.user.js",
    ],
  },

  plugins: [
    webExtension({
      browser,
      manifest: () => makeManifest(browser),
    }),
  ],
});
