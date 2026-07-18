import { describe, expect, test } from "bun:test";
import { matchRule } from "../../src/content/engine/dispatcher";
import { getAllRules } from "../../src/content/rules/index";
import { DEFAULT_SETTINGS } from "../../src/settings/schema";
import type { RuleAction } from "../../src/types/rules";

const rules = getAllRules();
const DECODES = new Set(["base64", "base64x2", "base64x3", "uri", "rot13", "none"]);
const SETTINGS_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));

function expectSelector(sel: string, where: string): void {
  expect(typeof sel, `${where}: selector is a string`).toBe("string");
  expect(sel.length, `${where}: selector non-empty`).toBeGreaterThan(0);
}

function expectSteps(steps: RuleAction[], where: string): void {
  expect(Array.isArray(steps), `${where}: steps is array`).toBe(true);
  expect(steps.length, `${where}: steps non-empty`).toBeGreaterThan(0);
  steps.forEach((s, i) => validateAction(s, `${where}.steps[${i}]`));
}

function validateAction(a: RuleAction, where: string): void {
  switch (a.type) {
    case "click":
    case "submit":
    case "redirect-from-href":
      expectSelector(a.selector, where);
      break;
    case "redirect-from-attr":
      expectSelector(a.selector, where);
      expect(a.attr.length, `${where}: attr non-empty`).toBeGreaterThan(0);
      break;
    case "redirect-from-onclick":
      expectSelector(a.selector, where);
      expect(() => new RegExp(a.extractPattern), `${where}: extractPattern compiles`).not.toThrow();
      break;
    case "redirect-from-param":
      expect(a.param.length, `${where}: param non-empty`).toBeGreaterThan(0);
      if (a.decode) expect(DECODES.has(a.decode), `${where}: valid decode`).toBe(true);
      break;
    case "redirect-from-path":
      expect(() => new RegExp(a.pattern), `${where}: pattern compiles`).not.toThrow();
      if (a.decode) expect(DECODES.has(a.decode), `${where}: valid decode`).toBe(true);
      break;
    case "redirect-template":
      expect(() => new RegExp(a.from), `${where}: template from compiles`).not.toThrow();
      expect(a.to.length, `${where}: template to non-empty`).toBeGreaterThan(0);
      break;
    case "rewrite-url":
      expect(a.find.length, `${where}: rewrite find non-empty`).toBeGreaterThan(0);
      expect(typeof a.replace, `${where}: rewrite replace is string`).toBe("string");
      break;
    case "remove-attr":
      expectSelector(a.selector, where);
      expect(a.attrs.length, `${where}: attrs non-empty`).toBeGreaterThan(0);
      break;
    case "run":
      expect(typeof a.run, `${where}: run is function`).toBe("function");
      break;
    case "wait-element":
    case "wait-visibility":
      expectSelector(a.selector, where);
      expectSteps(a.steps, where);
      break;
    case "wait-captcha":
      expectSteps(a.steps, where);
      break;
  }
}

describe("rule set invariants", () => {
  test("rule set is non-empty", () => {
    expect(rules.length).toBeGreaterThan(0);
  });

  test("rule ids are unique", () => {
    const ids = rules.map((r) => r.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes, `duplicate ids: ${dupes.join(", ")}`).toEqual([]);
  });

  test("every match / exclude / pathMatch is a valid regex", () => {
    for (const r of rules) {
      expect(() => new RegExp(r.match), `${r.id}.match`).not.toThrow();
      if (r.exclude) expect(() => new RegExp(r.exclude), `${r.id}.exclude`).not.toThrow();
      if (r.pathMatch) expect(() => new RegExp(r.pathMatch), `${r.id}.pathMatch`).not.toThrow();
    }
  });

  test("runAt is 'start' or 'loaded'", () => {
    for (const r of rules) expect(["start", "loaded"], r.id).toContain(r.runAt);
  });

  test("requiresFeature (when set) is a real Settings key", () => {
    for (const r of rules) {
      if (r.requiresFeature) {
        expect(SETTINGS_KEYS.has(r.requiresFeature), `${r.id}: ${r.requiresFeature}`).toBe(true);
      }
    }
  });

  test("rules are sorted by priority (descending)", () => {
    for (let i = 1; i < rules.length; i++) {
      expect(rules[i - 1]!.priority ?? 0).toBeGreaterThanOrEqual(rules[i]!.priority ?? 0);
    }
  });

  test("every rule has at least one well-formed action", () => {
    for (const r of rules) {
      expect(r.actions.length, `${r.id}: has actions`).toBeGreaterThan(0);
      r.actions.forEach((a, i) => validateAction(a, `${r.id}.actions[${i}]`));
    }
  });
});

describe("host matching regression", () => {
  const strip = (h: string) => h.replace(/^www\./, "");
  const id = (host: string, path = "/") => matchRule(rules, strip(host), path)?.id;

  // [hostname, pathname, expected rule id | undefined]
  const cases: [string, string, string | undefined][] = [
    // builder-generated
    ["en.mrproblogger.com", "/p6D5dD", "mrproblogger"],
    ["8tm.net", "/", "8tm.net"],
    ["www.8tm.net", "/", "8tm.net"],
    ["render-state.to", "/", "render-state.to-link"],
    ["maloma3arbi.blogspot.com", "/", "maloma3arbi.blogspot.com-link"],
    ["other.blogspot.com", "/", undefined],
    ["t.me", "/", "t.me-url"],
    ["adtival.network", "/", "adtival.network-shortid"],
    ["sfl.gl", "/", undefined], // rebranded → linku.to (302); rule removed
    ["adfoc.us", "/", "adfoc.us"],
    ["linkspy.cc", "/", "linkspy.cc"],
    ["keeplinks.org", "/", "keeplinks.org"],
    ["cpmlink.net", "/", "cpmlink.net"],
    ["lanza.me", "/", "lanza.me"],
    ["linksly.co", "/", "linksly.co"],
    ["mohtawaa.com", "/", "mohtawaa.com"],
    ["imagebam.com", "/", "imagebam"],
    ["trans.firm.in", "/img-6a5abd3527919.html", "trans.firm.in"],
    // multi-host hosts() rules
    ["topshare.in", "/", "form-tp-pattern"],
    ["djssmusic.com", "/", "form-tp-pattern"],
    ["themezon.net", "/", "form-tp-snp2-pattern"],
    ["otowp.com", "/", "form-tp-snp2-pattern"],
    ["vi-music.app", "/", "form-tp-snp2-pattern"],
    ["bonloan.xyz", "/", "form-tp-snp2-pattern"],
    ["vahansamachar.com", "/", "form-rtg-pattern"],
    ["carjankaari.com", "/", "form-rtg-pattern"],
    ["askpaccosi.com", "/", "form-dsb-captcha"],
    ["fc.lc", "/", "fc-lc-family"],
    ["fc-lc.xyz", "/", "fc-lc-family"],
    ["thotpacks.xyz", "/", "fc-lc-family"],
    ["kongutoday.com", "/", "kongutoday-safe-b64"],
    ["hipsonyc.com", "/", "kongutoday-safe-b64"],
    ["passivecryptos.xyz", "/", "shortlink-form-continue"],
    ["surl.li", "/", "surl"],
    ["surl.gd", "/", "surl"],
    ["tii.la", "/", "tii-la-family"],
    ["iir.li", "/", "tii-la-family"],
    ["shrinkme.click", "/", "shrinkme-captcha"],
    ["shrinke.me", "/", "shrinkme-captcha"],
    ["paid4link.com", "/", "link-view-captcha-family"],
    ["oii.io", "/", "link-view-captcha-family"],
    ["tlin.me", "/", "link-view-captcha-family"],
    ["oke.io", "/", "link-view-captcha-family"],
    ["pahe.plus", "/", "link-view-captcha-family"],
    // wpsafe
    ["admediaflex.com", "/", "wpsafe-onclick"],
    ["7misr4day.com", "/", "wpsafe-href"],
    ["vertohub.space", "/", "wpsafe-window-open-onclick"],
    // run / converted-custom
    ["ouo.io", "/", "ouo"],
    ["ouo.press", "/", "ouo"],
    ["multiup.io", "/download/x", "multiup-io"],
    ["paycut.pro", "/ad/x", "paycut-path-strip"],
    ["google.com", "/url", "google-url-redirect"],
    // downloads (matchRule ignores requiresFeature; gating is in main.ts)
    ["drive.google.com", "/file/d/x", "drive-google"],
    ["pixeldrain.com", "/u/abc", "pixeldrain"],
    ["mediafire.com", "/file/x", "mediafire"],
    ["turbobit.net", "/", "turbobit"],
    ["usersdrive.com", "/i79xonlemlbv.html", "usersdrive"],
    // pathMatch gating
    ["facebook.com", "/linkshim", "facebook-instagram-u"],
    ["facebook.com", "/", undefined],
    ["google.com", "/search", undefined],
    ["comohoy.com", "/", undefined],
    ["comohoy.com", "/view/out.html", "comohoy-url-b64"],
    // anchoring tightening — these must NOT match (were substring matches before)
    ["notez4mods.com", "/", undefined],
    ["ez4mods.com.evil.test", "/", undefined],
    ["foo.fc.lc", "/", undefined],
    // pruned dead-DNS hosts must no longer match
    ["ez4mods.com", "/", undefined],
    ["btcon.online", "/", undefined],
    ["blockjump.in", "/", undefined],
    ["the2.link", "/", undefined],
    ["nashib.xyz", "/", undefined],
    ["timbertales.xyz", "/", undefined],
    ["foodxor.com", "/", undefined],
    // unrelated host
    ["example.com", "/", undefined],
  ];

  for (const [host, path, expected] of cases) {
    test(`${host}${path} -> ${expected ?? "(no match)"}`, () => {
      expect(id(host, path)).toBe(expected);
    });
  }
});
