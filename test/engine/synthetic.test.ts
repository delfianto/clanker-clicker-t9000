import { expect, test } from "bun:test";
import { isSynthetic, markSynthetic, simulateClick } from "../../src/content/engine/synthetic";

test("markSynthetic tags an event and returns it; isSynthetic detects it", () => {
  const ev = new Event("click");
  expect(isSynthetic(ev)).toBe(false);
  const returned = markSynthetic(ev);
  expect(returned).toBe(ev);
  expect(isSynthetic(ev)).toBe(true);
});

test("unmarked events are not synthetic", () => {
  expect(isSynthetic(new Event("click"))).toBe(false);
  expect(isSynthetic(new MouseEvent("mousedown"))).toBe(false);
});

test("simulateClick toggles a checkbox and marks every dispatched event synthetic", () => {
  const box = document.createElement("input");
  box.type = "checkbox";
  document.body.append(box);

  const seen: { type: string; synthetic: boolean }[] = [];
  for (const type of ["mouseover", "mousedown", "mouseup", "click"]) {
    box.addEventListener(type, (e) => {
      seen.push({ type: e.type, synthetic: isSynthetic(e) });
    });
  }

  simulateClick(box);

  // Native activation behavior runs off the dispatched click.
  expect(box.checked).toBe(true);
  // The full pointer sequence fired, and each event is tagged synthetic so the
  // trust proxy can spoof isTrusted on real pages.
  expect(seen.map((s) => s.type)).toEqual(["mouseover", "mousedown", "mouseup", "click"]);
  expect(seen.every((s) => s.synthetic)).toBe(true);

  box.remove();
});

test("simulateClick clears disabled and target before clicking", () => {
  const a = document.createElement("a");
  a.setAttribute("disabled", "");
  a.setAttribute("target", "_blank");
  document.body.append(a);

  simulateClick(a);

  expect(a.hasAttribute("disabled")).toBe(false);
  expect(a.hasAttribute("target")).toBe(false);

  a.remove();
});
