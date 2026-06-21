import { afterEach, expect, test } from "bun:test";
import {
  DEFAULT_ADBLOCK_PATTERN,
  installAntiAdblockRemover,
} from "../../src/content/features/adblock";

let uninstall: (() => void) | null = null;
afterEach(() => {
  uninstall?.();
  uninstall = null;
  document.body.innerHTML = "";
});

test("removes existing scripts whose content matches the pattern, keeps others", () => {
  document.body.innerHTML = `<script id="bad">var x = detectAdBlock();</script><script id="ok">console.log(1)</script>`;
  uninstall = installAntiAdblockRemover(DEFAULT_ADBLOCK_PATTERN);
  expect(document.getElementById("bad")).toBeNull();
  expect(document.getElementById("ok")).not.toBeNull();
});

test("removes a dynamically-added matching iframe", async () => {
  uninstall = installAntiAdblockRemover(/evilads/);
  const f = document.createElement("iframe");
  f.src = "https://evilads.example/x";
  document.body.appendChild(f);
  await new Promise((r) => setTimeout(r, 20));
  expect(document.querySelector("iframe")).toBeNull();
});
