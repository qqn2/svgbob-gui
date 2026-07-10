import { describe, expect, it } from "vitest";
import { scalePlacementLayer } from "#asciiflow/client/draw/place_block_scale";
import {
  resolveSnippetText,
  SNIPPETS,
} from "#asciiflow/client/lib/snippets/snippets";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

function sortedMatches(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) => match[0]).sort();
}

function glyphCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const glyph of text) {
    if (glyph === " " || glyph === "\n" || glyph === "\r") continue;
    counts.set(glyph, (counts.get(glyph) ?? 0) + 1);
  }
  return counts;
}

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

  it("centers a compact label between scaled shape boundaries", () => {
    const scaled = scalePlacementLayer(textToLayer('+  "one"+'), 3);

    expect(layerToText(scaled)).toBe('+         "one"         +');
  });

  it("keeps an external label attached to its connector", () => {
    const scaled = scalePlacementLayer(textToLayer('----> "OUT"'), 3);

    expect(layerToText(scaled)).toBe('------------> "OUT"');
  });

  it("does not treat label letters as connector arrows", () => {
    const scaled = scalePlacementLayer(textToLayer("| Slave |\n| DATA[31:0] |"), 3);
    const text = layerToText(scaled);

    expect(text).toContain("Slave");
    expect(text).toContain("DATA[31:0]");
    expect(text).not.toContain("Sla      v");
    expect(text).not.toContain("DATA    [");
  });

  it("does not expand slash glyphs inside quoted labels", () => {
    const scaled = scalePlacementLayer(textToLayer('"Code / ROM"'), 2);

    expect(layerToText(scaled)).toBe('"Code / ROM"');
  });

  it("keeps slashes inside a multi-label row on the label row", () => {
    const scaled = scalePlacementLayer(
      textToLayer('| "Code / ROM"      "(512MiB)"|'),
      2
    );
    const lines = layerToText(scaled).split("\n");

    expect(lines.filter((line) => line.includes("/")).length).toBe(1);
  });

  it("does not move mem-map slashes into the row above their labels", () => {
    const snippet = SNIPPETS.find((candidate) => candidate.label === "mem map");
    if (!snippet) throw new Error("mem map snippet missing");
    const source = snippet.preview || resolveSnippetText(snippet);
    const scaled = layerToText(scalePlacementLayer(textToLayer(source), 2));
    const sourceSlashRows = source.split("\n").flatMap((line, index) => (
      line.includes("/") ? [index] : []
    ));
    const scaledSlashRows = scaled.split("\n").flatMap((line, index) => (
      line.includes("/") ? [index] : []
    ));

    expect(scaledSlashRows).toEqual(sourceSlashRows.map((index) => index * 2));
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

  it("expands standalone diagonal cells toward their upper endpoint", () => {
    const scaled = scalePlacementLayer(textToLayer(" /\\"), 3);

    expect(scaled.get(new Vector(3, 0))).toBe("/");
    expect(scaled.get(new Vector(4, -1))).toBe("/");
    expect(scaled.get(new Vector(5, -2))).toBe("/");
    expect(scaled.get(new Vector(6, 0))).toBe("\\");
    expect(scaled.get(new Vector(5, -1))).toBe("\\");
    expect(scaled.get(new Vector(4, -2))).toBe("\\");
  });

  it.each([2, 3])("preserves every snippet label exactly at %ix", (scale) => {
    for (const snippet of SNIPPETS) {
      const source = snippet.preview || resolveSnippetText(snippet);
      const scaled = layerToText(scalePlacementLayer(textToLayer(source), scale));
      expect(
        sortedMatches(scaled, /"[^"\n]*"/g),
        `${snippet.label} changed quoted label text`
      ).toEqual(sortedMatches(source, /"[^"\n]*"/g));
      expect(
        sortedMatches(scaled, /(?:\(\s?"[^"\n]*"\s?\)|\[\s?"[^"\n]*"\s?\])/g),
        `${snippet.label} expanded a quoted wrapper`
      ).toEqual(
        sortedMatches(source, /(?:\(\s?"[^"\n]*"\s?\)|\[\s?"[^"\n]*"\s?\])/g)
      );
      const sourceGlyphs = glyphCounts(source);
      const scaledGlyphs = glyphCounts(scaled);
      for (const [glyph, count] of sourceGlyphs) {
        expect(
          scaledGlyphs.get(glyph) ?? 0,
          `${snippet.label} lost ${JSON.stringify(glyph)} glyphs`
        ).toBeGreaterThanOrEqual(count);
      }
    }
  });

});
