import { test, expect, spyOn } from "bun:test";
import { decode, navigateTo } from "../src/content/engine/redirect";

test("happy-dom harness is registered", () => {
  expect(typeof document).toBe("object");
  expect(typeof window).toBe("object");
  expect(typeof MutationObserver).toBe("function");
});

test("decode works (pure logic, no DOM)", () => {
  expect(decode(btoa("https://x.com"), "base64")).toBe("https://x.com");
  expect(decode("https%3A%2F%2Fx.com", "uri")).toBe("https://x.com");
});

test("navigateTo: assign for http(s), guard otherwise", () => {
  const assign = spyOn(location, "assign").mockImplementation(() => {});
  navigateTo("https://dest.example/path");
  expect(assign).toHaveBeenCalledWith("https://dest.example/path");
  assign.mockClear();
  navigateTo("/relative");
  navigateTo("javascript:alert(1)");
  expect(assign).not.toHaveBeenCalled();
  assign.mockRestore();
});

test("can drive location.search/pathname for extract tests", () => {
  window.happyDOM.setURL("https://site.test/some/path?a=hello&b=2#frag");
  expect(location.pathname).toBe("/some/path");
  expect(location.search).toBe("?a=hello&b=2");
  expect(new URLSearchParams(location.search).get("a")).toBe("hello");
});
