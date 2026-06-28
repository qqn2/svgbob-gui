import { describe, expect, it } from "vitest";
import { scalePlacementLayer } from "#asciiflow/client/draw/place_block_scale";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";

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

  it("keeps label text compact when scaled", () => {
    const scaled = scalePlacementLayer(textToLayer("| MUX |"), 3);

    expect(layerToText(scaled)).toContain("MUX");
    expect(layerToText(scaled)).not.toContain("M  U  X");
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
});
