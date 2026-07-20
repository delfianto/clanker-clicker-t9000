import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { runActions } from "../../src/content/engine/actions";

const sig = () => new AbortController().signal;
const goto = (url: string) => window.happyDOM.setURL(url);

let assignSpy: ReturnType<typeof spyOn> | null = null;
function navSpy() {
  assignSpy = spyOn(location, "assign").mockImplementation(() => {});
  return assignSpy;
}
afterEach(() => {
  assignSpy?.mockRestore();
  assignSpy = null;
  document.body.innerHTML = "";
});

describe("click / submit", () => {
  test("click dispatches a click and strips disabled/target", async () => {
    goto("https://site.test/");
    const btn = document.createElement("button");
    btn.id = "b";
    btn.setAttribute("disabled", "");
    btn.setAttribute("target", "_blank");
    let clicks = 0;
    btn.addEventListener("click", () => clicks++);
    document.body.appendChild(btn);

    await runActions([{ type: "click", selector: "#b" }], sig());

    expect(clicks).toBe(1);
    expect(btn.hasAttribute("disabled")).toBe(false);
    expect(btn.hasAttribute("target")).toBe(false);
  });

  test("click with wait:false no-ops when the selector is absent", async () => {
    goto("https://site.test/");
    // No element in the DOM at all. With the default (wait: true) this would
    // hold a MutationObserver for 30s and reject with TimeoutError.
    const started = Date.now();
    await runActions([{ type: "click", selector: "#gone", wait: false }], sig());
    expect(Date.now() - started).toBeLessThan(1000);
  });

  test("click with wait:false still clicks an element that is already present", async () => {
    goto("https://site.test/");
    const btn = document.createElement("button");
    btn.id = "b";
    let clicks = 0;
    btn.addEventListener("click", () => clicks++);
    document.body.appendChild(btn);

    await runActions([{ type: "click", selector: "#b", wait: false }], sig());

    expect(clicks).toBe(1);
  });

  test("click defaults to waiting for an element that appears later", async () => {
    goto("https://site.test/");
    const btn = document.createElement("button");
    btn.id = "late";
    let clicks = 0;
    btn.addEventListener("click", () => clicks++);

    // waitForElement installs its observer synchronously, so appending right
    // after the call exercises the observer path rather than the qs fast-path.
    const pending = runActions([{ type: "click", selector: "#late" }], sig());
    document.body.appendChild(btn);
    await pending;

    expect(clicks).toBe(1);
  });

  test("submit calls form.submit()", async () => {
    goto("https://site.test/");
    const submit = spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => {});
    const form = document.createElement("form");
    form.id = "f";
    document.body.appendChild(form);

    await runActions([{ type: "submit", selector: "#f" }], sig());

    expect(submit).toHaveBeenCalled();
    submit.mockRestore();
  });
});

describe("redirect actions", () => {
  test("redirect-from-href navigates to the anchor's resolved href", async () => {
    goto("https://site.test/");
    const a = document.createElement("a");
    a.id = "go";
    a.href = "https://dest.example/p";
    document.body.appendChild(a);
    const assign = navSpy();

    await runActions([{ type: "redirect-from-href", selector: "#go" }], sig());

    expect(assign).toHaveBeenCalledWith("https://dest.example/p");
  });

  test("redirect-from-attr uses the resolved property on an anchor", async () => {
    goto("https://site.test/");
    const a = document.createElement("a");
    a.id = "np";
    a.setAttribute("href", "https://dest.example/q");
    document.body.appendChild(a);
    const assign = navSpy();

    await runActions(
      [{ type: "redirect-from-attr", selector: "#np", attr: "href", wait: false }],
      sig(),
    );

    expect(assign).toHaveBeenCalledWith("https://dest.example/q");
  });

  test("redirect-from-attr falls back to getAttribute on a non-anchor", async () => {
    goto("https://site.test/");
    const div = document.createElement("div");
    div.className = "input";
    div.setAttribute("href", "https://dest.example/r");
    document.body.appendChild(div);
    const assign = navSpy();

    await runActions(
      [{ type: "redirect-from-attr", selector: ".input", attr: "href", wait: false }],
      sig(),
    );

    expect(assign).toHaveBeenCalledWith("https://dest.example/r");
  });

  test("redirect-from-attr wait:false + missing element -> no navigation", async () => {
    goto("https://site.test/");
    const assign = navSpy();
    await runActions(
      [{ type: "redirect-from-attr", selector: "#nope", attr: "href", wait: false }],
      sig(),
    );
    expect(assign).not.toHaveBeenCalled();
  });

  test("redirect-from-onclick extracts the url and navigates", async () => {
    goto("https://site.test/");
    const a = document.createElement("a");
    a.id = "oc";
    a.setAttribute("onclick", "window.open('https://dest.example/o','_blank')");
    document.body.appendChild(a);
    const assign = navSpy();

    await runActions(
      [
        {
          type: "redirect-from-onclick",
          selector: "#oc",
          extractPattern: "window\\.open\\(['\"]([^'\"]+)['\"]",
        },
      ],
      sig(),
    );

    expect(assign).toHaveBeenCalledWith("https://dest.example/o");
  });

  test("redirect-from-param extracts + decodes + navigates", async () => {
    goto("https://site.test/?u=" + encodeURIComponent("https://dest.example/z"));
    const assign = navSpy();
    await runActions([{ type: "redirect-from-param", param: "u", decode: "uri" }], sig());
    expect(assign).toHaveBeenCalledWith("https://dest.example/z");
  });

  test("redirect-from-path captures + decodes + navigates", async () => {
    goto("https://site.test/goto/" + btoa("https://dest.example/p"));
    const assign = navSpy();
    await runActions(
      [{ type: "redirect-from-path", pattern: "/goto/([^/]+)$", decode: "base64" }],
      sig(),
    );
    expect(assign).toHaveBeenCalledWith("https://dest.example/p");
  });

  test("redirect-template resolves a relative template to absolute (pixeldrain bug fix)", async () => {
    goto("https://pixeldrain.com/u/abc123");
    const assign = navSpy();
    await runActions(
      [{ type: "redirect-template", from: "^/u/(.+)$", to: "/api/file/$1?download" }],
      sig(),
    );
    expect(assign).toHaveBeenCalledWith("https://pixeldrain.com/api/file/abc123?download");
  });

  test("rewrite-url replaces within the current href", async () => {
    goto("https://site.test/ad/page");
    const assign = navSpy();
    await runActions([{ type: "rewrite-url", find: "/ad/", replace: "/" }], sig());
    expect(assign).toHaveBeenCalledWith("https://site.test/page");
  });

  test("rewrite-url is a no-op (no navigation) when 'find' is absent — prevents reload loops", async () => {
    goto("https://site.test/clean");
    const assign = navSpy();
    await runActions([{ type: "rewrite-url", find: "/ad/", replace: "/" }], sig());
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("remove-attr / run / wait-element / abort", () => {
  test("remove-attr strips attributes from every match", async () => {
    goto("https://site.test/");
    document.body.innerHTML = `<a class="x" onclick="y()" target="_blank">a</a><a class="x" onclick="z()">b</a>`;
    await runActions(
      [{ type: "remove-attr", selector: ".x", attrs: ["onclick", "target"] }],
      sig(),
    );
    for (const el of document.querySelectorAll(".x")) {
      expect(el.hasAttribute("onclick")).toBe(false);
      expect(el.hasAttribute("target")).toBe(false);
    }
  });

  test("run receives a working ctx", async () => {
    goto("https://site.test/?s=" + encodeURIComponent("https://dest.example/s"));
    const assign = navSpy();
    await runActions(
      [
        {
          type: "run",
          run: ({ params, navigateTo }) => {
            const s = params.get("s");
            if (s) navigateTo(s);
          },
        },
      ],
      sig(),
    );
    expect(assign).toHaveBeenCalledWith("https://dest.example/s");
  });

  test("wait-element runs its steps once the element is present", async () => {
    goto("https://site.test/");
    const a = document.createElement("a");
    a.id = "go";
    a.href = "https://dest.example/w";
    document.body.appendChild(a);
    const assign = navSpy();

    await runActions(
      [
        {
          type: "wait-element",
          selector: "#go",
          steps: [{ type: "redirect-from-href", selector: "#go" }],
        },
      ],
      sig(),
    );

    expect(assign).toHaveBeenCalledWith("https://dest.example/w");
  });

  test("an already-aborted signal short-circuits the action list", async () => {
    goto("https://site.test/");
    const a = document.createElement("a");
    a.id = "go";
    a.href = "https://dest.example";
    document.body.appendChild(a);
    const ctrl = new AbortController();
    ctrl.abort();
    const assign = navSpy();

    await runActions([{ type: "redirect-from-href", selector: "#go" }], ctrl.signal);

    expect(assign).not.toHaveBeenCalled();
  });
});
