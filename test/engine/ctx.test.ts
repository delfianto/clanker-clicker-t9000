import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { makeCtx } from "../../src/content/engine/ctx";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("makeCtx", () => {
  test("exposes url + params parsed from the current location", () => {
    window.happyDOM.setURL("https://c.test/page?a=1&b=two");
    const ctx = makeCtx(new AbortController().signal);
    expect(ctx.url.hostname).toBe("c.test");
    expect(ctx.params.get("a")).toBe("1");
    expect(ctx.params.get("b")).toBe("two");
  });

  test("wires qs, decode and navigateTo", () => {
    window.happyDOM.setURL("https://c.test/");
    document.body.innerHTML = `<div id="z"></div>`;
    const ctx = makeCtx(new AbortController().signal);

    expect(ctx.qs<HTMLElement>("#z")?.id).toBe("z");
    expect(ctx.qs("#missing")).toBeNull();
    expect(ctx.decode(btoa("hi"), "base64")).toBe("hi");

    const assign = spyOn(location, "assign").mockImplementation(() => {});
    ctx.navigateTo("https://dest.example");
    expect(assign).toHaveBeenCalledWith("https://dest.example");
    assign.mockRestore();
  });

  test("click waits for the element then dispatches a click", async () => {
    window.happyDOM.setURL("https://c.test/");
    const b = document.createElement("button");
    b.id = "cb";
    let clicks = 0;
    b.addEventListener("click", () => clicks++);
    document.body.appendChild(b);

    const ctx = makeCtx(new AbortController().signal);
    await ctx.click("#cb");

    expect(clicks).toBe(1);
  });
});
