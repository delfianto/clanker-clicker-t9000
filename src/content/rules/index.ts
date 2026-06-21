import type { Rule } from "../../types/rules";

import { shortlinkRules } from "./shortlinks";
import { wpsafeRules } from "./wpsafe";
import { downloadRules } from "./downloads";
import { googleRedirectRule } from "./custom/google-redirect";

let _allRules: Rule[] | null = null;

export function getAllRules(): Rule[] {
  if (!_allRules) {
    _allRules = [
      googleRedirectRule, // specific first (has pathMatch)
      ...shortlinkRules,
      ...wpsafeRules,
      ...downloadRules,
    ];
  }
  return _allRules;
}
