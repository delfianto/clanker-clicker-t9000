export function qs<T extends Element = Element>(selector: string, root: ParentNode = document): T | null {
  try {
    return root.querySelector<T>(selector);
  } catch {
    return null;
  }
}

export function qsa<T extends Element = Element>(selector: string, root: ParentNode = document): T[] {
  try {
    return Array.from(root.querySelectorAll<T>(selector));
  } catch {
    return [];
  }
}

export function qsContains(selector: string, text: string, root: ParentNode = document): Element | null {
  return qsa(selector, root).find(el =>
    el.textContent?.toLowerCase().includes(text.toLowerCase())
  ) ?? null;
}

export function isVisible(el: Element): boolean {
  const h = el as HTMLElement;
  if (!h.offsetHeight && !h.offsetWidth) return false;
  if (getComputedStyle(el).visibility === 'hidden') return false;
  return true;
}
