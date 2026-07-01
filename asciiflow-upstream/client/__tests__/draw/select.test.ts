import { describe, expect, it, beforeEach } from "vitest";
import { Box } from "#asciiflow/client/common";
import { UNICODE } from "#asciiflow/client/constants";
import { DrawingId, store, ToolMode, useAppStore } from "#asciiflow/client/store";
import { Vector } from "#asciiflow/client/vector";

describe("DrawSelect", () => {
  let testId = 0;

  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      route: DrawingId.local(`select-test-${testId++}`),
      selectedToolMode: ToolMode.SELECT,
      freeformCharacter: "x",
      altPressed: false,
      currentCursor: "default",
      modifierKeys: {},
      canvasVersion: 0,
    });
    store.currentCanvas.clear();
    store.selectTool.cleanup();
  });

  it("extends the selection when shift-dragging an edge", () => {
    const tool = store.selectTool;
    tool.selectBox = new Box(new Vector(2, 2), new Vector(4, 4));
    store.currentCanvas.setSelection(tool.selectBox);

    tool.start(new Vector(4, 3), { shift: true });
    tool.move(new Vector(7, 3));
    tool.end();

    expect(tool.selectBox.topLeft().equals(new Vector(2, 2))).toBe(true);
    expect(tool.selectBox.bottomRight().equals(new Vector(7, 4))).toBe(true);
  });

  it("closes a horizontal edge gap when shift-dragging along the edge", () => {
    const canvas = store.currentCanvas;
    canvas.committed.set(new Vector(2, 2), UNICODE.cornerTopLeft);
    canvas.committed.set(new Vector(3, 2), UNICODE.lineHorizontal);
    canvas.committed.set(new Vector(6, 2), UNICODE.lineHorizontal);
    canvas.committed.set(new Vector(7, 2), UNICODE.cornerTopRight);
    canvas.committed.set(new Vector(2, 3), UNICODE.lineVertical);
    canvas.committed.set(new Vector(7, 3), UNICODE.lineVertical);
    canvas.committed.set(new Vector(2, 4), UNICODE.cornerBottomLeft);
    canvas.committed.set(new Vector(3, 4), UNICODE.lineHorizontal);
    canvas.committed.set(new Vector(4, 4), UNICODE.lineHorizontal);
    canvas.committed.set(new Vector(5, 4), UNICODE.lineHorizontal);
    canvas.committed.set(new Vector(6, 4), UNICODE.lineHorizontal);
    canvas.committed.set(new Vector(7, 4), UNICODE.cornerBottomRight);

    const tool = store.selectTool;
    tool.selectBox = new Box(new Vector(2, 2), new Vector(7, 4));
    canvas.setSelection(tool.selectBox);

    tool.start(new Vector(3, 2), { shift: true });
    tool.move(new Vector(7, 2));
    tool.end();

    expect(canvas.committed.get(new Vector(4, 2))).toBe(UNICODE.lineHorizontal);
    expect(canvas.committed.get(new Vector(5, 2))).toBe(UNICODE.lineHorizontal);
    expect(canvas.committed.get(new Vector(7, 2))).toBe(UNICODE.cornerTopRight);
    expect(tool.selectBox.topLeft().equals(new Vector(2, 2))).toBe(true);
    expect(tool.selectBox.bottomRight().equals(new Vector(7, 4))).toBe(true);
  });

  it("closes a horizontal edge gap when dragging a line segment directly", () => {
    const canvas = store.currentCanvas;
    canvas.committed.set(new Vector(2, 2), UNICODE.cornerTopLeft);
    canvas.committed.set(new Vector(3, 2), UNICODE.lineHorizontal);
    canvas.committed.set(new Vector(6, 2), UNICODE.lineHorizontal);
    canvas.committed.set(new Vector(7, 2), UNICODE.cornerTopRight);

    const tool = store.selectTool;
    tool.start(new Vector(3, 2), {});
    tool.move(new Vector(7, 2));
    tool.end();

    expect(canvas.committed.get(new Vector(4, 2))).toBe(UNICODE.lineHorizontal);
    expect(canvas.committed.get(new Vector(5, 2))).toBe(UNICODE.lineHorizontal);
    expect(canvas.committed.get(new Vector(7, 2))).toBe(UNICODE.cornerTopRight);
  });

  it("closes a vertical edge gap when shift-dragging along the edge", () => {
    const canvas = store.currentCanvas;
    canvas.committed.set(new Vector(2, 2), UNICODE.cornerTopLeft);
    canvas.committed.set(new Vector(3, 2), UNICODE.lineHorizontal);
    canvas.committed.set(new Vector(4, 2), UNICODE.cornerTopRight);
    canvas.committed.set(new Vector(2, 3), UNICODE.lineVertical);
    canvas.committed.set(new Vector(2, 6), UNICODE.lineVertical);
    canvas.committed.set(new Vector(4, 3), UNICODE.lineVertical);
    canvas.committed.set(new Vector(4, 4), UNICODE.lineVertical);
    canvas.committed.set(new Vector(4, 5), UNICODE.lineVertical);
    canvas.committed.set(new Vector(4, 6), UNICODE.lineVertical);
    canvas.committed.set(new Vector(2, 7), UNICODE.cornerBottomLeft);
    canvas.committed.set(new Vector(3, 7), UNICODE.lineHorizontal);
    canvas.committed.set(new Vector(4, 7), UNICODE.cornerBottomRight);

    const tool = store.selectTool;
    tool.selectBox = new Box(new Vector(2, 2), new Vector(4, 7));
    canvas.setSelection(tool.selectBox);

    tool.start(new Vector(2, 3), { shift: true });
    tool.move(new Vector(2, 6));
    tool.end();

    expect(canvas.committed.get(new Vector(2, 4))).toBe(UNICODE.lineVertical);
    expect(canvas.committed.get(new Vector(2, 5))).toBe(UNICODE.lineVertical);
    expect(tool.selectBox.topLeft().equals(new Vector(2, 2))).toBe(true);
    expect(tool.selectBox.bottomRight().equals(new Vector(4, 7))).toBe(true);
  });

  it("closes a vertical edge gap when dragging a line segment directly", () => {
    const canvas = store.currentCanvas;
    canvas.committed.set(new Vector(2, 2), UNICODE.cornerTopLeft);
    canvas.committed.set(new Vector(2, 3), UNICODE.lineVertical);
    canvas.committed.set(new Vector(2, 6), UNICODE.lineVertical);
    canvas.committed.set(new Vector(2, 7), UNICODE.cornerBottomLeft);

    const tool = store.selectTool;
    tool.start(new Vector(2, 3), {});
    tool.move(new Vector(2, 7));
    tool.end();

    expect(canvas.committed.get(new Vector(2, 4))).toBe(UNICODE.lineVertical);
    expect(canvas.committed.get(new Vector(2, 5))).toBe(UNICODE.lineVertical);
    expect(canvas.committed.get(new Vector(2, 7))).toBe(UNICODE.cornerBottomLeft);
  });

  it("moves selected content when dragging the interior", () => {
    const canvas = store.currentCanvas;
    canvas.committed.set(new Vector(3, 3), "x");

    const tool = store.selectTool;
    tool.selectBox = new Box(new Vector(2, 2), new Vector(4, 4));
    canvas.setSelection(tool.selectBox);

    tool.start(new Vector(3, 3), {});
    tool.move(new Vector(5, 3));
    tool.end();

    expect(canvas.committed.get(new Vector(3, 3))).toBe(null);
    expect(canvas.committed.get(new Vector(5, 3))).toBe("x");
  });
});
