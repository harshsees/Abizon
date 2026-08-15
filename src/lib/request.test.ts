import { describe, expect, it } from "vitest";

import { clientIp, ipPrefix, shortUserAgent } from "./request";

describe("clientIp", () => {
  it("takes the first entry of x-forwarded-for", () => {
    // A proxy appends; the client is first. Taking the last entry — a common
    // mistake — returns the proxy's own address and buckets every visitor
    // together, which silently disables per-IP rate limiting.
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" });
    expect(clientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to the platform headers", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "cf-connecting-ip": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("returns undefined when there is nothing to read", () => {
    expect(clientIp(new Headers())).toBeUndefined();
  });
});

describe("ipPrefix", () => {
  it("truncates IPv4 to a /24", () => {
    expect(ipPrefix("203.0.113.7")).toBe("203.0.113.0/24");
  });

  it("truncates IPv6 to a /48", () => {
    expect(ipPrefix("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe("2001:0db8:85a3::/48");
  });

  it("returns undefined for nothing and for nonsense", () => {
    // Under the DPDP Act an IP address is personal data. What gets *stored* is
    // the truncated form, and a value that cannot be truncated must not fall
    // through to being stored whole.
    expect(ipPrefix(undefined)).toBeUndefined();
    expect(ipPrefix("not-an-address")).toBeUndefined();
  });
});

describe("shortUserAgent", () => {
  it("caps the length", () => {
    const long = "x".repeat(1000);
    expect(shortUserAgent(new Headers({ "user-agent": long }))?.length).toBe(256);
  });
});
