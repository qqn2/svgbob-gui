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
});
