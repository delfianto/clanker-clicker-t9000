import type { Rule } from "../../types/rules";

import { shortlinkRules } from "./shortlinks";
import { wpsafeRules } from "./wpsafe";
import { downloadRules } from "./downloads";
import { googleRedirectRule } from "./custom/google-redirect";
import { caribbeancomRule } from "./custom/caribbeancom";

let _allRules: Rule[] | null = null;

export function getAllRules(): Rule[] {
  if (!_allRules) {
    // Stable sort by priority (desc). Equal priorities keep insertion order, so
    // specific rules win via `priority` rather than fragile array positioning.
    _allRules = [
      ...shortlinkRules,
      ...wpsafeRules,
      ...downloadRules,
      googleRedirectRule,
      caribbeancomRule,
    ].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
  return _allRules;
}
