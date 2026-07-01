import { beforeEach, describe, expect, it } from "vitest";
import { DrawingId, store, ToolMode, useAppStore } from "#asciiflow/client/store";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

describe("DrawText", () => {
  let testId = 0;

  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      route: DrawingId.local(`text-test-${testId++}`),
      selectedToolMode: ToolMode.TEXT,
      freeformCharacter: "x",
      altPressed: false,
      currentCursor: "default",
      modifierKeys: {},
      textQuoteMode: true,
      canvasVersion: 0,
    });
    store.currentCanvas.clear();
    store.currentCanvas.committed = textToLayer(
      ["+----+", "|    |", "+----+"].join("\n"),
      new Vector(0, 0)
    );
    store.textTool.cleanup();
  });

  it("appends typed characters and commits them as quoted box text", () => {
    store.textTool.start(new Vector(1, 1));
    for (const char of "AB") {
      store.textTool.handleKey(char, {});
    }
    store.textTool.handleKey("<enter>", {});

    expect(layerToText(store.currentCanvas.committed)).toBe(
      ['+----+', '|"AB"|', '+----+'].join("\n")
    );
  });

  it("commits outside text as quoted text when quote mode is on", () => {
    store.currentCanvas.clear();

    store.textTool.start(new Vector(3, 2));
    for (const char of "AB") {
      store.textTool.handleKey(char, {});
    }
    store.textTool.handleKey("<enter>", {});

    expect(layerToText(store.currentCanvas.committed)).toBe('"AB"');
  });

  it("commits raw text when quote mode is off", () => {
    store.setTextQuoteMode(false);

    store.textTool.start(new Vector(1, 1));
    for (const char of "AB") {
      store.textTool.handleKey(char, {});
    }
    store.textTool.handleKey("<enter>", {});

    expect(layerToText(store.currentCanvas.committed)).toBe(
      ['+----+', '|AB  |', '+----+'].join("\n")
    );
  });
});
