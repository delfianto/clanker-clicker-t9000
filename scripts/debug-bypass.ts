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
const userDataDir = mkdtempSync(`${tmpdir()}/cc-debug-`);
let hopCount = 0;

console.log(`\n[debug] start : ${startUrl}`);
console.log(`[debug] ext   : ${extPath}`);
console.log(`\nSolve captchas manually in the browser window. Ctrl+C to quit.\n`);

const ctx = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  executablePath: "/usr/bin/google-chrome-stable",
  args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`, "--no-sandbox"],
});

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
      for (const key of ["tp", "rtg", "link", "url", "destination", "redirect", "goto"]) {
        if (win[key] !== undefined) jsVars[key] = String(win[key]).slice(0, 200);
      }

      return {
        title: document.title,
        url: location.href,
        forms,
        clickables,
        dataAttrs,
        jsVars,
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
  if (dump.forms.length) console.log(`\n── forms ──\n${JSON.stringify(dump.forms, null, 2)}`);
  else console.log("\n  (no forms)");
  if (dump.clickables.length)
    console.log(`\n── clickables ──\n${JSON.stringify(dump.clickables, null, 2)}`);
  if (dump.dataAttrs.length)
    console.log(`\n── data attrs ──\n${JSON.stringify(dump.dataAttrs, null, 2)}`);
  if (Object.keys(dump.jsVars).length)
    console.log(`\n── js globals ──\n${JSON.stringify(dump.jsVars, null, 2)}`);
  console.log(sep);
}

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
