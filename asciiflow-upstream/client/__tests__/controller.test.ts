import { beforeEach, describe, expect, it, vi } from "vitest";
import { Controller } from "#asciiflow/client/controller";
import { DrawingId, store, ToolMode, useAppStore } from "#asciiflow/client/store";
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
    controller = new Controller();
    localStorage.clear();
    useAppStore.setState({
      route: DrawingId.local(`controller-test-${testId++}`),
      selectedToolMode: ToolMode.TEXT,
      freeformCharacter: "x",
      altPressed: false,
      currentCursor: "default",
      modifierKeys: {},
      canvasVersion: 0,
    });
    store.currentCanvas.clear();
    store.textTool.cleanup();
    store.rawTool.cleanup();
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

  it("dispatches arrow keys once from keydown", () => {
    store.setToolMode(ToolMode.RAW);
    store.rawTool.start(new Vector(1, 0));
    const spy = vi.spyOn(store.rawTool, "handleKey");

    controller.handleKeyDown(keyDown("ArrowLeft", { keyCode: 37 }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("<left>", {
      ctrl: false,
      shift: false,
      meta: false,
    });
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
});
