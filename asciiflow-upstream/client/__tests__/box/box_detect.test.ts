import { describe, expect, it } from "vitest";
import { buildFillPatch, findBoxAt, pickLabelRow } from "#asciiflow/client/lib/box/box_detect";
import { UNICODE } from "#asciiflow/client/constants";
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

  it("expands narrow labeled boxes to fit custom RGB metadata", () => {
    const layer = textToLayer(
      [
        "+------------------+",
        '|   "DWC_usb3"     |',
        "| xHC + BMU + RAM0 |",
        "+--------+---------+",
      ].join("\n"),
      new Vector(0, 0)
    );
    const box = findBoxAt(layer, new Vector(5, 1))!;
    const patch = buildFillPatch(layer, box, pickLabelRow(layer, box), "#ff8800");
    const [next] = layer.apply(patch);
    const expandedBox = findBoxAt(next, new Vector(5, 1))!;
    const labelRow = Array.from({ length: expandedBox.right - expandedBox.left - 1 }, (_, i) =>
      next.get(new Vector(1 + i, 2)) ?? " "
    ).join("");

    expect(labelRow).toContain("xHC + BMU + RAM0");
    expect(labelRow).toContain("{#ff8800}");
    expect(expandedBox.right).toBeGreaterThan(box.right);
  });

  it("forces expansion even when cells to the right are occupied", () => {
    const layer = textToLayer(
      ["+---+BUS", "| X |   ", "+---+   "].join("\n"),
      new Vector(0, 0)
    );
    const box = findBoxAt(layer, new Vector(2, 1))!;
    const patch = buildFillPatch(layer, box, pickLabelRow(layer, box), "#ff8800");
    const [next] = layer.apply(patch);
    const expandedBox = findBoxAt(next, new Vector(2, 1))!;
    const labelRow = Array.from({ length: expandedBox.right - expandedBox.left - 1 }, (_, i) =>
      next.get(new Vector(1 + i, 1)) ?? " "
    ).join("");

    expect(labelRow).toContain("X {#ff8800}");
    expect(next.get(new Vector(expandedBox.right, 1))).toBe("|");
    expect(expandedBox.right).toBeGreaterThan(box.right);
  });

  it("moves existing fill tags from non-label rows onto the label row", () => {
    const layer = textToLayer(
      [
        "+---------+",
        "| {c6}    |",
        "| STAGE 1 |",
        "+---------+",
      ].join("\n"),
      new Vector(0, 0)
    );
    const box = findBoxAt(layer, new Vector(3, 1))!;
    const patch = buildFillPatch(layer, box, pickLabelRow(layer, box), "c6");
    const [next] = layer.apply(patch);
    const metadataRow = Array.from({ length: 9 }, (_, i) =>
      next.get(new Vector(1 + i, 1)) ?? " "
    ).join("");
    const labelRow = Array.from({ length: 14 }, (_, i) =>
      next.get(new Vector(1 + i, 2)) ?? " "
    ).join("");

    expect(metadataRow).not.toContain("{c6}");
    expect(labelRow).toContain("STAGE 1 {c6}");
  });

  it("redraws an outgoing connector when an expanded box pushes the right edge", () => {
    const layer = textToLayer(
      [
        "+-------+     +-------+",
        "| STAGE |---->| NEXT  |",
        "+-------+     +-------+",
      ].join("\n"),
      new Vector(0, 0)
    );
    const box = findBoxAt(layer, new Vector(3, 1))!;
    const patch = buildFillPatch(layer, box, pickLabelRow(layer, box), "c6");
    const [next] = layer.apply(patch);
    const expandedBox = findBoxAt(next, new Vector(3, 1))!;
    const labelRow = Array.from({ length: expandedBox.right - expandedBox.left - 1 }, (_, i) =>
      next.get(new Vector(1 + i, 1)) ?? " "
    ).join("");
    const connector = Array.from(
      { length: 5 },
      (_, i) => next.get(new Vector(expandedBox.right + 1 + i, 1)) ?? " "
    ).join("");

    expect(labelRow).toContain("STAGE {c6}");
    expect(expandedBox.right).toBeGreaterThan(box.right);
    expect(connector).toContain(UNICODE.arrowRight);
  });

  it("detects boxes whose side walls contain outgoing connector junctions", () => {
    const h = UNICODE.lineHorizontal;
    const v = UNICODE.lineVertical;
    const tl = UNICODE.cornerTopLeft;
    const tr = UNICODE.cornerTopRight;
    const bl = UNICODE.cornerBottomLeft;
    const br = UNICODE.cornerBottomRight;
    const teeRight = UNICODE.junctionRight;
    const arrow = UNICODE.arrowRight;
    const gap = "     ";
    const connector = `${h}${h}${h}${h}${arrow}`;
    const layer = textToLayer(
      [
        `${tl}${h.repeat(10)}${tr}${gap}${tl}${h.repeat(10)}${tr}${gap}${tl}${h.repeat(10)}${tr}`,
        `${v}          ${v}${gap}${v}          ${v}${gap}${v}          ${v}`,
        `${v}"STAGE 1" ${teeRight}${connector}${v}"STAGE 2" ${teeRight}${connector}${v}"STAGE 3" ${v}`,
        `${v}          ${v}${gap}${v}          ${v}${gap}${v}          ${v}`,
        `${bl}${h.repeat(10)}${br}${gap}${bl}${h.repeat(10)}${br}${gap}${bl}${h.repeat(10)}${br}`,
      ].join("\n")
    );

    expect(findBoxAt(layer, new Vector(3, 2))).toEqual({
      top: 0,
      left: 0,
      bottom: 4,
      right: 11,
    });
    expect(findBoxAt(layer, new Vector(20, 2))).toEqual({
      top: 0,
      left: 17,
      bottom: 4,
      right: 28,
    });
    expect(findBoxAt(layer, new Vector(37, 2))).toEqual({
      top: 0,
      left: 34,
      bottom: 4,
      right: 45,
    });
  });
});
