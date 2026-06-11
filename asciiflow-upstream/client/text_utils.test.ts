import { describe, expect, it } from "vitest";
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
});
