import { Box } from "#asciiflow/client/common";
import {
  KEY_BACKSPACE,
  KEY_DELETE,
  KEY_DOWN,
  KEY_LEFT,
  KEY_RETURN,
  KEY_RIGHT,
  KEY_UP,
} from "#asciiflow/client/constants";
import { AbstractDrawFunction } from "#asciiflow/client/draw/function";
import { Layer } from "#asciiflow/client/layer";
import { store } from "#asciiflow/client/store";
import { Vector } from "#asciiflow/client/vector";

export class DrawRaw extends AbstractDrawFunction {
  public currentPosition: Vector | null = null;

  start(position: Vector) {
    this.setCursor(position);
  }

  getCursor() {
    return "text";
  }

  handleKey(value: string) {
    if (!this.currentPosition) {
      this.setCursor(store.cursorCell ? new Vector(store.cursorCell.x, store.cursorCell.y) : new Vector(0, 0));
    }

    if (value === KEY_LEFT) {
      this.setCursor(this.currentPosition.left());
      return;
    }
    if (value === KEY_RIGHT) {
      this.setCursor(this.currentPosition.right());
      return;
    }
    if (value === KEY_UP) {
      this.setCursor(this.currentPosition.up());
      return;
    }
    if (value === KEY_DOWN) {
      this.setCursor(this.currentPosition.down());
      return;
    }
    if (value === KEY_BACKSPACE) {
      this.backspace();
      return;
    }
    if (value === KEY_DELETE) {
      this.deleteAtCursor();
      return;
    }
    if (value === KEY_RETURN) {
      this.insertRowBelow();
      return;
    }
    if (value.length === 1) {
      this.insertCharacter(value);
    }
  }

  cleanup() {
    store.currentCanvas.clearSelection();
    this.currentPosition = null;
  }

  public cutAtCursor(): string {
    if (!this.currentPosition) {
      this.setCursor(store.cursorCell ? new Vector(store.cursorCell.x, store.cursorCell.y) : new Vector(0, 0));
    }

    const cutPosition = this.currentPosition;
    const cutCharacter = store.currentCanvas.committed.get(cutPosition);
    if (cutCharacter == null) {
      return "";
    }

    this.closeGapAt(cutPosition);
    this.setCursor(cutPosition);
    return cutCharacter;
  }

  private setCursor(position: Vector) {
    this.currentPosition = position;
    store.setCursorCell({ x: position.x, y: position.y });
    store.currentCanvas.setSelection(new Box(position, position));
  }

  private insertCharacter(value: string) {
    const patch = new Layer();
    const rowMax = this.rowMaxX(this.currentPosition.y);

    for (let x = rowMax; x >= this.currentPosition.x; x--) {
      const position = new Vector(x, this.currentPosition.y);
      const existing = store.currentCanvas.committed.get(position);
      patch.set(position, "");
      if (existing != null) {
        patch.set(position.right(), existing);
      }
    }

    patch.set(this.currentPosition, value);
    this.commitPatch(patch);
    this.setCursor(this.currentPosition.right());
  }

  private backspace() {
    const target = this.currentPosition.left();
    this.closeGapAt(target);
    this.setCursor(target);
  }

  private deleteAtCursor() {
    this.closeGapAt(this.currentPosition);
  }

  private closeGapAt(target: Vector) {
    const patch = new Layer();
    const rowMax = this.rowMaxX(target.y);

    if (target.x > rowMax) {
      return;
    }

    for (let x = target.x + 1; x <= rowMax; x++) {
      const position = new Vector(x, target.y);
      const existing = store.currentCanvas.committed.get(position);
      patch.set(position.left(), existing ?? "");
    }
    patch.set(new Vector(rowMax, target.y), "");
    this.commitPatch(patch);
  }

  private insertRowBelow() {
    const insertY = this.currentPosition.y + 1;
    const patch = new Layer();
    const entries = store.currentCanvas.committed
      .entries()
      .filter(([position]) => position.y >= insertY)
      .sort(([a], [b]) => b.y - a.y || b.x - a.x);

    for (const [position, value] of entries) {
      patch.set(position, "");
      patch.set(position.down(), value);
    }

    this.commitPatch(patch);
    this.setCursor(this.currentPosition.down());
  }

  private rowMaxX(y: number): number {
    let max = this.currentPosition?.x ?? 0;
    for (const position of store.currentCanvas.committed.keys()) {
      if (position.y === y && position.x > max) {
        max = position.x;
      }
    }
    return max;
  }

  private commitPatch(patch: Layer) {
    if (patch.size() === 0) {
      return;
    }
    store.currentCanvas.clearScratch();
    store.currentCanvas.setScratchLayer(patch);
    store.currentCanvas.commitScratch();
  }
}
