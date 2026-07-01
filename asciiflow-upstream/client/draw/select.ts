import { Box } from "#asciiflow/client/common";
import {
  isSpecial,
  KEY_BACKSPACE,
  KEY_DELETE,
  UNICODE,
} from "#asciiflow/client/constants";
import { AbstractDrawFunction } from "#asciiflow/client/draw/function";
import { DrawMove } from "#asciiflow/client/draw/move";
import { Layer } from "#asciiflow/client/layer";
import { snap } from "#asciiflow/client/snap";
import { IModifierKeys, store } from "#asciiflow/client/store";
import { Vector } from "#asciiflow/client/vector";

export class DrawSelect extends AbstractDrawFunction {
  private moveTool: DrawMove;

  public selectBox: Box;

  private resizeStartBox: Box;
  private resizeLeft: boolean;
  private resizeRight: boolean;
  private resizeTop: boolean;
  private resizeBottom: boolean;
  private resizeStartPosition: Vector;
  private edgeRepairActive: boolean;
  private dragStart: Vector;
  private dragEnd: Vector;

  constructor() {
    super();
  }

  start(position: Vector, modifierKeys: IModifierKeys) {
    if (
      this.selectBox != null &&
      this.selectBox.contains(position) &&
      !modifierKeys.shift
    ) {
      // Start a drag.
      this.startDrag(position);
    } else if (
      this.selectBox != null &&
      this.selectBox.contains(position) &&
      this.isSelectionBorder(position) &&
      modifierKeys.shift
    ) {
      // Extend the selection from the opposite corner/edge.
      this.startResize(position);
    } else if (
      isSpecial(store.currentCanvas.committed.get(position)) &&
      !modifierKeys.shift
    ) {
      // Start a resize.
      this.moveTool = new DrawMove();
      this.moveTool.start(position);
    } else {
      // Start a selection.
      this.startSelect(position);
    }
  }

  startSelect(position: Vector) {
    store.currentCanvas.clearScratch();
    this.selectBox = new Box(position, position);
    store.currentCanvas.setSelection(this.selectBox);
  }

  startDrag(position: Vector) {
    this.dragStart = position;
    this.dragEnd = position;
  }

  startResize(position: Vector) {
    this.resizeStartBox = this.selectBox;
    this.resizeStartPosition = position;
    this.edgeRepairActive = false;
    this.resizeLeft = position.x === this.selectBox.left();
    this.resizeRight = position.x === this.selectBox.right();
    this.resizeTop = position.y === this.selectBox.top();
    this.resizeBottom = position.y === this.selectBox.bottom();
  }

  move(position: Vector) {
    if (this.resizeStartBox != null) {
      this.moveResize(position);
    } else if (this.dragStart != null) {
      this.moveDrag(position);
    } else if (!!this.moveTool) {
      this.moveTool.move(position);
    } else {
      this.moveSelect(position);
    }
  }

  moveSelect(position: Vector) {
    this.selectBox = new Box(this.selectBox.start, position);

    const selectionLayer = new Layer();

    store.currentCanvas.committed.entries().forEach(([key, value]) => {
      if (this.selectBox.contains(key)) {
        selectionLayer.set(key, value);
      }
    });

    store.currentCanvas.setScratchLayer(selectionLayer);
    store.currentCanvas.setSelection(this.selectBox);
  }

  moveResize(position: Vector) {
    if (this.shouldRepairEdge(position)) {
      this.moveEdgeRepair(position);
      return;
    }
    this.edgeRepairActive = false;
    store.currentCanvas.clearScratch();
    const start = this.resizeStartBox;
    const left = this.resizeLeft ? position.x : start.left();
    const right = this.resizeRight ? position.x : start.right();
    const top = this.resizeTop ? position.y : start.top();
    const bottom = this.resizeBottom ? position.y : start.bottom();
    this.selectBox = new Box(new Vector(left, top), new Vector(right, bottom));
    store.currentCanvas.setSelection(this.selectBox);
  }

  moveEdgeRepair(position: Vector) {
    this.edgeRepairActive = true;
    const layer = new Layer();
    const start = this.resizeStartPosition;

    if (this.resizeTop || this.resizeBottom) {
      const y = this.resizeTop ? this.resizeStartBox.top() : this.resizeStartBox.bottom();
      const minX = Math.min(start.x, position.x);
      const maxX = Math.max(start.x, position.x);
      for (let x = minX; x <= maxX; x++) {
        this.setEdgeRepairCell(layer, new Vector(x, y), UNICODE.lineHorizontal);
      }
    } else {
      const x = this.resizeLeft ? this.resizeStartBox.left() : this.resizeStartBox.right();
      const minY = Math.min(start.y, position.y);
      const maxY = Math.max(start.y, position.y);
      for (let y = minY; y <= maxY; y++) {
        this.setEdgeRepairCell(layer, new Vector(x, y), UNICODE.lineVertical);
      }
    }

    store.currentCanvas.setScratchLayer(layer);
    store.currentCanvas.setSelection(this.selectBox);
  }

  moveDrag(position: Vector) {
    this.dragEnd = position;
    const moveDelta = this.dragEnd.subtract(this.dragStart);
    store.currentCanvas.setSelection(
      new Box(
        this.selectBox.topLeft().add(moveDelta),
        this.selectBox.bottomRight().add(moveDelta)
      )
    );

    const layer = new Layer();

    // Erase existing drawing.
    store.currentCanvas.committed.entries().forEach(([key]) => {
      if (this.selectBox.contains(key)) {
        layer.set(key, "");
      }
    });
    // Move characters.
    store.currentCanvas.committed.entries().forEach(([key, value]) => {
      if (this.selectBox.contains(key)) {
        layer.set(key.add(moveDelta), value);
      }
    });

    layer.setFrom(snap(layer, store.currentCanvas.committed));

    store.currentCanvas.setScratchLayer(layer);
  }

  end() {
    if (this.dragStart != null) {
      store.currentCanvas.commitScratch();
      this.selectBox = new Box(
        this.selectBox.topLeft().add(this.dragEnd).subtract(this.dragStart),
        this.selectBox.bottomRight().add(this.dragEnd).subtract(this.dragStart)
      );
      store.currentCanvas.setSelection(this.selectBox);
    } else if (this.resizeStartBox != null) {
      if (this.edgeRepairActive) {
        store.currentCanvas.commitScratch();
      }
      store.currentCanvas.setSelection(this.selectBox);
    } else if (!!this.moveTool) {
      this.moveTool.end();
      this.moveTool = null;
    } else {
      store.currentCanvas.clearScratch();
      // Bare click (no rubber-band drag) clears selection.
      if (this.selectBox != null) {
        const topLeft = this.selectBox.topLeft();
        const bottomRight = this.selectBox.bottomRight();
        if (topLeft.x === bottomRight.x && topLeft.y === bottomRight.y) {
          this.selectBox = null;
          store.currentCanvas.clearSelection();
        }
      }
    }
    this.resizeStartBox = null;
    this.resizeLeft = false;
    this.resizeRight = false;
    this.resizeTop = false;
    this.resizeBottom = false;
    this.resizeStartPosition = null;
    this.edgeRepairActive = false;
    this.dragStart = null;
    this.dragEnd = null;
  }

  cleanup() {
    this.selectBox = null;
    this.moveTool = null;
    this.resizeStartBox = null;
    this.resizeLeft = false;
    this.resizeRight = false;
    this.resizeTop = false;
    this.resizeBottom = false;
    this.resizeStartPosition = null;
    this.edgeRepairActive = false;
    this.dragStart = null;
    this.dragEnd = null;
    store.currentCanvas.clearScratch();
    store.currentCanvas.clearSelection();
  }

  getCursor(position: Vector, modifierKeys: IModifierKeys) {
    if (this.selectBox != null && this.selectBox.contains(position)) {
      if (modifierKeys.shift) {
        if (this.isSelectionCorner(position)) {
          return this.isTopLeftOrBottomRight(position)
            ? "nwse-resize"
            : "nesw-resize";
        }
        if (this.isSelectionBorder(position)) {
          return position.x === this.selectBox.left() ||
            position.x === this.selectBox.right()
            ? "ew-resize"
            : "ns-resize";
        }
      }
      return "pointer";
    }
    if (isSpecial(store.currentCanvas.committed.get(position))) {
      return "move";
    }
    return "crosshair";
  }

  /**
   * Erases the selected content (called from native cut event in app.tsx).
   */
  cutSelection() {
    if (this.selectBox == null) return;
    const layer = new Layer();
    store.currentCanvas.committed.entries().forEach(([key]) => {
      if (this.selectBox.contains(key)) {
        layer.set(key, "");
      }
    });

    layer.setFrom(snap(layer, store.currentCanvas.committed));

    store.currentCanvas.setScratchLayer(layer);
    store.currentCanvas.commitScratch();
  }

  handleKey(value: string, modifierKeys: IModifierKeys) {
    if (value === KEY_BACKSPACE || value === KEY_DELETE) {
      const layer = new Layer();
      store.currentCanvas.committed.entries().forEach(([key]) => {
        if (this.selectBox.contains(key)) {
          layer.set(key, "");
        }
      });

      layer.setFrom(snap(layer, store.currentCanvas.committed));

      store.currentCanvas.setScratchLayer(layer);
      store.currentCanvas.commitScratch();
    }
  }

  private isSelectionBorder(position: Vector) {
    if (this.selectBox == null || !this.selectBox.contains(position)) return false;
    return (
      position.x === this.selectBox.left() ||
      position.x === this.selectBox.right() ||
      position.y === this.selectBox.top() ||
      position.y === this.selectBox.bottom()
    );
  }

  private isSelectionCorner(position: Vector) {
    if (this.selectBox == null) return false;
    return (
      (position.x === this.selectBox.left() || position.x === this.selectBox.right()) &&
      (position.y === this.selectBox.top() || position.y === this.selectBox.bottom())
    );
  }

  private isTopLeftOrBottomRight(position: Vector) {
    if (this.selectBox == null) return false;
    return (
      (position.x === this.selectBox.left() && position.y === this.selectBox.top()) ||
      (position.x === this.selectBox.right() && position.y === this.selectBox.bottom())
    );
  }

  private shouldRepairEdge(position: Vector) {
    if (
      this.resizeStartBox == null ||
      this.resizeStartPosition == null ||
      this.isSelectionCorner(this.resizeStartPosition)
    ) {
      return false;
    }

    const delta = position.subtract(this.resizeStartPosition);
    const horizontalEdge = this.resizeTop || this.resizeBottom;
    if (horizontalEdge) {
      return Math.abs(delta.x) > Math.abs(delta.y) && delta.x !== 0;
    }
    return Math.abs(delta.y) > Math.abs(delta.x) && delta.y !== 0;
  }

  private setEdgeRepairCell(layer: Layer, position: Vector, value: string) {
    const existing = store.currentCanvas.committed.get(position);
    if (existing != null && existing !== value) {
      return;
    }
    layer.set(position, value);
  }
}
