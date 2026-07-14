import { describe, expect, test } from "bun:test";
import { imagebamCookieNames } from "../../src/content/rules/shortlinks";

// The real interstitial's inline handler, trimmed to the line that matters. ImageBam
// emits `sfw_inter` or `nsfw_inter` depending on the image's content rating; the
// server only skips the gate for the name matching that rating, so reading the wrong
// one re-serves `#continue` and the self-referential /view/ navigation loops.
// Parsed via DOMParser so the document is inert — no script fetch/execution.
function page(...scripts: string[]): Document {
  const body = scripts.join("\n");
  return new DOMParser().parseFromString(`<!doctype html><body>${body}`, "text/html");
}

function handler(cookieName: string): string {
  return `<script>
    $('[data-shown="inter"]').click(function () {
      var d = new Date();
      d.setTime(d.getTime() + 6 * 60 * 60 * 1000);
      var expires = "; expires=" + d.toUTCString();
      document.cookie = "${cookieName}=1" + expires + "; path=/";
    });
  </script>`;
}

describe("imagebamCookieNames", () => {
  test("reads nsfw_inter from an adult-rated /view/ page", () => {
    expect(imagebamCookieNames(page(handler("nsfw_inter")))).toEqual(["nsfw_inter"]);
  });

  // Regression: the previous rule hardcoded `nsfw_inter`, which cleared adult-rated
  // images but looped forever on safe-rated ones (ME18OIC9 and friends).
  test("reads sfw_inter from a safe-rated /view/ page", () => {
    expect(imagebamCookieNames(page(handler("sfw_inter")))).toEqual(["sfw_inter"]);
  });

  test("ignores external scripts and unrelated cookie writes", () => {
    const doc = page(
      `<script src="https://display.digitalclickstime.com/fpa.go"></script>`,
      `<script>document.cookie = "XSRF-TOKEN=abc123; path=/";</script>`,
      handler("sfw_inter"),
    );
    expect(imagebamCookieNames(doc)).toEqual(["sfw_inter"]);
  });

  test("falls back to both names when the handler is gone", () => {
    expect(imagebamCookieNames(page()).toSorted()).toEqual(["nsfw_inter", "sfw_inter"]);
  });
});
