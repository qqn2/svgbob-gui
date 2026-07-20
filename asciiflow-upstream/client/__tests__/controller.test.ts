import { beforeEach, describe, expect, it, vi } from "vitest";
import { Box } from "#asciiflow/client/common";
import { Controller, isEditableTarget } from "#asciiflow/client/controller";
import { DrawingId, store, ToolMode, useAppStore } from "#asciiflow/client/store";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

function keyDown(
  key: string,
  overrides: Partial<KeyboardEvent> = {}
): KeyboardEvent {
  return {
    key,
    keyCode: key.length === 1 ? key.charCodeAt(0) : 0,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    isComposing: false,
    target: { tagName: "DIV", isContentEditable: false } as EventTarget,
    preventDefault: vi.fn(),
    ...overrides,
  } as KeyboardEvent;
}

describe("Controller keyboard dispatch", () => {
  let controller: Controller;
  let testId = 0;

  beforeEach(() => {
    vi.restoreAllMocks();
    controller = new Controller();
    localStorage.clear();
    useAppStore.setState({
      route: DrawingId.local(`controller-test-${testId++}`),
      selectedToolMode: ToolMode.TEXT,
      freeformCharacter: "x",
      altPressed: false,
      currentCursor: "default",
      modifierKeys: {},
      cursorCell: null,
      canvasVersion: 0,
    });
    store.currentCanvas.clear();
    store.textTool.cleanup();
  });

  it("identifies native editable targets for keyboard and clipboard handlers", () => {
    expect(isEditableTarget({ tagName: "INPUT", isContentEditable: false } as HTMLInputElement)).toBe(true);
    expect(isEditableTarget({ tagName: "TEXTAREA", isContentEditable: false } as HTMLTextAreaElement)).toBe(true);
    expect(isEditableTarget({ tagName: "DIV", isContentEditable: true } as HTMLDivElement)).toBe(true);
    expect(isEditableTarget({ tagName: "CANVAS", isContentEditable: false } as HTMLCanvasElement)).toBe(false);
  });

  it("dispatches a printable key once from keydown", () => {
    store.setToolMode(ToolMode.TEXT);
    store.textTool.start(new Vector(1, 1));
    const spy = vi.spyOn(store.textTool, "handleKey");

    controller.handleKeyDown(keyDown("d"));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("d", {
      ctrl: false,
      shift: false,
      meta: false,
    });
  });

  it("leaves raw editor keys to its contenteditable surface", () => {
    store.setToolMode(ToolMode.RAW);
    const spy = vi.spyOn(store.nullTool, "handleKey");
    const editor = {
      tagName: "DIV",
      isContentEditable: true,
    } as HTMLDivElement;

    controller.handleKeyDown(
      keyDown("ArrowLeft", { keyCode: 37, target: editor })
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it("ignores printable keys while ctrl is held", () => {
    store.setToolMode(ToolMode.TEXT);
    store.textTool.start(new Vector(1, 1));
    const spy = vi.spyOn(store.textTool, "handleKey");

    controller.handleKeyDown(keyDown("d", { ctrlKey: true }));

    expect(spy).not.toHaveBeenCalled();
  });

  it("ignores keys when focus is in an input", () => {
    store.setToolMode(ToolMode.TEXT);
    store.textTool.start(new Vector(1, 1));
    const spy = vi.spyOn(store.textTool, "handleKey");
    const input = {
      tagName: "INPUT",
      isContentEditable: false,
    } as HTMLInputElement;

    controller.handleKeyDown(keyDown("d", { target: input }));

    expect(spy).not.toHaveBeenCalled();
  });

  it("undoes committed edits with ctrl+z", () => {
    store.currentCanvas.setScratchLayer(textToLayer("A", new Vector(0, 0)));
    store.currentCanvas.commitScratch();
    expect(layerToText(store.currentCanvas.committed)).toBe("A");

    const event = keyDown("z", { ctrlKey: true, keyCode: 0 });
    controller.handleKeyDown(event);

    expect(layerToText(store.currentCanvas.committed)).toBe("");
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("switches delete and backspace to erase outside raw mode", () => {
    store.setToolMode(ToolMode.TEXT);

    const backspace = keyDown("Backspace", { keyCode: 8 });
    controller.handleKeyDown(backspace);
    expect(store.selectedToolMode).toBe(ToolMode.ERASE);
    expect(backspace.preventDefault).toHaveBeenCalled();

    store.setToolMode(ToolMode.SELECT);
    const del = keyDown("Delete", { keyCode: 46 });
    controller.handleKeyDown(del);
    expect(store.selectedToolMode).toBe(ToolMode.ERASE);
    expect(del.preventDefault).toHaveBeenCalled();
  });

  it("cancels transient state with escape", () => {
    store.setToolMode(ToolMode.SELECT);
    const box = new Box(new Vector(0, 0), new Vector(1, 1));
    store.selectTool.selectBox = box;
    store.currentCanvas.setSelection(box);
    store.currentCanvas.setScratchLayer(textToLayer("A", new Vector(0, 0)));
    store.setFillStatus({ message: "Box detected", tone: "ok" });

    const event = keyDown("Escape", { keyCode: 27 });
    controller.handleKeyDown(event);

    expect(store.selectTool.selectBox).toBeNull();
    expect(store.currentCanvas.selection).toBeNull();
    expect(store.currentCanvas.scratch.size()).toBe(0);
    expect(store.fillStatus).toBeNull();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("cancels block placement with escape even when a blocks input has focus", () => {
    store.setCursorCell({ x: 0, y: 0 });
    store.placeBlockTool.begin("+--+\n|  |\n+--+");
    expect(store.placeBlockTool.isActive).toBe(true);
    expect(store.currentCanvas.scratch.size()).toBeGreaterThan(0);

    const input = {
      tagName: "INPUT",
      isContentEditable: false,
    } as HTMLInputElement;
    const event = keyDown("Escape", { keyCode: 27, target: input });

    controller.handleKeyDown(event);

    expect(store.placeBlockTool.isActive).toBe(false);
    expect(store.currentCanvas.scratch.size()).toBe(0);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("leaves ctrl+x for the native cut event", () => {
    store.setToolMode(ToolMode.TEXT);
    store.textTool.start(new Vector(1, 1));
    const spy = vi.spyOn(store.textTool, "handleKey");
    const event = keyDown("x", { ctrlKey: true });

    controller.handleKeyDown(event);

    expect(spy).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
