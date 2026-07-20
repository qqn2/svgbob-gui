import { beforeEach, describe, expect, it } from "vitest";
import { Layer } from "#asciiflow/client/layer";
import {
  rawEditorDocument,
  rawEditorLayer,
} from "#asciiflow/client/raw_editor_model";
import { CanvasStore } from "#asciiflow/client/store/canvas";
import { DrawingId } from "#asciiflow/client/store";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

describe("raw editor model", () => {
  beforeEach(() => localStorage.clear());

  it("preserves the diagram origin while roundtripping editor text", () => {
    const source = textToLayer("A B\n C ", new Vector(-3, 7));
    const document = rawEditorDocument(source, new Vector(100, 100));

    expect(document.origin).toEqual(new Vector(-3, 7));
    expect(document.text).toBe("A B\n C ");
    expect(rawEditorLayer(document.text, document.origin).entries()).toEqual(
      source.entries()
    );
  });

  it("uses the visible fallback origin for an empty diagram", () => {
    const fallback = new Vector(25, 40);
    expect(rawEditorDocument(new Layer(), fallback)).toEqual({
      text: "",
      origin: fallback,
    });
  });

  it("records a raw editing session as one canvas undo checkpoint", () => {
    const canvas = new CanvasStore(DrawingId.local("raw-session"), () => {});
    canvas.committed = textToLayer("AB", new Vector(5, 4));
    const initial = canvas.committed;

    canvas.replaceCommittedTransient(textToLayer("AXB", new Vector(5, 4)));
    canvas.replaceCommittedTransient(textToLayer("AXYB", new Vector(5, 4)));
    canvas.finishTransientEdit(initial);

    expect(layerToText(canvas.committed)).toBe("AXYB");
    canvas.undo();
    expect(layerToText(canvas.committed)).toBe("AB");
    canvas.redo();
    expect(layerToText(canvas.committed)).toBe("AXYB");
  });
});
