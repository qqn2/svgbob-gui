import { describe, expect, it, beforeEach } from "vitest";
import { DrawingId, store, ToolMode, useAppStore } from "#asciiflow/client/store";
import { textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

describe("DrawFill", () => {
  let testId = 0;

  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      route: DrawingId.local(`fill-test-${testId++}`),
      selectedToolMode: ToolMode.FILL,
      selectedFillTag: "c1",
      freeformCharacter: "x",
      altPressed: false,
      currentCursor: "default",
      modifierKeys: {},
      fillForceMode: true,
      fillStatus: null,
      canvasVersion: 0,
    });
    store.currentCanvas.clear();
  });

  it("writes the selected fill tag when no box is detected", () => {
    store.fillTool.start(new Vector(3, 4));

    const text = "{c1}";
    for (let i = 0; i < text.length; i++) {
      expect(store.currentCanvas.committed.get(new Vector(3 + i, 4))).toBe(
        text[i]
      );
    }
    expect(store.fillStatus?.message).toContain("force writes tag");
    expect(store.fillStatus?.tone).toBe("warn");
  });

  it("does not write outside a box when force mode is off", () => {
    store.setFillForceMode(false);

    store.fillTool.start(new Vector(3, 4));

    expect(store.currentCanvas.committed.get(new Vector(3, 4))).toBe(null);
    expect(store.fillStatus?.message).toContain("force is off");
    expect(store.fillStatus?.tone).toBe("muted");
  });

  it("previews fill patch and reports a detected box with enough space", () => {
    store.currentCanvas.committed = textToLayer(
      [
        "+-------+",
        "| STAGE |",
        "+-------+",
      ].join("\n")
    );

    store.fillTool.getCursor(new Vector(3, 1));

    expect(store.fillStatus?.message).toContain("box detected");
    expect(store.fillStatus?.message).toContain("space ok");
    expect(store.fillStatus?.tone).toBe("ok");
    expect(store.fillStatus?.box).toEqual({
      left: 0,
      top: 0,
      right: 8,
      bottom: 2,
    });
    expect(store.currentCanvas.scratch.size()).toBeGreaterThan(0);
  });

  it("reports overflow when fill expansion would hit occupied cells", () => {
    store.currentCanvas.committed = textToLayer(
      [
        "+-------+X",
        "| STAGE |X",
        "+-------+X",
      ].join("\n")
    );

    store.fillTool.getCursor(new Vector(3, 1));

    expect(store.fillStatus?.message).toContain("overflow");
    expect(store.fillStatus?.overflowCount).toBeGreaterThan(0);
    expect(store.fillStatus?.tone).toBe("warn");
  });

  it("clears fill preview and status on cleanup", () => {
    store.fillTool.getCursor(new Vector(3, 4));

    expect(store.currentCanvas.scratch.size()).toBeGreaterThan(0);

    store.fillTool.cleanup();

    expect(store.currentCanvas.scratch.size()).toBe(0);
    expect(store.fillStatus).toBe(null);
  });
});
