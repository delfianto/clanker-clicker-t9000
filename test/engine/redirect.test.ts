import { describe, expect, test } from "bun:test";
import {
  decode,
  extractFromOnclick,
  extractFromParam,
  extractFromPath,
} from "../../src/content/engine/redirect";

describe("decode", () => {
  test("none returns input unchanged (and is the default)", () => {
    expect(decode("abc", "none")).toBe("abc");
    expect(decode("abc")).toBe("abc");
  });
  test("uri", () => {
    expect(decode("a%20b", "uri")).toBe("a b");
    expect(decode(encodeURIComponent("https://d.com/x?y=1"), "uri")).toBe("https://d.com/x?y=1");
  });
  test("base64 / x2 / x3", () => {
    expect(decode(btoa("hi"), "base64")).toBe("hi");
    expect(decode(btoa(btoa("hi")), "base64x2")).toBe("hi");
    expect(decode(btoa(btoa(btoa("hi"))), "base64x3")).toBe("hi");
  });
  test("rot13 is its own inverse, and a known vector", () => {
    expect(decode("uryyb", "rot13")).toBe("hello");
    expect(decode(decode("Hello123", "rot13")!, "rot13")).toBe("Hello123");
  });
  test("invalid base64 -> null (does not throw)", () => {
    expect(decode("@@not base64@@", "base64")).toBeNull();
  });
});

describe("extractFromParam", () => {
  test("reads a query param", () => {
    window.happyDOM.setURL("https://s.test/?u=hello&x=1");
    expect(extractFromParam("u", "none")).toBe("hello");
  });
  test("decodes the param value", () => {
    window.happyDOM.setURL("https://s.test/?u=" + encodeURIComponent("https://d.com/x"));
    expect(extractFromParam("u", "uri")).toBe("https://d.com/x");
  });
  test("missing param -> null", () => {
    window.happyDOM.setURL("https://s.test/?a=1");
    expect(extractFromParam("u", "none")).toBeNull();
  });
  test("reads from the hash fragment when useHash", () => {
    window.happyDOM.setURL("https://s.test/#u=" + encodeURIComponent("https://d.com"));
    expect(extractFromParam("u", "uri", true)).toBe("https://d.com");
  });
});

describe("extractFromPath", () => {
  test("captures group 1 from pathname and decodes", () => {
    window.happyDOM.setURL("https://s.test/goto/" + btoa("https://d.com"));
    expect(extractFromPath("/goto/([^/]+)$", "base64")).toBe("https://d.com");
  });
  test("no match -> null", () => {
    window.happyDOM.setURL("https://s.test/elsewhere");
    expect(extractFromPath("/goto/([^/]+)$", "none")).toBeNull();
  });
});

describe("extractFromOnclick", () => {
  const pattern = "window\\.open\\(['\"]([^'\"]+)['\"]";
  test("extracts the url from a window.open onclick attribute", () => {
    const el = document.createElement("a");
    el.setAttribute("onclick", "window.open('https://dest.com/x', '_blank')");
    expect(extractFromOnclick(el, pattern)).toBe("https://dest.com/x");
  });
  test("no match -> null", () => {
    const el = document.createElement("a");
    el.setAttribute("onclick", "doSomethingElse()");
    expect(extractFromOnclick(el, pattern)).toBeNull();
  });
});
