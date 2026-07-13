import { beforeEach, describe, expect, it } from "vitest";
import { DrawingId, store, ToolMode, useAppStore } from "#asciiflow/client/store";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

describe("DrawRaw", () => {
  let testId = 0;

  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      route: DrawingId.local(`raw-test-${testId++}`),
      selectedToolMode: ToolMode.RAW,
      freeformCharacter: "x",
      altPressed: false,
      currentCursor: "default",
      modifierKeys: {},
      canvasVersion: 0,
    });
    store.currentCanvas.clear();
    store.rawTool.cleanup();
  });

  it("inserts typed characters and shifts the rest of the row right", () => {
    store.currentCanvas.committed = textToLayer("ABCD", new Vector(0, 0));

    store.rawTool.start(new Vector(2, 0));
    store.rawTool.handleKey("X", {});

    expect(layerToText(store.currentCanvas.committed)).toBe("ABXCD");
    expect(store.rawTool.currentPosition).toEqual(new Vector(3, 0));
  });

  it("backspace removes the previous character and closes the row gap", () => {
    store.currentCanvas.committed = textToLayer("ABXCD", new Vector(0, 0));

    store.rawTool.start(new Vector(3, 0));
    store.rawTool.handleKey("<backspace>", {});

    expect(layerToText(store.currentCanvas.committed)).toBe("ABCD");
    expect(store.rawTool.currentPosition).toEqual(new Vector(2, 0));
  });

  it("delete removes the current character and closes the row gap", () => {
    store.currentCanvas.committed = textToLayer("ABXCD", new Vector(0, 0));

    store.rawTool.start(new Vector(2, 0));
    store.rawTool.handleKey("<delete>", {});

    expect(layerToText(store.currentCanvas.committed)).toBe("ABCD");
    expect(store.rawTool.currentPosition).toEqual(new Vector(2, 0));
  });

  it("moves the cursor with arrow keys without changing text", () => {
    store.currentCanvas.committed = textToLayer("AB", new Vector(0, 0));

    store.rawTool.start(new Vector(1, 0));
    store.rawTool.handleKey("<left>", {});
    store.rawTool.handleKey("<right>", {});

    expect(layerToText(store.currentCanvas.committed)).toBe("AB");
    expect(store.rawTool.currentPosition).toEqual(new Vector(1, 0));
  });

  it("moves left and right exactly one cell without clamping to content", () => {
    store.currentCanvas.committed = textToLayer("AB", new Vector(0, 0));

    store.rawTool.start(new Vector(0, 0));
    store.rawTool.handleKey("<left>", {});
    expect(store.rawTool.currentPosition).toEqual(new Vector(-1, 0));

    store.rawTool.handleKey("<right>", {});
    store.rawTool.handleKey("<right>", {});
    store.rawTool.handleKey("<right>", {});
    store.rawTool.handleKey("<right>", {});
    expect(store.rawTool.currentPosition).toEqual(new Vector(3, 0));
  });

  it("moves up and down exactly one row without clamping to content", () => {
    store.currentCanvas.committed = textToLayer(["ABCDE", "XY"].join("\n"), new Vector(0, 0));

    store.rawTool.start(new Vector(4, 0));
    store.rawTool.handleKey("<down>", {});
    expect(store.rawTool.currentPosition).toEqual(new Vector(4, 1));

    store.rawTool.handleKey("<up>", {});
    expect(store.rawTool.currentPosition).toEqual(new Vector(4, 0));

    store.rawTool.handleKey("<up>", {});
    expect(store.rawTool.currentPosition).toEqual(new Vector(4, -1));
  });

  it("enter inserts a blank row below the cursor", () => {
    store.currentCanvas.committed = textToLayer(["AAA", "BBB"].join("\n"), new Vector(0, 0));

    store.rawTool.start(new Vector(1, 0));
    store.rawTool.handleKey("<enter>", {});

    expect(layerToText(store.currentCanvas.committed)).toBe(
      ["AAA", "   ", "BBB"].join("\n")
    );
    expect(store.rawTool.currentPosition).toEqual(new Vector(1, 1));
  });

  it("cuts only the character at the raw cursor and closes the gap", () => {
    store.currentCanvas.committed = textToLayer(["AAA", "BCD", "CCC"].join("\n"), new Vector(0, 0));

    store.rawTool.start(new Vector(1, 1));
    const cutText = store.rawTool.cutAtCursor();

    expect(cutText).toBe("C");
    expect(store.currentCanvas.committed.get(new Vector(0, 1))).toBe("B");
    expect(store.currentCanvas.committed.get(new Vector(1, 1))).toBe("D");
    expect(store.currentCanvas.committed.get(new Vector(2, 1))).toBeNull();
    expect(store.currentCanvas.committed.get(new Vector(0, 0))).toBe("A");
    expect(store.currentCanvas.committed.get(new Vector(0, 2))).toBe("C");
    expect(store.rawTool.currentPosition).toEqual(new Vector(1, 1));
  });

  it("returns an empty cut without changing a blank raw cursor cell", () => {
    store.currentCanvas.committed = textToLayer("AB", new Vector(0, 0));

    store.rawTool.start(new Vector(3, 0));
    const cutText = store.rawTool.cutAtCursor();

    expect(cutText).toBe("");
    expect(layerToText(store.currentCanvas.committed)).toBe("AB");
    expect(store.rawTool.currentPosition).toEqual(new Vector(3, 0));
  });
});
