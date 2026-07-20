import type { Rule } from "../../types/rules";

// All download rules are gated behind autoDL setting.
const DL: Rule["requiresFeature"] = "autoDL";

export const downloadRules: Rule[] = [
  {
    id: "dailyuploads",
    match: "^dailyuploads\\.net$",
    runAt: "loaded",
    requiresFeature: DL,
    actions: [
      { type: "click", selector: "#fbtn1", delay: 2000 },
      { type: "wait-captcha", steps: [{ type: "click", selector: "#downloadbtn" }] },
    ],
  },
  {
    id: "ddownload",
    match: "^ddownload\\.com$",
    runAt: "loaded",
    requiresFeature: DL,
    actions: [
      { type: "click", selector: "#method_free", delay: 2000 },
      { type: "wait-captcha", steps: [{ type: "click", selector: "#downloadbtn" }] },
    ],
  },
  {
    id: "drive-google",
    match: "^drive\\.google\\.com$",
    // Scoped to the file-view/download pages the action actually targets — an
    // unscoped match installs the trust proxy (main.ts fires it on any match,
    // ahead of the requiresFeature gate) on every Drive page, including the
    // main file browser, which trips Drive's own tamper detection and shows
    // a nonstop "Drive is out of date" reload banner.
    pathMatch: "^/(file/d/|uc)",
    runAt: "loaded",
    requiresFeature: DL,
    actions: [
      {
        type: "run",
        run: ({ navigateTo, qs }) => {
          const fileId = location.href.split("/").slice(-2)[0];
          if (location.href.includes("/file/d/") && fileId) {
            navigateTo(
              `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
            );
          } else if (location.href.includes("uc?id")) {
            qs<HTMLFormElement>("#download-form")?.submit();
          }
        },
      },
    ],
  },
  {
    id: "gofile",
    match: "^gofile\\.io$",
    runAt: "loaded",
    requiresFeature: DL,
    actions: [
      {
        type: "wait-element",
        selector: "#filemanager",
        steps: [{ type: "click", selector: "button.item_download", delay: 2000 }],
      },
    ],
  },
  {
    id: "katfile",
    match: "^katfile\\.com$",
    runAt: "loaded",
    requiresFeature: DL,
    actions: [
      { type: "click", selector: "#fbtn1", delay: 2000 },
      { type: "wait-captcha", steps: [{ type: "click", selector: "#downloadbtn" }] },
      {
        type: "wait-element",
        selector: "#dlink",
        steps: [{ type: "redirect-from-href", selector: "#dlink" }],
      },
    ],
  },
  {
    id: "mediafire",
    match: "^(www\\.)?mediafire\\.com$",
    pathMatch: "^/file/",
    runAt: "loaded",
    requiresFeature: DL,
    actions: [{ type: "redirect-from-attr", selector: ".download_link .input", attr: "href" }],
  },
  {
    id: "pixeldrain",
    match: "^pixeldrain\\.com$",
    pathMatch: "^/u/",
    runAt: "start",
    requiresFeature: DL,
    actions: [{ type: "redirect-template", from: "^/u/(.+)$", to: "/api/file/$1?download" }],
  },
  {
    id: "turbobit",
    match: "^turbobit\\.net$",
    runAt: "loaded",
    requiresFeature: DL,
    actions: [
      { type: "redirect-from-attr", selector: "#nopay-btn", attr: "href", wait: false },
      { type: "wait-captcha", steps: [{ type: "click", selector: "#submit" }] },
      {
        type: "wait-element",
        selector: "#free-download-file-link",
        steps: [{ type: "redirect-from-href", selector: "#free-download-file-link" }],
      },
    ],
  },
  {
    id: "uploadev",
    match: "^uploadev\\.org$",
    runAt: "loaded",
    requiresFeature: DL,
    actions: [
      { type: "click", selector: "#method_free", delay: 2000 },
      { type: "wait-captcha", steps: [{ type: "click", selector: "#downloadbtn" }] },
      {
        type: "wait-element",
        selector: "#direct_link > a",
        steps: [{ type: "redirect-from-href", selector: "#direct_link > a" }],
      },
    ],
  },
  {
    // usersdrive.com is XFileSharing with a multi-page free-download flow:
    //   stage-1 "Free Download" button → captcha + #downloadbtn → final page whose
    //   direct link is <a class="btn btn-download" href=" …file.zip">.
    // The rule re-runs on every page load, so it handles whichever step it lands on.
    // The final anchor is handled at the TOP level, NOT inside wait-captcha — the
    // final page has no captcha, so gating it there hangs forever (the bug that left
    // the download button sitting there unclicked).
    id: "usersdrive",
    match: "^usersdrive\\.com$",
    runAt: "loaded",
    requiresFeature: DL,
    actions: [
      {
        type: "run",
        run: (ctx) => {
          // Final page: go straight to the file. `.href` resolves clean via the DOM
          // property even though the raw attribute carries a stray leading space.
          const dl = ctx.qs<HTMLAnchorElement>("a.btn-download");
          if (dl?.href) {
            ctx.navigateTo(dl.href);
            return;
          }
          // Otherwise advance the flow: click a stage-1 "Free Download" button if
          // this config shows one (fire-and-forget — never block on its absence).
          void ctx
            .click("#fbtn1, input[name='method_free'], button[name='method_free']")
            .catch(() => {});
        },
      },
      {
        type: "wait-captcha",
        steps: [
          { type: "click", selector: "#downloadbtn" },
          // If #downloadbtn reveals the direct link inline (no reload), take it; on a
          // reload the top action catches it when the rule re-runs on the next page.
          {
            type: "wait-element",
            selector: "a.btn-download",
            steps: [{ type: "redirect-from-href", selector: "a.btn-download" }],
          },
        ],
      },
    ],
  },
];
