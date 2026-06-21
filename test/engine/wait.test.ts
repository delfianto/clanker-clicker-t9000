import { afterEach, describe, expect, test } from "bun:test";
import { sleep, TimeoutError, waitForElement } from "../../src/content/engine/wait";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("waitForElement", () => {
  test("resolves immediately when the element already exists", async () => {
    document.body.innerHTML = `<div id="x"></div>`;
    const el = await waitForElement("#x");
    expect((el as HTMLElement).id).toBe("x");
  });

  test("resolves when the element appears after observation starts (MutationObserver)", async () => {
    // waitForElement sets up its observer synchronously, so appending right after
    // the call exercises the observer path (not the initial qs fast-path).
    const pending = waitForElement("#late", undefined, 2000);
    const d = document.createElement("div");
    d.id = "late";
    document.body.appendChild(d);
    const el = await pending;
    expect((el as HTMLElement).id).toBe("late");
  });

  test("rejects with TimeoutError after the timeout elapses", async () => {
    await expect(waitForElement("#never", undefined, 50)).rejects.toBeInstanceOf(TimeoutError);
  });

  test("rejects when the abort signal fires", async () => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10);
    await expect(waitForElement("#never2", ctrl.signal, 5000)).rejects.toThrow();
  });
});

describe("sleep", () => {
  test("resolves after roughly the requested delay", async () => {
    const start = Date.now();
    await sleep(25);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });
});
