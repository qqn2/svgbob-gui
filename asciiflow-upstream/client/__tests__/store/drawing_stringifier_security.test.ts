import { describe, expect, it } from "vitest";
import {
  DrawingStringifier,
  MAX_SHARED_DRAWING_ENCODED_BYTES,
} from "#asciiflow/client/store/drawing_stringifier";
import { Base64 } from "js-base64";
import pako from "pako";

describe("DrawingStringifier shared input limits", () => {
  it("rejects oversized encoded drawings before decompression", () => {
    expect(() =>
      new DrawingStringifier().deserialize(
        "a".repeat(MAX_SHARED_DRAWING_ENCODED_BYTES + 1)
      )
    ).toThrow("too large");
  });

  it("rejects invalid compressed drawings", () => {
    expect(() => new DrawingStringifier().deserialize("not-a-drawing"))
      .toThrow();
  });

  it("stops highly compressed input at the inflated-size limit", () => {
    const compressed = Base64.fromUint8Array(
      pako.deflate("x".repeat(2_100_000))
    );
    expect(() => new DrawingStringifier().deserialize(compressed))
      .toThrow("expands beyond");
  });
});
