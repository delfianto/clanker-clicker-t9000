import { afterEach, describe, expect, test } from "bun:test";
import { isVisible, qs, qsa, qsContains } from "../../src/content/engine/dom";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("qs / qsa", () => {
  test("qs returns the first match or null", () => {
    document.body.innerHTML = `<p class="a">1</p><p class="a">2</p>`;
    expect(qs<HTMLElement>(".a")?.textContent).toBe("1");
    expect(qs("#nope")).toBeNull();
  });

  test("qs returns null on an invalid selector instead of throwing", () => {
    expect(qs(":::bad:::")).toBeNull();
  });

  test("qsa returns all matches as an array", () => {
    document.body.innerHTML = `<p class="a">1</p><p class="a">2</p>`;
    expect(qsa(".a").length).toBe(2);
    expect(qsa(":::bad:::")).toEqual([]);
  });
});

describe("qsContains", () => {
  test("finds the element whose text contains the needle (case-insensitive)", () => {
    document.body.innerHTML = `<a class="b">Skip Ad</a><a class="b">CONTINUE here</a>`;
    expect(qsContains(".b", "continue")?.textContent).toBe("CONTINUE here");
    expect(qsContains(".b", "nope")).toBeNull();
  });
});

describe("isVisible", () => {
  test("returns false for elements with no layout box (happy-dom has no layout)", () => {
    document.body.innerHTML = `<div id="d">x</div>`;
    expect(isVisible(qs("#d")!)).toBe(false);
  });
});
