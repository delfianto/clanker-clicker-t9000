const ALLOWED = new Set(["http:", "https:"]);

export async function crossOriginFetch(
  url: string,
  method = "GET",
  headers: Record<string, string> = {},
  body?: string,
): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (!ALLOWED.has(parsed.protocol)) {
    throw new Error(`Blocked protocol: ${parsed.protocol}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, {
      method,
      headers,
      credentials: "omit",
      signal: controller.signal,
      ...(body != null ? { body } : {}),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
