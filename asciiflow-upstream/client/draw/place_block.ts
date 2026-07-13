import { AbstractDrawFunction } from "#asciiflow/client/draw/function";
import { scalePlacementLayer } from "#asciiflow/client/draw/place_block_scale";
import {
  anchorForCursor,
  flipLayerH,
  flipLayerV,
  layerBBox,
  layerOverlapsCommitted,
  offsetLayer,
  rotatePlacementLayer,
  snapAnchor,
} from "#asciiflow/client/layer_placement";
import { Layer } from "#asciiflow/client/layer";
import { IModifierKeys, store } from "#asciiflow/client/store";
import { textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

/**
 * Stamp mode for RTL blocks: ghost follows cursor; click to place, Esc to cancel.
 * R rotates 90 degrees; H flips horizontally; V flips vertically.
 */
export class DrawPlaceBlock extends AbstractDrawFunction {
  private baseTemplate: Layer | null = null;
  private template: Layer | null = null;
  private rotation = 0;
  private flippedH = false;
  private flippedV = false;
  private bbox = null as ReturnType<typeof layerBBox>;
  private lastCursor: Vector | null = null;
  private _overlaps = false;
  private _snapped = false;

  get isActive(): boolean {
    return this.template !== null;
  }

  get overlaps(): boolean {
    return this._overlaps;
  }

  get snapped(): boolean {
    return this._snapped;
  }

  begin(text: string, scale = 1): void {
    store.selectTool.cleanup();
    store.currentTool.cleanup();
    this.baseTemplate = scalePlacementLayer(textToLayer(text, new Vector(0, 0)), scale);
    this.rotation = 0;
    this.flippedH = false;
    this.flippedV = false;
    this.lastCursor = null;
    this.refreshTemplate();
    this._overlaps = false;
    this._snapped = false;
    store.currentCanvas.clearScratch();
    if (store.cursorCell) {
      this.previewAt(new Vector(store.cursorCell.x, store.cursorCell.y));
    }
  }

  rotateCW(): void {
    if (!this.baseTemplate) return;
    this.rotation = (this.rotation + 1) % 4;
    this.refreshTemplate();
  }

  flipH(): void {
    if (!this.baseTemplate) return;
    this.flippedH = !this.flippedH;
    this.refreshTemplate();
  }

  flipV(): void {
    if (!this.baseTemplate) return;
    this.flippedV = !this.flippedV;
    this.refreshTemplate();
  }

  private refreshTemplate(): void {
    if (!this.baseTemplate) return;
    let template = rotatePlacementLayer(this.baseTemplate, this.rotation);
    if (this.flippedH) template = flipLayerH(template);
    if (this.flippedV) template = flipLayerV(template);
    this.template = template;
    this.bbox = layerBBox(this.template);
    if (this.lastCursor) this.previewAt(this.lastCursor);
  }

  previewAt(cursor: Vector): void {
    if (!this.template || !this.bbox) return;
    this.lastCursor = cursor;

    let anchor = anchorForCursor(cursor, this.bbox);
    const snapped = snapAnchor(anchor, store.currentCanvas.committed);
    this._snapped = !snapped.equals(anchor);
    anchor = snapped;

    const ghost = offsetLayer(this.template, anchor);
    this._overlaps = layerOverlapsCommitted(
      ghost,
      store.currentCanvas.committed
    );
    store.currentCanvas.setScratchLayer(ghost);
  }

  place(cursor: Vector): void {
    if (!this.template) return;
    this.previewAt(cursor);
    if (this._overlaps) return;
    store.currentCanvas.commitScratch();
    this.cancel();
  }

  cancel(): void {
    this.baseTemplate = null;
    this.template = null;
    this.rotation = 0;
    this.flippedH = false;
    this.flippedV = false;
    this.bbox = null;
    this.lastCursor = null;
    this._overlaps = false;
    this._snapped = false;
    store.currentCanvas.clearScratch();
  }

  cleanup(): void {
    this.cancel();
  }

  getCursor(_position: Vector, _modifierKeys: IModifierKeys): string {
    return this._overlaps ? "not-allowed" : "crosshair";
  }
}
