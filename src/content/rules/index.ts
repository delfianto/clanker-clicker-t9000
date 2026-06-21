import type { Rule } from '../../types/rules';
import type { CustomHandlerRegistry } from '../engine/actions';

import { shortlinkRules } from './shortlinks';
import { wpsafeRules } from './wpsafe';
import { downloadRules } from './downloads';
import { googleRedirectRule, registerGoogleRedirectHandler } from './custom/google-redirect';
import { registerOuoHandlers } from './custom/ouo';

let _allRules: Rule[] | null = null;
let _registry: CustomHandlerRegistry | null = null;

export function getAllRules(): Rule[] {
  if (!_allRules) {
    _allRules = [
      googleRedirectRule,   // specific first (has pathMatch)
      ...shortlinkRules,
      ...wpsafeRules,
      ...downloadRules,
    ];
  }
  return _allRules;
}

export function getRegistry(): CustomHandlerRegistry {
  if (!_registry) {
    _registry = new Map();
    registerGoogleRedirectHandler(_registry);
    registerOuoHandlers(_registry);
  }
  return _registry;
}
