/**
 * Chain-aware debug script — opens Chrome with the extension loaded and dumps
 * DOM state after every page navigation. Lets you watch the full redirect chain
 * play out, including pages that require human captcha interaction.
 *
 * Usage:
 *   bun run debug [url]
 *
 * Default: https://shrinkme.click/p6D5dD
 * The browser stays open so you can solve captchas manually.
 * Press Ctrl+C to quit.
 */

import { chromium } from "playwright";
import type { Page } from "playwright";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { resolve } from "path";

const startUrl = process.argv[2] ?? "https://shrinkme.click/p6D5dD";
const extPath = resolve("./build/chrome");

// Fresh temp profile — avoids Chrome's security checks on copied real profiles
// which silently prevent extension loading (keyring decryption failures, etc.).
const userDataDir = mkdtempSync(`${tmpdir()}/cc-debug-`);

let hopCount = 0;

console.log(`\n[debug] start : ${startUrl}`);
console.log(`[debug] ext   : ${extPath}`);
console.log(`\nSolve captchas manually in the browser window. Ctrl+C to quit.\n`);

// Use Playwright's bundled Chromium (tested against this Playwright version).
// System Chrome 149+ has changed --load-extension handling vs older builds.
const ctx = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  ignoreDefaultArgs: ["--disable-extensions"],
  args: [`--load-extension=${extPath}`, "--no-sandbox"],
});

type CaptchaState = {
  gRecaptchaDiv: boolean;
  gRecaptchaIframe: boolean;
  textareaValue: string | null;
  hcaptchaIframe: boolean;
  turnstileInput: boolean;
  iconcaptcha: boolean;
  invisibleShortlink: boolean;
  grecaptchaExists: boolean;
  grecaptchaResponse: string;
};

async function dumpPage(page: Page): Promise<void> {
  hopCount++;
  const hop = hopCount;

  // Wait a moment for dynamic content + extension timers to settle
  await page.waitForTimeout(5000).catch(() => {});

  const dump = await page
    .evaluate(() => {
      const forms = [...document.forms].map((f) => ({
        name: f.name,
        id: f.id,
        action: f.action,
        method: f.method,
        hiddenFields: [...f.elements]
          .filter((el) => (el as HTMLInputElement).type === "hidden")
          .map((el) => {
            const e = el as HTMLInputElement;
            return { name: e.name, value: e.value.slice(0, 120) };
          }),
      }));

      const clickables = [
        ...document.querySelectorAll(
          "a[id], button[id], input[type=submit], input[type=button], [onclick]",
        ),
      ]
        .slice(0, 20)
        .map((el) => {
          const e = el as HTMLAnchorElement & HTMLButtonElement & HTMLInputElement;
          return {
            tag: e.tagName,
            id: e.id || null,
            href: e.href || null,
            onclick: e.getAttribute("onclick")?.slice(0, 120) || null,
            text: e.textContent?.trim().slice(0, 60) || null,
            visible: (e as HTMLElement).offsetParent !== null,
          };
        });

      const dataAttrs = [
        ...document.querySelectorAll("[data-url],[data-href],[data-link],[data-goto],[data-dest]"),
      ].map((el) => ({
        tag: el.tagName,
        id: (el as HTMLElement).id || null,
        attrs: Object.fromEntries(
          [...el.attributes]
            .filter((a) => /url|href|link|goto|dest/i.test(a.name))
            .map((a) => [a.name, a.value.slice(0, 200)]),
        ),
      }));

      // Grab any JS globals that might hold the destination
      const win = window as Record<string, unknown>;
      const jsVars: Record<string, string> = {};
      for (const key of [
        "tp",
        "rtg",
        "link",
        "url",
        "destination",
        "redirect",
        "goto",
        "tp_link",
        "safelink",
        "final_url",
        "shortlink",
      ]) {
        if (win[key] !== undefined) jsVars[key] = String(win[key]).slice(0, 200);
      }

      // Full attribute dump of tp-snp2 (to see what URL it would navigate to)
      const tpSnp2El = document.getElementById("tp-snp2");
      const tpSnp2Attrs = tpSnp2El
        ? Object.fromEntries([...tpSnp2El.attributes].map((a) => [a.name, a.value.slice(0, 200)]))
        : null;

      // Check if our popup blocker toast appeared (indicates window.open was intercepted)
      const popupBlocked = !!document.getElementById("cc-popup-notice");

      // Extract ALL inline scripts (up to 3000 chars each, skip very short ones)
      const scripts = [...document.querySelectorAll("script:not([src])")]
        .map((s) => s.textContent ?? "")
        .filter((t) => t.trim().length > 80)
        .map((t) => t.trim().slice(0, 3000));

      // tp-snp2 parent element attributes (might be a wrapping anchor)
      const tpSnp2Parent = tpSnp2El?.parentElement
        ? {
            tag: tpSnp2El.parentElement.tagName,
            attrs: Object.fromEntries(
              [...tpSnp2El.parentElement.attributes].map((a) => [a.name, a.value.slice(0, 200)]),
            ),
          }
        : null;

      const ccState = (window as Record<string, unknown>)["__cc"] ?? null;

      const w = window as Window & { grecaptcha?: { getResponse(): string } };
      const captcha: CaptchaState = {
        gRecaptchaDiv: !!document.querySelector(".g-recaptcha"),
        gRecaptchaIframe: !!document.querySelector("iframe[title='reCAPTCHA']"),
        textareaValue:
          (
            document.querySelector<HTMLTextAreaElement>('textarea[name="g-recaptcha-response"]')
              ?.value ?? null
          )?.slice(0, 30) ?? null,
        hcaptchaIframe: !!document.querySelector("iframe[src^='https://newassets.hcaptcha.com']"),
        turnstileInput: !!document.querySelector("input[name='cf-turnstile-response']"),
        iconcaptcha: !!document.querySelector(".iconcaptcha-modal__body-checkmark"),
        invisibleShortlink: !!document.querySelector("#invisibleCaptchaShortlink"),
        grecaptchaExists: typeof w.grecaptcha !== "undefined",
        grecaptchaResponse: (() => {
          try {
            return w.grecaptcha?.getResponse()?.slice(0, 30) ?? "N/A";
          } catch (e) {
            return "ERR:" + (e as Error).message;
          }
        })(),
      };

      return {
        title: document.title,
        url: location.href,
        ext: ccState,
        forms,
        clickables,
        dataAttrs,
        jsVars,
        captcha,
        tpSnp2Attrs,
        tpSnp2Parent,
        popupBlocked,
        scripts,
      };
    })
    .catch((e: Error) => ({ error: e.message }));

  const sep = "═".repeat(50);
  console.log(`\n${sep}`);
  console.log(`HOP ${hop} — ${dump && "url" in dump ? dump.url : "?"}`);
  if ("error" in dump) {
    console.log(`  [eval error] ${dump.error}`);
    return;
  }
  console.log(`TITLE: ${dump.title}`);
  console.log(`EXT:   ${dump.ext ? JSON.stringify(dump.ext) : "❌ content script NOT running"}`);
  console.log(`\n── captcha state ──\n${JSON.stringify(dump.captcha, null, 2)}`);
  if (dump.forms.length) console.log(`\n── forms ──\n${JSON.stringify(dump.forms, null, 2)}`);
  else console.log("\n  (no forms)");
  if (dump.clickables.length)
    console.log(`\n── clickables ──\n${JSON.stringify(dump.clickables, null, 2)}`);
  if (dump.dataAttrs.length)
    console.log(`\n── data attrs ──\n${JSON.stringify(dump.dataAttrs, null, 2)}`);
  if (Object.keys(dump.jsVars).length)
    console.log(`\n── js globals ──\n${JSON.stringify(dump.jsVars, null, 2)}`);
  if (dump.tpSnp2Attrs)
    console.log(`\n── tp-snp2 attrs ──\n${JSON.stringify(dump.tpSnp2Attrs, null, 2)}`);
  if (dump.tpSnp2Parent)
    console.log(`\n── tp-snp2 parent ──\n${JSON.stringify(dump.tpSnp2Parent, null, 2)}`);
  if (dump.popupBlocked) console.log(`\n⚠️  POPUP BLOCKER FIRED on this page`);
  if (dump.scripts?.length) console.log(`\n── inline scripts ──\n${dump.scripts.join("\n---\n")}`);
  console.log(sep);
}

// ── diagnostics: verify extension actually loaded ───────────────────────────
{
  const diagPage = await ctx.newPage();
  try {
    await diagPage.goto("chrome://version", { waitUntil: "domcontentloaded", timeout: 5000 });
    const cmdLine = await diagPage.evaluate(
      () => document.getElementById("command_line")?.textContent ?? "N/A",
    );
    const hasLoadExt = cmdLine.includes("--load-extension");
    const hasDisableExt = cmdLine.includes("--disable-extensions");
    console.log(`[diag] --load-extension present : ${hasLoadExt}`);
    console.log(`[diag] --disable-extensions present : ${hasDisableExt}`);
    if (!hasLoadExt) console.log(`[diag] FULL CMD: ${cmdLine}`);
  } catch (e) {
    console.log(`[diag] chrome://version failed: ${(e as Error).message}`);
  }
  try {
    await diagPage.goto("chrome://extensions", { waitUntil: "domcontentloaded", timeout: 5000 });
    await diagPage.waitForTimeout(1500);
    const extCount = await diagPage.evaluate(() => {
      const mgr = document
        .querySelector("extensions-manager")
        ?.shadowRoot?.querySelector("extensions-item-list")?.shadowRoot;
      return mgr?.querySelectorAll("extensions-item").length ?? -1;
    });
    console.log(`[diag] extensions loaded: ${extCount}`);
  } catch (e) {
    console.log(`[diag] chrome://extensions failed: ${(e as Error).message}`);
  }
  await diagPage.close();
}
// ────────────────────────────────────────────────────────────────────────────

const page = await ctx.newPage();

// Capture extension console logs
page.on("console", (msg) => {
  const t = msg.text();
  if (t.startsWith("[CC]") || msg.type() === "error") {
    console.log(`  [page ${msg.type() === "error" ? "ERR" : "log"}] ${t}`);
  }
});

// Dump on every navigation
page.on("load", () => {
  dumpPage(page).catch((e: Error) => console.log(`  [dump error] ${e.message}`));
});

await page.goto(startUrl);

// Keep alive
await new Promise<void>((_, reject) => {
  process.on("SIGINT", () => reject(new Error("interrupted")));
}).catch(() => {
  console.log("\n[debug] bye\n");
  process.exit(0);
});
