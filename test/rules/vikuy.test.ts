import { afterEach, describe, expect, test } from "bun:test";
import {
  installVikuyDownloadInterceptor,
  sweepVikuyDecoys,
} from "../../src/content/rules/shortlinks";

// vikuy.click shuffles its two "Server Download" buttons per request: one is the
// real same-origin serve_video.php file, the other an affiliate shortlink whose
// landing page auto-submits a form straight into Shopee. Both render identically
// (class "server real", "Download File" tag), so only the href tells them apart.
// The sweep must remove every off-domain button while keeping same-site ones —
// the user's "random ad redirect" was a coin-flip button order.
function page(...anchors: string[]): Document {
  return new DOMParser().parseFromString(
    `<!doctype html><body><div class="servers">${anchors.join("\n")}</div></body>`,
    "text/html",
  );
}

function serverBtn(href: string, source = "primary"): string {
  return `<a class="server real" data-kind="download" data-source="${source}" href="${href}">Server Download</a>`;
}

describe("sweepVikuyDecoys", () => {
  // Regression: the decoy's slot position rotates server-side, so the fixture
  // puts the ad button FIRST — a stable "first button is real" would not hold.
  test("removes the affiliate decoy and keeps the same-origin file link", () => {
    const doc = page(
      serverBtn("https://gotoserba.com/click/1", "alternative"),
      serverBtn("https://vikuy.click/serve_video.php?t=MTcwMjF8&dl=1"),
    );
    expect(sweepVikuyDecoys(doc, "vikuy.click")).toBe(1);
    const left = [...doc.querySelectorAll("a.server")].map((a) => a.getAttribute("href"));
    expect(left).toEqual(["https://vikuy.click/serve_video.php?t=MTcwMjF8&dl=1"]);
  });

  test("keeps buttons served by the site's subdomains", () => {
    const doc = page(serverBtn("https://cdn.vikuy.click/serve_video.php?t=x&dl=1"));
    expect(sweepVikuyDecoys(doc, "vikuy.click")).toBe(0);
  });

  test("a lookalike subdomain of the ad host is still a decoy", () => {
    const doc = page(serverBtn("https://vikuy.click.gotoserba.com/click/1"));
    expect(sweepVikuyDecoys(doc, "vikuy.click")).toBe(1);
  });

  test("non-http and empty hrefs count as decoys", () => {
    const doc = page(serverBtn("javascript:void(0)"), serverBtn(""));
    expect(sweepVikuyDecoys(doc, "vikuy.click")).toBe(2);
  });

  test("leaves anchors outside the download grid alone (back link, sponsored slot)", () => {
    const doc = new DOMParser().parseFromString(
      `<!doctype html><body>
        <a class="back" href="https://gotoserba.com/click/1">← Back to video</a>
        <a class="sponsored-download-link" data-kind="sponsored" href="https://gotoserba.com/click/2">ad</a>
      </body>`,
      "text/html",
    );
    expect(sweepVikuyDecoys(doc, "vikuy.click")).toBe(0);
    expect(doc.querySelectorAll("a").length).toBe(2);
  });
});

// The page's own download flow (hidden iframe + setTimeout(2500) cleanup) dies
// under timer boost — the crushed cleanup rips the iframe out before the
// request completes. The interceptor claims real-button clicks at the document
// capture phase so that flow never runs; these tests use the global happy-dom
// document because the capture/target phase ordering is what's under test.
describe("installVikuyDownloadInterceptor", () => {
  let unbind: (() => void) | null = null;
  afterEach(() => {
    unbind?.();
    unbind = null;
    document.body.innerHTML = "";
  });

  function button(href: string, source = "primary"): HTMLAnchorElement {
    const a = document.createElement("a");
    a.className = "server real";
    a.dataset["kind"] = "download";
    a.dataset["source"] = source;
    a.setAttribute("href", href);
    document.body.appendChild(a);
    return a;
  }

  function waitBox(): HTMLElement {
    const box = document.createElement("div");
    box.id = "waitBox";
    document.body.appendChild(box);
    return box;
  }

  test("claims a real-button click: hands the absolute href to go() and blocks the page handler", () => {
    const href = "https://vikuy.click/serve_video.php?t=MTYxMjB8&dl=1";
    const anchor = button(href);
    let pageHandlerRan = false;
    anchor.addEventListener("click", () => {
      pageHandlerRan = true;
    });
    const box = waitBox();
    const urls: string[] = [];
    unbind = installVikuyDownloadInterceptor(document, "vikuy.click", (u) => urls.push(u));

    anchor.click();

    // The absolute URL is what the top-window navigation needs.
    expect(urls).toEqual([href]);
    expect(pageHandlerRan).toBe(false);
    expect(box.textContent).toBe("Starting download…");
  });

  test("ignores decoy clicks — page handler still runs (though the sweep removes them)", () => {
    const anchor = button("https://gotoserba.com/click/1", "alternative");
    let pageHandlerRan = false;
    anchor.addEventListener("click", () => {
      pageHandlerRan = true;
    });
    waitBox();
    const urls: string[] = [];
    unbind = installVikuyDownloadInterceptor(document, "vikuy.click", (u) => urls.push(u));

    anchor.click();

    expect(urls).toEqual([]);
    expect(pageHandlerRan).toBe(true);
  });

  test("unbind restores the page's native flow", () => {
    const anchor = button("https://vikuy.click/serve_video.php?t=x&dl=1");
    let pageHandlerRan = false;
    anchor.addEventListener("click", () => {
      pageHandlerRan = true;
    });
    waitBox();
    const urls: string[] = [];
    const stop = installVikuyDownloadInterceptor(document, "vikuy.click", (u) => urls.push(u));
    stop();

    anchor.click();

    expect(urls).toEqual([]);
    expect(pageHandlerRan).toBe(true);
  });

  test("modified clicks (ctrl/cmd — open in new tab) pass through", () => {
    const anchor = button("https://vikuy.click/serve_video.php?t=x&dl=1");
    waitBox();
    const urls: string[] = [];
    unbind = installVikuyDownloadInterceptor(document, "vikuy.click", (u) => urls.push(u));

    anchor.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true }),
    );

    expect(urls).toEqual([]);
  });
});
