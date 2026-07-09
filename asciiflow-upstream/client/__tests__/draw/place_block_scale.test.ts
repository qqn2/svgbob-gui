import { describe, expect, it } from "vitest";
import { scalePlacementLayer } from "#asciiflow/client/draw/place_block_scale";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

describe("place_block_scale", () => {
  it("keeps ASCII boxes closed when scaled", () => {
    const scaled = scalePlacementLayer(textToLayer("+--+\n|  |\n+--+"), 2);

    expect(layerToText(scaled)).toBe(
      [
        "+-----+",
        "|     |",
        "|     |",
        "|     |",
        "+-----+",
      ].join("\n")
    );
  });

  it("keeps rounded ASCII boxes closed when scaled", () => {
    const scaled = scalePlacementLayer(textToLayer(".--.\n|  |\n'--'"), 2);

    expect(layerToText(scaled)).toBe(
      [
        ".-----.",
        "|     |",
        "|     |",
        "|     |",
        "'-----'",
      ].join("\n")
    );
  });

  it("keeps label text compact when scaled", () => {
    const scaled = scalePlacementLayer(textToLayer("| MUX |"), 3);

    expect(layerToText(scaled)).toContain("MUX");
    expect(layerToText(scaled)).not.toContain("M  U  X");
  });

  it("keeps quoted labels compact when scaled", () => {
    const scaled = scalePlacementLayer(textToLayer('"FA"'), 3);

    expect(layerToText(scaled)).toBe('"FA"');
  });

  it("preserves spaces inside quoted labels without expanding quotes", () => {
    const scaled = scalePlacementLayer(textToLayer('"blk A"'), 3);

    expect(layerToText(scaled)).toBe('"blk A"');
    expect(layerToText(scaled)).not.toContain('"  blk');
    expect(layerToText(scaled)).not.toContain('A  "');
  });

  it("does not treat label letters as connector arrows", () => {
    const scaled = scalePlacementLayer(textToLayer("| Slave |\n| DATA[31:0] |"), 3);
    const text = layerToText(scaled);

    expect(text).toContain("Slave");
    expect(text).toContain("DATA[31:0]");
    expect(text).not.toContain("Sla      v");
    expect(text).not.toContain("DATA    [");
  });

  it("scales bundle lines without dashed gaps", () => {
    const scaled = scalePlacementLayer(textToLayer("====>"), 3);

    expect(layerToText(scaled)).toBe("============>");
  });

  it("keeps inline connector labels compact without surrounding gaps", () => {
    const scaled = scalePlacementLayer(textToLayer("=====[32]=====>"), 3);

    expect(layerToText(scaled)).toBe("===============[32]===============>");
  });

  it("extends backslash diagonal runs when scaled", () => {
    const scaled = scalePlacementLayer(textToLayer("\\\n \\"), 3);

    expect(scaled.get(new Vector(0, 0))).toBe("\\");
    expect(scaled.get(new Vector(1, 1))).toBe("\\");
    expect(scaled.get(new Vector(2, 2))).toBe("\\");
    expect(scaled.get(new Vector(3, 3))).toBe("\\");
  });

  it("extends slash diagonal runs when scaled", () => {
    const scaled = scalePlacementLayer(textToLayer(" /\n/"), 3);

    expect(scaled.get(new Vector(3, 0))).toBe("/");
    expect(scaled.get(new Vector(2, 1))).toBe("/");
    expect(scaled.get(new Vector(1, 2))).toBe("/");
    expect(scaled.get(new Vector(0, 3))).toBe("/");
  });

  it("extends slash and backslash edges connected to plus endpoints", () => {
    const scaled = scalePlacementLayer(textToLayer(" + \n/ \\"), 2);

    expect(scaled.get(new Vector(2, 0))).toBe("+");
    expect(scaled.get(new Vector(1, 1))).toBe("/");
    expect(scaled.get(new Vector(0, 2))).toBe("/");
    expect(scaled.get(new Vector(3, 1))).toBe("\\");
    expect(scaled.get(new Vector(4, 2))).toBe("\\");
  });

  it("extends diagonal edges from slash and backslash to lower endpoints", () => {
    const scaled = scalePlacementLayer(textToLayer(" / \\\n+   +"), 2);

    expect(scaled.get(new Vector(2, 0))).toBe("/");
    expect(scaled.get(new Vector(1, 1))).toBe("/");
    expect(scaled.get(new Vector(0, 2))).toBe("+");
    expect(scaled.get(new Vector(6, 0))).toBe("\\");
    expect(scaled.get(new Vector(7, 1))).toBe("\\");
    expect(scaled.get(new Vector(8, 2))).toBe("+");
  });

  it("extends diagonal edges connected to dot and quote endpoints", () => {
    const scaled = scalePlacementLayer(textToLayer(" . \n/ \\\n'  '"), 2);

    expect(scaled.get(new Vector(2, 0))).toBe(".");
    expect(scaled.get(new Vector(1, 1))).toBe("/");
    expect(scaled.get(new Vector(0, 2))).toBe("/");
    expect(scaled.get(new Vector(4, 2))).toBe("\\");
    expect(scaled.get(new Vector(5, 3))).toBe("\\");
    expect(scaled.get(new Vector(6, 4))).toBe("'");
  });
});
