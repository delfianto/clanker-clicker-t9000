import type { CustomHandlerRegistry } from "../../engine/actions";
import { navigateTo } from "../../engine/redirect";
import { waitForElement } from "../../engine/wait";
import { qs } from "../../engine/dom";

export function registerOuoHandlers(registry: CustomHandlerRegistry): void {
  // ouo.io flow:
  //   Step 1: Initial visit → no ?s= param → wait for continue button, click it → form POST
  //   Step 2: Post-captcha page → ?s=<destination> in URL → extract and redirect
  registry.set("ouo", async () => {
    const s = new URLSearchParams(location.search).get("s");
    if (s) {
      navigateTo(s.startsWith("http") ? s : "https://" + s);
      return;
    }

    const btn = await waitForElement("button#btn-main");
    (btn as HTMLElement).click();
  });

  registry.set("paycut-strip", () => {
    const stripped = location.href.replace("/ad/", "/");
    navigateTo(stripped);
  });

  registry.set("multiup-redirect", () => {
    const url = location.href.replace("download/", "en/mirror/");
    navigateTo(url);
  });

  registry.set("turbobit-nopay", () => {
    const btn = qs<HTMLAnchorElement>("#nopay-btn");
    if (btn?.href) navigateTo(btn.href);
  });

  registry.set("pixeldrain-direct", () => {
    const id = location.pathname.replace("/u/", "");
    if (id) navigateTo(`/api/file/${id}?download`);
  });

  registry.set("mediafire-direct", () => {
    const link = qs<HTMLInputElement>(".download_link .input");
    if (link?.getAttribute("href")) navigateTo(link.getAttribute("href")!);
  });

  registry.set("google-drive-direct", () => {
    const fileId = location.href.split("/").slice(-2)[0];
    if (location.href.includes("/file/d/") && fileId) {
      navigateTo(`https://drive.usercontent.google.com/download?id=${fileId}&export=download`);
    } else if (location.href.includes("uc?id")) {
      qs<HTMLFormElement>("#download-form")?.submit();
    }
  });
}
