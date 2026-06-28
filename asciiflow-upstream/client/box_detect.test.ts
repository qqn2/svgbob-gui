import { describe, expect, it } from "vitest";
import { buildFillPatch, findBoxAt, pickLabelRow } from "#asciiflow/client/box_detect";
import { Layer } from "#asciiflow/client/layer";
import { textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

describe("box_detect", () => {
  it("finds a simple ASCII box and applies a fill tag", () => {
    const layer = textToLayer(
      ["+----------+", "| CPU      |", "+----------+"].join("\n"),
      new Vector(0, 0)
    );
    const click = new Vector(5, 1);
    const box = findBoxAt(layer, click);
    expect(box).toEqual({ top: 0, left: 0, bottom: 2, right: 11 });

    const labelRow = pickLabelRow(layer, box!);
    expect(labelRow).toBe(1);

    const patch = buildFillPatch(layer, box!, labelRow, "c1");
    const [next] = layer.apply(patch);
    const row = Array.from({ length: 10 }, (_, i) => next.get(new Vector(1 + i, 1)) ?? " ").join("");
    expect(row).toContain("CPU");
    expect(row).toContain("{c1}");
  });

  it("clears an existing fill tag", () => {
    const layer = textToLayer(
      ["+----------+", "| CPU {c2} |", "+----------+"].join("\n"),
      new Vector(0, 0)
    );
    const box = findBoxAt(layer, new Vector(5, 1))!;
    const patch = buildFillPatch(layer, box, pickLabelRow(layer, box), null);
    const [next] = layer.apply(patch);
    const row = Array.from({ length: 10 }, (_, i) => next.get(new Vector(1 + i, 1)) ?? " ").join("");
    expect(row).not.toContain("{c2}");
    expect(row).toContain("CPU");
  });

  it("replaces an existing fill tag with a custom RGB tag", () => {
    const layer = textToLayer(
      ["+---------------+", "| CPU {c10}     |", "+---------------+"].join("\n"),
      new Vector(0, 0)
    );
    const box = findBoxAt(layer, new Vector(5, 1))!;
    const patch = buildFillPatch(layer, box, pickLabelRow(layer, box), "#ff8800");
    const [next] = layer.apply(patch);
    const row = Array.from({ length: 15 }, (_, i) => next.get(new Vector(1 + i, 1)) ?? " ").join("");
    expect(row).not.toContain("{c10}");
    expect(row).toContain("{#ff8800}");
  });
});
