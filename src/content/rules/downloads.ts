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
    id: "usersdrive",
    match: "^usersdrive\\.com$",
    runAt: "loaded",
    requiresFeature: DL,
    actions: [
      { type: "click", selector: "#fbtn1", delay: 2000 },
      { type: "wait-captcha", steps: [{ type: "click", selector: "#downloadbtn" }] },
    ],
  },
];
