const origOpen = window.open.bind(window);

export function installPopupBlocker(): () => void {
  window.open = (url?: string | URL, _target?: string, _features?: string): WindowProxy | null => {
    const href = url instanceof URL ? url.href : (url ?? "");
    if (!/^https?:\/\//i.test(href)) {
      return origOpen(url, _target, _features);
    }
    // Suppress the popup and return null. Bypass navigation is handled by rule
    // actions (redirect-from-href, wait-visibility + click, etc.) — following
    // window.open destinations was wrong because ad-revenue popups fire first and
    // their microtask override the page's own location.href destination assignment.
    return null;
  };

  return () => {
    window.open = origOpen;
  };
}
