import type { DecodeStrategy } from '../../types/rules';

export function navigateTo(url: string): void {
  if (!/^https?:\/\//i.test(url)) return;
  location.assign(url);
}

export function metaRedirect(url: string): void {
  if (!/^https?:\/\//i.test(url)) return;
  const meta = document.createElement('meta');
  meta.name = 'referrer';
  meta.content = 'origin';
  document.head.appendChild(meta);
  const a = document.createElement('a');
  a.href = url;
  a.click();
}

export function decode(value: string, strategy: DecodeStrategy = 'none'): string | null {
  try {
    switch (strategy) {
      case 'none':    return value;
      case 'uri':     return decodeURIComponent(value);
      case 'base64':  return atob(value);
      case 'base64x2': return atob(atob(value));
      case 'base64x3': return atob(atob(atob(value)));
      case 'rot13':
        return value.replace(/[a-z]/gi, c => {
          const base = c <= 'Z' ? 90 : 122;
          const code = c.charCodeAt(0) + 13;
          return String.fromCharCode(code > base ? code - 26 : code);
        });
    }
  } catch {
    return null;
  }
}

export function extractFromParam(
  name: string,
  strategy: DecodeStrategy = 'none',
  useHash = false
): string | null {
  const search = useHash ? location.hash.substring(1) : location.search;
  const params = new URLSearchParams(search);
  const raw = params.get(name);
  if (!raw) return null;
  return decode(raw, strategy);
}

export function extractFromPath(
  pattern: string,
  strategy: DecodeStrategy = 'none'
): string | null {
  const full = location.pathname + location.hash;
  const m = full.match(new RegExp(pattern));
  if (!m?.[1]) return null;
  return decode(m[1], strategy);
}

export function extractFromOnclick(el: Element, extractPattern: string): string | null {
  const onclick = el.getAttribute('onclick') ?? (el as HTMLElement).onclick?.toString() ?? '';
  const m = onclick.match(new RegExp(extractPattern));
  return m?.[1] ?? null;
}
