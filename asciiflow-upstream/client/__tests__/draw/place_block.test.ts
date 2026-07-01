import { beforeEach, describe, expect, it } from "vitest";
import { DrawingId, store, ToolMode, useAppStore } from "#asciiflow/client/store";
import { Vector } from "#asciiflow/client/vector";

describe("DrawPlaceBlock", () => {
  let testId = 0;

  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      route: DrawingId.local(`place-block-test-${testId++}`),
      selectedToolMode: ToolMode.BOX,
      freeformCharacter: "x",
      altPressed: false,
      currentCursor: "default",
      modifierKeys: {},
      canvasVersion: 0,
    });
    store.currentCanvas.clear();
    store.placeBlockTool.cleanup();
  });

  it("cleans up block placement after a successful place", () => {
    store.placeBlockTool.begin("A");

    store.placeBlockTool.place(new Vector(4, 5));

    expect(store.currentCanvas.committed.get(new Vector(4, 5))).toBe("A");
    expect(store.currentCanvas.scratch.size()).toBe(0);
    expect(store.placeBlockTool.isActive).toBe(false);
  });

  it("keeps placement active when overlap blocks the place", () => {
    store.currentCanvas.committed.set(new Vector(4, 5), "X");
    store.placeBlockTool.begin("A");

    store.placeBlockTool.place(new Vector(4, 5));

    expect(store.currentCanvas.committed.get(new Vector(4, 5))).toBe("X");
    expect(store.currentCanvas.scratch.size()).toBeGreaterThan(0);
    expect(store.placeBlockTool.isActive).toBe(true);
  });
});
