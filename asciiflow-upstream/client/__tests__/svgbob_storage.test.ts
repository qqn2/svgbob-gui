import { describe, expect, it } from "vitest";
import {
  decodeAsciiFromUrl,
  encodeAsciiForUrl,
} from "#asciiflow/client/svgbob_storage";

describe("svgbob_storage", () => {
  it("roundtrips ASCII through base64url", () => {
    const text = "+---+\n| A |\n+---+";
    const encoded = encodeAsciiForUrl(text);
    expect(encoded).toBeTruthy();
    expect(decodeAsciiFromUrl(encoded!)).toBe(text);
  });

  it("rejects oversized payloads", () => {
    expect(encodeAsciiForUrl("x".repeat(6001))).toBeNull();
  });

  it("returns null for invalid encoded input", () => {
    expect(decodeAsciiFromUrl("not!!!valid")).toBeNull();
  });

  it("rejects oversized inbound payloads", () => {
    expect(decodeAsciiFromUrl("a".repeat(9000))).toBeNull();
  });
});
