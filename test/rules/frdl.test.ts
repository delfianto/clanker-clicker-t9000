import { afterEach, describe, expect, test } from "bun:test";
import { sleep } from "../../src/content/engine/wait";
import { getAllRules } from "../../src/content/rules";
import type { Rule, RuleAction, RuleCtx } from "../../src/types/rules";

// The frdl rule rides the page's own countdown loop: each native tick reads the
// current text of `.seconds` and writes back one less, so writing "1" makes the
// next tick hit 0 and reveal "Start Download NOW". These tests simulate the
// download page's markup and the jQuery `.show()` style flip that reveals
// #countdown (that display flip is the observer's trigger — the element exists
// hidden in the static HTML, so there is no childList event to key off).
const rule = (): Rule => getAllRules().find((r) => r.id === "frdl")!;

function runAction(): Extract<RuleAction, { type: "run" }> {
  const [action] = rule().actions;
  return action as Extract<RuleAction, { type: "run" }>;
}

function stubCtx(signal: AbortSignal): RuleCtx {
  return {
    url: new URL("https://frdl.hk/2ujpwayvi8pz/ALIKA.zip"),
    params: new URLSearchParams(),
    signal,
    navigateTo: () => {},
    waitForElement: () => Promise.resolve(document.body),
    click: () => Promise.resolve(),
    decode: () => null,
    qs: <T extends Element>(selector: string) => document.querySelector<T>(selector),
  };
}

function loadCountdown(seconds: string): HTMLElement {
  document.body.innerHTML = `<div id="countdown" style="display: none"><span class="seconds">${seconds}</span> Seconds</div>`;
  return document.getElementById("countdown")!;
}

function secondsText(countdown: HTMLElement): string | null {
  return countdown.querySelector<HTMLElement>(".seconds")?.textContent ?? null;
}

// MutationObserver delivery is async; this comfortably covers a microtask flush.
const SETTLE_MS = 20;

// Observers watch the shared global documentElement and live until their signal
// aborts (on a real page: pagehide). Tests must abort them explicitly or an
// earlier test's observer keeps rewriting later tests' counters.
let active: AbortController[] = [];

function makeCtx(): { ctx: RuleCtx; ctrl: AbortController } {
  const ctrl = new AbortController();
  active.push(ctrl);
  return { ctx: stubCtx(ctrl.signal), ctrl };
}

afterEach(() => {
  for (const ctrl of active) ctrl.abort();
  active = [];
  document.body.innerHTML = "";
});

describe("frdl counter fast-forward", () => {
  test("writes '1' when the countdown is revealed", async () => {
    const countdown = loadCountdown("60");
    const { ctx } = makeCtx();
    runAction().run(ctx);

    countdown.style.display = "block";
    await sleep(SETTLE_MS);
    expect(secondsText(countdown)).toBe("1");
  });

  test("leaves the counter alone while the countdown stays hidden", async () => {
    const countdown = loadCountdown("60");
    const { ctx } = makeCtx();
    runAction().run(ctx);

    await sleep(SETTLE_MS);
    expect(secondsText(countdown)).toBe("60");
  });

  test("stops watching once the rule's signal aborts", async () => {
    const countdown = loadCountdown("60");
    const { ctx, ctrl } = makeCtx();
    runAction().run(ctx);
    ctrl.abort();

    countdown.style.display = "block";
    await sleep(SETTLE_MS);
    expect(secondsText(countdown)).toBe("60");
  });

  test("re-fast-forwards a counter the page re-shows with a fresh value", async () => {
    const countdown = loadCountdown("60");
    const { ctx } = makeCtx();
    runAction().run(ctx);

    countdown.style.display = "block";
    await sleep(SETTLE_MS);
    expect(secondsText(countdown)).toBe("1");

    // Repeat attempt: freeDownload() re-runs and resets the text to 60 —
    // the observer must bring it straight back down.
    countdown.querySelector<HTMLElement>(".seconds")!.textContent = "60";
    await sleep(SETTLE_MS);
    expect(secondsText(countdown)).toBe("1");
  });
});
