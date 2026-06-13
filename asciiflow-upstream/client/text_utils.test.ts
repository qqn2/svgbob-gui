import { describe, expect, it } from "vitest";
import { Box } from "#asciiflow/client/common";
import { Layer } from "#asciiflow/client/layer";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

describe("text_utils", () => {
  it("roundtrips box diagram", () => {
    const original = "+---+\n| X |\n+---+";
    const layer = textToLayer(original);
    expect(layerToText(layer)).toBe(original);
  });

  it("places text at offset", () => {
    const layer = textToLayer("AB", new Vector(5, 2));
    expect(layer.get(new Vector(5, 2))).toBe("A");
    expect(layer.get(new Vector(6, 2))).toBe("B");
  });

  it("strips Windows line endings", () => {
    const layer = textToLayer("A\r\nB");
    expect(layer.get(new Vector(0, 0))).toBe("A");
    expect(layer.get(new Vector(0, 1))).toBe("B");
  });

  it("omits cells outside the requested box", () => {
    const layer = new Layer();
    layer.setFrom(textToLayer("AAA", new Vector(0, 0)));
    layer.setFrom(textToLayer("BBB", new Vector(20, 20)));

    const full = layerToText(layer);
    expect(full).toContain("AAA");
    expect(full).toContain("BBB");

    const cropped = layerToText(layer, new Box(new Vector(18, 18), new Vector(24, 24)));
    expect(cropped).not.toContain("AAA");
    expect(cropped).toContain("BBB");
  });
});
