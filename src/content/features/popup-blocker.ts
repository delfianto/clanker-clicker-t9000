const origOpen = window.open.bind(window);

export function installPopupBlocker(): () => void {
  window.open = (url?: string | URL, _target?: string, _features?: string): WindowProxy | null => {
    const href = url instanceof URL ? url.href : (url ?? "");
    if (!/^https?:\/\//i.test(href)) {
      return origOpen(url, _target, _features);
    }
    // On shortlink pages the popup IS the next hop — navigate there instead of
    // blocking. Use a microtask so we run after any same-tick location.href
    // assignment from the same click handler (last assignment wins in browsers).
    Promise.resolve().then(() => location.assign(href));
    return null;
  };

  return () => {
    window.open = origOpen;
  };
}
