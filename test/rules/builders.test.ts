import { describe, expect, test } from "bun:test";
import {
  clickAfter,
  exact,
  formSubmitThenClick,
  hosts,
  paramRedirect,
  redirectHref,
  waitRedirect,
} from "../../src/content/rules/builders";

describe("exact / hosts", () => {
  test("exact anchors and escapes dots", () => {
    expect(exact("8tm.net")).toBe("^8tm\\.net$");
  });

  test("hosts anchors the alternation and escapes dots", () => {
    expect(hosts("a.com", "b.io", "c.co.uk")).toBe("^(a\\.com|b\\.io|c\\.co\\.uk)$");
  });

  test("exact matches only the exact host (no substring, no subdomain)", () => {
    const re = new RegExp(exact("ez4mods.com"), "i");
    expect(re.test("ez4mods.com")).toBe(true);
    expect(re.test("notez4mods.com")).toBe(false);
    expect(re.test("ez4mods.com.evil.test")).toBe(false);
    expect(re.test("sub.ez4mods.com")).toBe(false);
  });

  test("hosts matches any listed host exactly", () => {
    const re = new RegExp(hosts("a.com", "b.io"), "i");
    expect(re.test("a.com")).toBe(true);
    expect(re.test("b.io")).toBe(true);
    expect(re.test("c.com")).toBe(false);
  });
});

describe("rule builders", () => {
  test("paramRedirect shape + id + default decode", () => {
    expect(paramRedirect("x.com", "u", "base64")).toMatchObject({
      id: "x.com-u",
      match: "^x\\.com$",
      runAt: "start",
      actions: [{ type: "redirect-from-param", param: "u", decode: "base64" }],
    });
    expect(paramRedirect("x.com", "u").actions[0]).toMatchObject({ decode: "none" });
  });

  test("waitRedirect reuses the selector for wait + redirect, runs at loaded", () => {
    const rule = waitRedirect("x.com", "a.go");
    expect(rule.runAt).toBe("loaded");
    expect(rule.actions[0]).toMatchObject({
      type: "wait-element",
      selector: "a.go",
      steps: [{ type: "redirect-from-href", selector: "a.go" }],
    });
  });

  test("redirectHref", () => {
    expect(redirectHref("x.com", ".skip").actions[0]).toMatchObject({
      type: "redirect-from-href",
      selector: ".skip",
    });
  });

  test("clickAfter", () => {
    expect(clickAfter("x.com", "#b", 2000).actions[0]).toMatchObject({
      type: "click",
      selector: "#b",
      delay: 2000,
    });
  });

  test("formSubmitThenClick builds submit + follow-up click", () => {
    const rule = formSubmitThenClick("form-x", hosts("a.com"), "tp");
    expect(rule.id).toBe("form-x");
    expect(rule.match).toBe("^(a\\.com)$");
    expect(rule.actions).toEqual([
      { type: "submit", selector: "form[name='tp']", delay: 3000 },
      { type: "click", selector: "#btn6", delay: 4000 },
    ]);
  });

  test("formSubmitThenClick accepts a custom follow-up selector", () => {
    const rule = formSubmitThenClick("form-y", hosts("a.com"), "rtg", "#go");
    expect(rule.actions[1]).toMatchObject({ type: "click", selector: "#go" });
  });
});
