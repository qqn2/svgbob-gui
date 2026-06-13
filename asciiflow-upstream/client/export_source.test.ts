import { describe, expect, it } from "vitest";
import { DrawingId } from "#asciiflow/client/store";
import { CanvasStore } from "#asciiflow/client/store/canvas";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";
import { buildShareUrl } from "#asciiflow/client/svgbob_storage";

describe("export source ASCII", () => {
  it("combined includes scratch while committed does not", () => {
    const canvas = new CanvasStore(DrawingId.local("export-source-test"), () => {});
    canvas.setScratchLayer(textToLayer("GHOST", new Vector(2, 2)));
    const combined = layerToText(canvas.combined);
    const committed = layerToText(canvas.committed);
    expect(combined).toContain("G");
    expect(committed).not.toContain("G");
  });

  it("share URL encodes committed ASCII only", () => {
    const canvas = new CanvasStore(DrawingId.local("share-source-test"), () => {});
    canvas.setScratchLayer(textToLayer("A", new Vector(0, 0)));
    canvas.commitScratch();
    canvas.setScratchLayer(textToLayer("GHOST", new Vector(5, 5)));
    const committedOnly = layerToText(canvas.committed);
    const combined = layerToText(canvas.combined);
    const url = buildShareUrl(committedOnly);
    expect(url).toBeTruthy();
    expect(url).toContain("#/bob/");
    expect(buildShareUrl(combined)).not.toBe(url);
  });
});
