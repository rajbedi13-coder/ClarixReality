import { promises as dns } from "dns";
import { isIPv4, isIPv6 } from "net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.internal",
  "computemetadata",
]);

/**
 * Checks whether an IPv4 address string falls within any private, loopback,
 * link-local, or otherwise reserved range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 240
  );
}

/**
 * Checks whether a pure IPv6 address (already confirmed not IPv4-mapped) is
 * loopback, link-local, or a ULA (unique local) address.
 */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  return false;
}

/**
 * If `ipv6` is an IPv4-mapped address (::ffff:a.b.c.d or ::ffff:hhhh:hhhh),
 * returns the embedded IPv4 dotted-decimal string.  Otherwise returns null.
 */
function extractIPv4Mapped(ipv6: string): string | null {
  const lower = ipv6.toLowerCase();

  const decMatch = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (decMatch) return decMatch[1] ?? null;

  const hexMatch = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMatch) {
    const hi = parseInt(hexMatch[1] ?? "0", 16);
    const lo = parseInt(hexMatch[2] ?? "0", 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }

  return null;
}

/**
 * Returns true if the given IP address string (IPv4 or IPv6, with or without
 * brackets) maps to a private, loopback, link-local, or reserved address.
 */
function isPrivateIp(ip: string): boolean {
  const addr = ip.startsWith("[") && ip.endsWith("]") ? ip.slice(1, -1) : ip;

  if (isIPv4(addr)) return isPrivateIPv4(addr);

  if (isIPv6(addr)) {
    const mapped = extractIPv4Mapped(addr);
    if (mapped !== null) return isPrivateIPv4(mapped);
    return isPrivateIPv6(addr);
  }

  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  if (lower.endsWith(".local") || lower.endsWith(".internal") || lower.endsWith(".localhost")) return true;
  return false;
}

/**
 * Validates a feed URL for use in ingestion.
 *
 * Rules:
 * - Must be a valid URL with http: or https: protocol.
 * - Hostname must not be a private/loopback/link-local IP literal.
 * - Hostname must not be a known internal hostname (localhost, *.local, metadata endpoints).
 * - Hostname must not resolve to a private/loopback IP address (DNS rebinding guard).
 *
 * Returns null on success, or an error message string on failure.
 */
export async function validateFeedUrl(raw: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "feedUrl must be a valid URL";
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return "feedUrl must use http or https protocol";
  }

  const hostname = parsed.hostname;

  if (isPrivateIp(hostname)) {
    return "feedUrl hostname resolves to a private or reserved address";
  }

  if (isBlockedHostname(hostname)) {
    return "feedUrl hostname is not permitted";
  }

  try {
    const entries = await dns.lookup(hostname, { all: true });
    for (const entry of entries) {
      if (isPrivateIp(entry.address)) {
        return "feedUrl hostname resolves to a private or reserved address";
      }
    }
  } catch {
    return "feedUrl hostname could not be resolved";
  }

  return null;
}

const MAX_FEED_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;

/**
 * Fetches feed content over HTTP/HTTPS with SSRF protection.
 *
 * - Validates the URL (protocol, hostname, resolved IPs) before every request.
 * - Follows redirects manually, re-validating the target URL at each hop to guard
 *   against redirects that lead to internal/private addresses.
 * - Caps the response body at 10 MiB.
 * - Enforces a 15 s timeout per hop.
 *
 * Throws an Error on any validation failure, network error, or oversized response.
 */
export async function safeFetchFeed(startUrl: string): Promise<string> {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const urlError = await validateFeedUrl(currentUrl);
    if (urlError) throw new Error(`SSRF guard blocked URL: ${urlError} (${currentUrl})`);

    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "ClarixReality/1.0 (+https://clarix.ai)" },
      });
    } finally {
      clearTimeout(timerId);
    }

    if (response.status >= 300 && response.status < 400) {
      if (hop === MAX_REDIRECTS) throw new Error("Too many redirects");
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect response missing Location header");
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    if (!response.ok) throw new Error(`HTTP ${response.status} fetching feed`);

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_FEED_BYTES) throw new Error("Feed response too large");

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_FEED_BYTES) throw new Error("Feed response too large");
    return new TextDecoder().decode(bytes);
  }

  throw new Error("Too many redirects");
}
