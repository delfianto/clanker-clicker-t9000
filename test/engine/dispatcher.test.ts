import { describe, expect, test } from "bun:test";
import { matchRule, runRule } from "../../src/content/engine/dispatcher";
import { getAllRules } from "../../src/content/rules/index";
import { DEFAULT_SETTINGS } from "../../src/settings/schema";
import type { CCConfig } from "../../src/types/global";
import type { Rule } from "../../src/types/rules";

const r = (over: Partial<Rule> & { id: string; match: string }): Rule => ({
  runAt: "start",
  actions: [],
  ...over,
});

describe("matchRule", () => {
  test("matches on hostname regex, else undefined", () => {
    const rules = [r({ id: "a", match: "^foo\\.com$" })];
    expect(matchRule(rules, "foo.com", "/")?.id).toBe("a");
    expect(matchRule(rules, "bar.com", "/")).toBeUndefined();
  });

  test("is case-insensitive on hostname", () => {
    const rules = [r({ id: "a", match: "^foo\\.com$" })];
    expect(matchRule(rules, "FOO.com", "/")?.id).toBe("a");
  });

  test("exclude skips an otherwise-matching rule", () => {
    const rules = [r({ id: "a", match: "\\.com$", exclude: "^evil\\.com$" })];
    expect(matchRule(rules, "good.com", "/")?.id).toBe("a");
    expect(matchRule(rules, "evil.com", "/")).toBeUndefined();
  });

  test("pathMatch gates on pathname", () => {
    const rules = [r({ id: "a", match: "^g\\.com$", pathMatch: "^/url$" })];
    expect(matchRule(rules, "g.com", "/url")?.id).toBe("a");
    expect(matchRule(rules, "g.com", "/search")).toBeUndefined();
  });

  test("first match wins (array order)", () => {
    const rules = [r({ id: "broad", match: "\\.com$" }), r({ id: "specific", match: "^x\\.com$" })];
    expect(matchRule(rules, "x.com", "/")?.id).toBe("broad");
  });

  test("empty rule list -> undefined", () => {
    expect(matchRule([], "anything.com", "/")).toBeUndefined();
  });
});

describe("getAllRules priority ordering", () => {
  const all = getAllRules();

  test("is sorted by priority descending", () => {
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1]!.priority ?? 0).toBeGreaterThanOrEqual(all[i]!.priority ?? 0);
    }
  });

  test("googleRedirect (priority 10) sorts to the front", () => {
    expect(all[0]!.id).toBe("google-url-redirect");
  });

  test("google.com/url resolves to the google rule despite array position", () => {
    expect(matchRule(all, "google.com", "/url")?.id).toBe("google-url-redirect");
  });
});

describe("runRule", () => {
  const cfg: CCConfig = { settings: DEFAULT_SETTINGS, timestamp: 0 };
  const flagRule = (ran: { value: boolean }): Rule => ({
    id: "t",
    match: ".*",
    runAt: "start",
    actions: [
      {
        type: "run",
        run: () => {
          ran.value = true;
        },
      },
    ],
  });
  const tick = () => new Promise((r) => setTimeout(r, 15));

  test("executes a start rule's actions", async () => {
    window.happyDOM.setURL("https://site.test/");
    document.title = "Normal page";
    const ran = { value: false };
    runRule(flagRule(ran), cfg);
    await tick();
    expect(ran.value).toBe(true);
  });

  test("skips execution on a Cloudflare interstitial (Wave 2 guard)", async () => {
    window.happyDOM.setURL("https://site.test/");
    document.title = "Just a moment...";
    const ran = { value: false };
    runRule(flagRule(ran), cfg);
    await tick();
    expect(ran.value).toBe(false);
    document.title = "";
  });
});
