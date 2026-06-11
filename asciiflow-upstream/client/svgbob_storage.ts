const HASH_MAX_CHARS = 6000;

export function encodeAsciiForUrl(text: string): string | null {
  if (text.length > HASH_MAX_CHARS) return null;
  try {
    return btoa(unescape(encodeURIComponent(text)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return null;
  }
}

export function decodeAsciiFromUrl(encoded: string): string | null {
  try {
    let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return null;
  }
}

export function buildShareUrl(text: string): string | null {
  const encoded = encodeAsciiForUrl(text);
  if (!encoded) return null;
  const base = window.location.href.split("#")[0];
  return `${base}#/bob/${encoded}`;
}
