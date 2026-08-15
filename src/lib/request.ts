import "server-only";

/**
 * WHO IS ASKING — as much as can honestly be known, and no more.
 * ---------------------------------------------------------------------------
 * Two jobs, and they want different amounts of precision:
 *
 *   `clientIp`     the full address, held in memory for the length of one
 *                  request. Rate limiting and Turnstile need it and neither
 *                  writes it down.
 *
 *   `ipPrefix`     the address truncated before it is *stored*. The audit log
 *                  and the staff login attempts table both need "was this the
 *                  same rough source", and neither needs a precise location for
 *                  every action a person takes. Under the DPDP Act an IP
 *                  address is personal data; a /24 is a neighbourhood.
 *
 * The split is the point. Keeping the full address only where it is used and
 * never where it is persisted means a leak of the audit log is not also a leak
 * of everybody's movements.
 */

/**
 * `x-forwarded-for` is a client-supplied header that a proxy appends to. On
 * Vercel the platform overwrites it, so the *first* entry is the real client.
 * Behind an unknown proxy it is forgeable and this returns whatever the client
 * claimed — which is why nothing here is a security decision on its own. It
 * chooses a rate-limit bucket, and the worst an attacker does by lying is spread
 * their own requests across buckets, which Turnstile is there to catch.
 */
export function clientIp(headerList: Headers): string | undefined {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  // Vercel's own header, and Cloudflare's, in case the app ends up behind it.
  return (
    headerList.get("x-real-ip") ??
    headerList.get("cf-connecting-ip") ??
    undefined
  );
}

/**
 * Truncate to /24 for IPv4 and /48 for IPv6 — the same granularity most
 * analytics anonymisation uses, chosen because it keeps "these forty requests
 * came from one place" visible while dropping the identification of a household.
 */
export function ipPrefix(ip: string | undefined): string | undefined {
  if (!ip) return undefined;

  if (ip.includes(":")) {
    // IPv6: keep the first three hextets.
    const parts = ip.split(":");
    return `${parts.slice(0, 3).join(":")}::/48`;
  }

  const octets = ip.split(".");
  if (octets.length !== 4) return undefined;
  return `${octets.slice(0, 3).join(".")}.0/24`;
}

/**
 * User agents are stored in the audit log because "was this the same browser"
 * is a question incident response actually asks. They are long, occasionally
 * hostile, and there is no reason to keep more than fits in a column.
 */
export function shortUserAgent(headerList: Headers): string | undefined {
  const value = headerList.get("user-agent");
  return value ? value.slice(0, 256) : undefined;
}
