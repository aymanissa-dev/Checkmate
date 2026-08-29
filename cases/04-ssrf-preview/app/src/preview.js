/**
 * CRITICAL DEFECT: no URL allowlist / private-IP block — classic SSRF sink.
 */
export async function fetchPreview(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "MiniPreview/0.1" },
  });
  const text = await res.text();
  const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
  return {
    url,
    status: res.status,
    title: titleMatch?.[1]?.trim() ?? null,
    length: text.length,
  };
}

export function isHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
