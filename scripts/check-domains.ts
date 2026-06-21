#!/usr/bin/env bun
/**
 * Domain liveness checker.
 * Extracts every hostname from rule files and checks DNS + HTTP HEAD.
 * Usage: bun scripts/check-domains.ts
 *
 * Exit codes: 0 = all alive, 1 = dead/broken domains found.
 */

import { resolve as dnsResolve } from "node:dns/promises";
import { shortlinkRules } from "../src/content/rules/shortlinks";
import { wpsafeRules } from "../src/content/rules/wpsafe";
import { downloadRules } from "../src/content/rules/downloads";
import { googleRedirectRule } from "../src/content/rules/custom/google-redirect";
import { GOOGLE_REDIRECT_BLOCKED_DOMAINS } from "../src/content/rules/custom/google-redirect";

// ── Domain extractor ──────────────────────────────────────────────────────────
// Converts a rule `match` regex string to a list of candidate hostnames.
// Handles: anchors, \\. escapes, (a|b) alternation groups, (www.)? prefixes.

function domainsFromPattern(raw: string): string[] {
  const results = new Set<string>();

  function expand(p: string): void {
    p = p
      .replace(/^\^/, "")
      .replace(/\$$/, "")
      .replace(/\\\./g, ".")
      .replace(/^\(\^\|\\?\.?\)\??/g, "") // (^|\.)? and variants
      .replace(/^\(www\.\)\?/g, "")
      .trim();

    // Expand first (a|b) group recursively
    const grp = /^([^(]*)\(([^)]+)\)(.*)$/.exec(p);
    if (grp) {
      const [, before, alts, after] = grp;
      for (const alt of alts.split("|")) expand(before + alt + after);
      return;
    }

    if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,10}$/i.test(p)) {
      results.add(p.toLowerCase());
    }
  }

  // Split on top-level | (depth-aware so groups are preserved)
  const parts: string[] = [];
  let depth = 0,
    buf = "";
  for (const ch of raw) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "|" && depth === 0) {
      parts.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  parts.push(buf);

  for (const part of parts) expand(part.trim());
  return [...results].sort();
}

// ── Collect all domains ───────────────────────────────────────────────────────

// Known-alive major platforms we don't need to check
const SKIP = new Set([
  "facebook.com",
  "instagram.com",
  "t.me",
  "tiktok.com",
  "vk.com",
  "google.com",
  "drive.google.com",
  "mediafire.com",
  "render-state.to", // meta-platform, always alive
]);

const allRules = [googleRedirectRule, ...shortlinkRules, ...wpsafeRules, ...downloadRules];
const ruleDomainsSet = new Set<string>();

for (const rule of allRules) {
  for (const d of domainsFromPattern(rule.match)) {
    if (!SKIP.has(d)) ruleDomainsSet.add(d);
  }
}

// Also check the google-redirect blocklist (these might go dead and clutter the list)
for (const d of GOOGLE_REDIRECT_BLOCKED_DOMAINS) {
  ruleDomainsSet.add(d);
}

const ALL_DOMAINS = [...ruleDomainsSet].sort();

// ── Liveness check ───────────────────────────────────────────────────────────

const CONCURRENCY = 20;
const HTTP_TIMEOUT_MS = 8_000;

type Status = "alive" | "cloudflare" | "broken" | "dead-http" | "dead-dns";

interface Result {
  domain: string;
  status: Status;
  code?: number;
  detail?: string;
}

async function checkDomain(domain: string): Promise<Result> {
  // 1. DNS check — fastest filter
  try {
    await dnsResolve(domain, "A").catch(() => dnsResolve(domain, "AAAA"));
  } catch {
    return { domain, status: "dead-dns" };
  }

  // 2. HTTP HEAD
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(`https://${domain}`, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; domain-check/1.0)" },
    });
    clearTimeout(timer);
    const code = res.status;
    // 403 from Cloudflare challenge = site alive but blocking bots
    if (code === 403 || code === 429) return { domain, status: "cloudflare", code };
    if (code >= 500) return { domain, status: "broken", code };
    if (code >= 400) return { domain, status: "dead-http", code };
    return { domain, status: "alive", code };
  } catch (e) {
    clearTimeout(timer);
    const msg = String(e);
    if (msg.includes("abort")) return { domain, status: "dead-http", detail: "timeout" };
    return { domain, status: "dead-http", detail: msg.slice(0, 80) };
  }
}

// Run in batches
const results: Result[] = [];
console.log(`Checking ${ALL_DOMAINS.length} domains (batch size ${CONCURRENCY})...\n`);

for (let i = 0; i < ALL_DOMAINS.length; i += CONCURRENCY) {
  const batch = ALL_DOMAINS.slice(i, i + CONCURRENCY);
  const batchResults = await Promise.all(batch.map(checkDomain));
  results.push(...batchResults);
  process.stdout.write(
    `  [${Math.min(i + CONCURRENCY, ALL_DOMAINS.length)}/${ALL_DOMAINS.length}]\r`,
  );
}

// ── Report ────────────────────────────────────────────────────────────────────

const C = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

const byStatus = {
  alive: results.filter((r) => r.status === "alive"),
  cloudflare: results.filter((r) => r.status === "cloudflare"),
  broken: results.filter((r) => r.status === "broken"),
  "dead-http": results.filter((r) => r.status === "dead-http"),
  "dead-dns": results.filter((r) => r.status === "dead-dns"),
};

console.log("\n" + "─".repeat(60));
console.log(`${C.bold}Domain Liveness Report${C.reset}`);
console.log("─".repeat(60));

if (byStatus.alive.length) {
  console.log(`\n${C.green}✓ Alive (${byStatus.alive.length})${C.reset}`);
  for (const r of byStatus.alive) console.log(`  ${C.dim}${r.domain} [${r.code}]${C.reset}`);
}

if (byStatus.cloudflare.length) {
  console.log(
    `\n${C.yellow}⚡ Cloudflare/bot-blocked — likely alive (${byStatus.cloudflare.length})${C.reset}`,
  );
  for (const r of byStatus.cloudflare) console.log(`  ${r.domain} [${r.code}]`);
}

if (byStatus.broken.length) {
  console.log(
    `\n${C.yellow}⚠ Server errors 5xx — check manually (${byStatus.broken.length})${C.reset}`,
  );
  for (const r of byStatus.broken) console.log(`  ${r.domain} [${r.code}]`);
}

if (byStatus["dead-http"].length) {
  console.log(
    `\n${C.red}✗ Dead — DNS resolves but HTTP fails (${byStatus["dead-http"].length})${C.reset}`,
  );
  for (const r of byStatus["dead-http"])
    console.log(`  ${r.domain}${r.detail ? ` (${r.detail})` : r.code ? ` [${r.code}]` : ""}`);
}

if (byStatus["dead-dns"].length) {
  console.log(`\n${C.red}✗ Dead — no DNS record (${byStatus["dead-dns"].length})${C.reset}`);
  for (const r of byStatus["dead-dns"]) console.log(`  ${r.domain}`);
}

console.log("\n" + "─".repeat(60));
const dead = byStatus["dead-dns"].length + byStatus["dead-http"].length;
console.log(
  `Total: ${results.length} | ${C.green}alive: ${byStatus.alive.length}${C.reset} | ` +
    `${C.yellow}cf/broken: ${byStatus.cloudflare.length + byStatus.broken.length}${C.reset} | ` +
    `${C.red}dead: ${dead}${C.reset}`,
);

process.exit(dead > 0 ? 1 : 0);
