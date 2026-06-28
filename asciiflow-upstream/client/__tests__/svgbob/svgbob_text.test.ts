import { describe, expect, it } from "vitest";
import {
  applyFillStylesToSvg,
  collectFilledBoxes,
  collectFillTags,
  stripFillTags,
} from "#asciiflow/client/lib/svgbob/svgbob_text";

describe("svgbob_text", () => {
  it("collects fill tags from diagram text", () => {
    expect(collectFillTags("| CPU {c1} |\n| MEM {#ff8800} |")).toEqual(new Set(["c1", "#ff8800"]));
  });

  it("strips fill tags before svgbob rendering", () => {
    const out = stripFillTags("+---+\n| A {c2} |\n+---+");
    expect(out).not.toContain("{c2}");
    expect(out).toContain("| A      |");
  });

  it("collects the box that owns a fill tag", () => {
    const ascii = "+----------+\n| CPU {c2} |\n+----------+";
    expect(collectFilledBoxes(ascii)).toEqual([
      { top: 0, left: 0, bottom: 2, right: 11, tagId: "c2" },
    ]);
  });

  it("adds inline fill styles to the matching svgbob rect", () => {
    const ascii = "+----------+\n| CPU {c2} |\n+----------+";
    const svg =
      '<svg><rect x="4" y="8" width="88" height="32" class="solid nofill" rx="0"></rect></svg>';
    const out = applyFillStylesToSvg(svg, ascii);
    expect(out).toContain("fill:#dcfce7");
    expect(out).toContain("stroke:#16a34a");
    expect(out).not.toContain("nofill");
  });

  it("adds inline fill styles for custom RGB colors", () => {
    const ascii = "+---------------+\n| CPU {#ff8800} |\n+---------------+";
    const svg =
      '<svg><rect x="4" y="8" width="128" height="32" class="solid nofill" rx="0"></rect></svg>';
    const out = applyFillStylesToSvg(svg, ascii);
    expect(out).toContain("fill:#ff8800");
    expect(out).toContain("stroke:#944f00");
    expect(out).not.toContain("nofill");
  });

  it("collects custom fill tags placed just outside narrow boxes", () => {
    const ascii = [
      "+------------------+",
      '|   "DWC_usb3"     |',
      "| xHC + BMU + RAM0 |{#ff8800}",
      "+--------+---------+",
    ].join("\n");
    expect(collectFilledBoxes(ascii)).toEqual([
      { top: 0, left: 0, bottom: 3, right: 19, tagId: "#ff8800" },
    ]);
  });
});
