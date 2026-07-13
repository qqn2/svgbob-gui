import { describe, expect, it } from "vitest";
import {
  anchorForCursor,
  flipLayerH,
  flipLayerV,
  layerBBox,
  layerOverlapsCommitted,
  offsetLayer,
  rotatePlacementLayer,
  rotateLayer90CW,
  snapAnchor,
} from "#asciiflow/client/layer_placement";
import { Layer } from "#asciiflow/client/layer";
import { UNICODE } from "#asciiflow/client/constants";
import {
  resolveSnippetText,
  SNIPPETS,
} from "#asciiflow/client/lib/snippets/snippets";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
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

  it("overlap flag blocks commit semantics (ghost on committed cell)", () => {
    const committed = textToLayer("A", new Vector(0, 0));
    const ghost = offsetLayer(textToLayer("B", new Vector(0, 0)), new Vector(0, 0));
    expect(layerOverlapsCommitted(ghost, committed)).toBe(true);
  });

  it("snaps anchor near committed edges", () => {
    const committed = textToLayer("XX", new Vector(10, 10));
    const snapped = snapAnchor(new Vector(12, 11), committed, 2);
    expect(snapped.x).toBe(12);
    expect(snapped.y).toBe(11);
  });

  it("rotates drawing glyphs as well as their coordinates", () => {
    const source = [
      `${UNICODE.cornerTopLeft}${UNICODE.lineHorizontal}${UNICODE.arrowRight}`,
      `${UNICODE.lineVertical} /`,
      `${UNICODE.cornerBottomLeft}${UNICODE.junctionUp}${UNICODE.cornerBottomRight}`,
    ].join("\n");

    const rotated = rotateLayer90CW(textToLayer(source));

    expect(layerToText(rotated)).toBe([
      `${UNICODE.cornerTopLeft}${UNICODE.lineHorizontal}${UNICODE.cornerTopRight}`,
      `${UNICODE.junctionRight} ${UNICODE.lineVertical}`,
      `${UNICODE.cornerBottomLeft}\\${UNICODE.arrowDown}`,
    ].join("\n"));
  });

  it("restores every drawing glyph after four rotations", () => {
    const source = [
      UNICODE.cornerTopLeft,
      UNICODE.cornerTopRight,
      UNICODE.cornerBottomRight,
      UNICODE.cornerBottomLeft,
      UNICODE.lineHorizontal,
      UNICODE.lineVertical,
      UNICODE.junctionDown,
      UNICODE.junctionLeft,
      UNICODE.junctionUp,
      UNICODE.junctionRight,
      UNICODE.junctionAll,
      UNICODE.arrowRight,
      UNICODE.arrowDown,
      UNICODE.arrowLeft,
      UNICODE.arrowUp,
      "/",
      "\\",
    ].join("");
    let layer = textToLayer(source);

    for (let i = 0; i < 4; i++) layer = rotateLayer90CW(layer);

    expect(layerToText(layer)).toBe(source);
  });

  it("restores punctuation inside labels after four rotations", () => {
    const source = '"A-B / C"';
    let layer = textToLayer(source);

    for (let i = 0; i < 4; i++) layer = rotateLayer90CW(layer);

    expect(layerToText(layer)).toBe(source);
  });

  it("flips corners, junctions, arrows, and diagonals correctly", () => {
    const source = [
      `${UNICODE.cornerTopLeft}${UNICODE.junctionDown}${UNICODE.cornerTopRight}${UNICODE.arrowRight}/`,
      `${UNICODE.cornerBottomLeft}${UNICODE.junctionUp}${UNICODE.cornerBottomRight}${UNICODE.arrowUp}\\`,
    ].join("\n");

    expect(layerToText(flipLayerH(textToLayer(source)))).toBe([
      `\\${UNICODE.arrowLeft}${UNICODE.cornerTopLeft}${UNICODE.junctionDown}${UNICODE.cornerTopRight}`,
      `/${UNICODE.arrowUp}${UNICODE.cornerBottomLeft}${UNICODE.junctionUp}${UNICODE.cornerBottomRight}`,
    ].join("\n"));
    expect(layerToText(flipLayerV(textToLayer(source)))).toBe([
      `${UNICODE.cornerTopLeft}${UNICODE.junctionDown}${UNICODE.cornerTopRight}${UNICODE.arrowDown}/`,
      `${UNICODE.cornerBottomLeft}${UNICODE.junctionUp}${UNICODE.cornerBottomRight}${UNICODE.arrowRight}\\`,
    ].join("\n"));
  });

  it("keeps quoted labels readable during horizontal flips", () => {
    const source = `${UNICODE.cornerTopLeft}${UNICODE.lineHorizontal}${UNICODE.lineHorizontal}${UNICODE.lineHorizontal}${UNICODE.lineHorizontal}${UNICODE.lineHorizontal}${UNICODE.lineHorizontal}${UNICODE.cornerTopRight}\n${UNICODE.lineVertical}"A- B"${UNICODE.lineVertical}\n${UNICODE.cornerBottomLeft}${UNICODE.lineHorizontal}${UNICODE.lineHorizontal}${UNICODE.lineHorizontal}${UNICODE.lineHorizontal}${UNICODE.lineHorizontal}${UNICODE.lineHorizontal}${UNICODE.cornerBottomRight}`;

    expect(layerToText(flipLayerH(textToLayer(source)))).toBe(source);
  });

  it("keeps an enclosed label horizontal and widens its rotated box", () => {
    const edge = UNICODE.lineHorizontal.repeat(7);
    const source = [
      `${UNICODE.cornerTopLeft}${edge}${UNICODE.cornerTopRight}`,
      `${UNICODE.lineVertical}"LABEL"${UNICODE.lineVertical}`,
      `${UNICODE.cornerBottomLeft}${edge}${UNICODE.cornerBottomRight}`,
    ].join("\n");
    const emptyRow = `${UNICODE.lineVertical}${" ".repeat(7)}${UNICODE.lineVertical}`;

    expect(layerToText(rotatePlacementLayer(textToLayer(source), 1))).toBe([
      `${UNICODE.cornerTopLeft}${edge}${UNICODE.cornerTopRight}`,
      emptyRow,
      emptyRow,
      emptyRow,
      `${UNICODE.lineVertical}"LABEL"${UNICODE.lineVertical}`,
      emptyRow,
      emptyRow,
      emptyRow,
      `${UNICODE.cornerBottomLeft}${edge}${UNICODE.cornerBottomRight}`,
    ].join("\n"));
  });

  it("round-trips every reusable block through rotations and flips", () => {
    for (const snippet of SNIPPETS) {
      const source = layerToText(textToLayer(resolveSnippetText(snippet)));

      let rotated = textToLayer(source);
      for (let i = 0; i < 4; i++) rotated = rotateLayer90CW(rotated);
      expect(layerToText(rotated), `${snippet.label}: rotate`).toBe(source);

      const horizontal = flipLayerH(flipLayerH(textToLayer(source)));
      expect(layerToText(horizontal), `${snippet.label}: horizontal`).toBe(source);

      const vertical = flipLayerV(flipLayerV(textToLayer(source)));
      expect(layerToText(vertical), `${snippet.label}: vertical`).toBe(source);
    }
  });

  it("keeps every quoted block label horizontal at 90-degree orientations", () => {
    for (const snippet of SNIPPETS) {
      const source = layerToText(textToLayer(resolveSnippetText(snippet)));
      const labels = source.match(/"[^"]*"/g) ?? [];
      const sourceBox = layerBBox(textToLayer(source))!;

      for (const turns of [1, 3]) {
        const rotated = rotatePlacementLayer(textToLayer(source), turns);
        const text = layerToText(rotated);
        const box = layerBBox(rotated)!;
        for (const label of labels) {
          expect(text, `${snippet.label}: ${turns * 90}deg ${label}`).toContain(label);
        }
        expect(box.right() - box.left(), `${snippet.label}: rotated width`).toBeLessThan(
          sourceBox.right() - sourceBox.left() + 80
        );
      }
    }
  });
});
