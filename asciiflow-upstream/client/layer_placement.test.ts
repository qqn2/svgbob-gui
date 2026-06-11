import { describe, expect, it } from "vitest";
import {
  anchorForCursor,
  flipLayerH,
  layerBBox,
  layerOverlapsCommitted,
  offsetLayer,
  rotateLayer90CW,
  snapAnchor,
} from "#asciiflow/client/layer_placement";
import { Layer } from "#asciiflow/client/layer";
import { textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

describe("layer_placement", () => {
  it("computes bbox and cursor anchor from top-left", () => {
    const layer = textToLayer("AB\nCD", new Vector(0, 0));
    const bbox = layerBBox(layer)!;
    expect(bbox.topLeft().equals(new Vector(0, 0))).toBe(true);
    expect(bbox.bottomRight().equals(new Vector(1, 1))).toBe(true);
    const anchor = anchorForCursor(new Vector(5, 5), bbox);
    expect(anchor.equals(new Vector(5, 5))).toBe(true);
  });

  it("detects overlap with committed cells", () => {
    const committed = textToLayer("X", new Vector(3, 3));
    const ghost = offsetLayer(textToLayer("Y", new Vector(0, 0)), new Vector(3, 3));
    expect(layerOverlapsCommitted(ghost, committed)).toBe(true);
    const ghost2 = offsetLayer(textToLayer("Y", new Vector(0, 0)), new Vector(10, 10));
    expect(layerOverlapsCommitted(ghost2, committed)).toBe(false);
  });

  it("snaps anchor near committed edges", () => {
    const committed = textToLayer("XX", new Vector(10, 10));
    const snapped = snapAnchor(new Vector(12, 11), committed, 2);
    expect(snapped.x).toBe(12);
    expect(snapped.y).toBe(11);
  });

  it("rotates and flips layers", () => {
    const layer = textToLayer(">", new Vector(0, 0));
    const flipped = flipLayerH(layer);
    expect(flipped.keys().length).toBe(1);
    const rotated = rotateLayer90CW(textToLayer("A\nB", new Vector(0, 0)));
    expect(rotated.keys().length).toBe(2);
  });
});
