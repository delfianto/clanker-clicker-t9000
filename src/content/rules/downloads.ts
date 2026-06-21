import type { Rule } from "../../types/rules";

// All download rules are gated behind autoDL setting.
const DL: Rule["requiresFeature"] = "autoDL";

export const downloadRules: Rule[] = [
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
    id: "usersdrive",
    match: "^(usersdrive|ddownload)\\.com$",
    runAt: "loaded",
    requiresFeature: DL,
    actions: [
      { type: "click", selector: "#fbtn1", delay: 2000 },
      { type: "wait-captcha", steps: [{ type: "click", selector: "#downloadbtn" }] },
    ],
  },
  {
    id: "pixeldrain",
    match: "^pixeldrain\\.com$",
    pathMatch: "^/u/",
    runAt: "start",
    requiresFeature: DL,
    actions: [{ type: "custom", handler: "pixeldrain-direct" }],
  },
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
    id: "mediafire",
    match: "^(www\\.)?mediafire\\.com$",
    pathMatch: "^/file/",
    runAt: "loaded",
    requiresFeature: DL,
    actions: [{ type: "custom", handler: "mediafire-direct" }],
  },
  {
    id: "drive-google",
    match: "^drive\\.google\\.com$",
    runAt: "loaded",
    requiresFeature: DL,
    actions: [{ type: "custom", handler: "google-drive-direct" }],
  },
  {
    id: "turbobit",
    match: "^turbobit\\.net$",
    runAt: "loaded",
    requiresFeature: DL,
    actions: [
      { type: "custom", handler: "turbobit-nopay" },
      { type: "wait-captcha", steps: [{ type: "click", selector: "#submit" }] },
      {
        type: "wait-element",
        selector: "#free-download-file-link",
        steps: [{ type: "redirect-from-href", selector: "#free-download-file-link" }],
      },
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
];
