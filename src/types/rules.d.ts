import type { Settings } from './global';

export type DecodeStrategy = 'base64' | 'base64x2' | 'base64x3' | 'uri' | 'rot13' | 'none';

export type RuleAction =
  | { type: 'click'; selector: string; delay?: number }
  | { type: 'submit'; selector: string; delay?: number }
  | { type: 'wait-element'; selector: string; steps: RuleAction[] }
  | { type: 'wait-captcha'; steps: RuleAction[] }
  | { type: 'wait-visibility'; selector: string; steps: RuleAction[] }
  | { type: 'redirect-from-href'; selector: string }
  | { type: 'redirect-from-onclick'; selector: string; extractPattern: string }
  | { type: 'redirect-from-param'; param: string; decode?: DecodeStrategy; prefix?: string; hashParams?: boolean }
  | { type: 'redirect-from-path'; pattern: string; decode?: DecodeStrategy; prefix?: string }
  | { type: 'remove-attr'; selector: string; attrs: string[] }
  | { type: 'custom'; handler: string };

export type Rule = {
  id: string;
  match: string;
  exclude?: string;
  pathMatch?: string;
  runAt: 'start' | 'loaded';
  actions: RuleAction[];
  requiresFeature?: keyof Settings;
};
