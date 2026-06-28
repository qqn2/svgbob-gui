import {
  buildFillPatch,
  findBoxAt,
  pickLabelRow,
} from "#asciiflow/client/lib/box/box_detect";
import { AbstractDrawFunction } from "#asciiflow/client/draw/function";
import { store } from "#asciiflow/client/store";
import { Vector } from "#asciiflow/client/vector";

export class DrawFill extends AbstractDrawFunction {
  start(position: Vector): void {
    store.placeBlockTool.cancel();
    const layer = store.currentCanvas.committed;
    const box = findBoxAt(layer, position);
    if (!box) {
      return;
    }

    const labelRow = pickLabelRow(layer, box);
    const tagId = store.selectedFillTag;
    const patch = buildFillPatch(layer, box, labelRow, tagId);
    if (patch.size() === 0) {
      return;
    }

    store.currentCanvas.clearScratch();
    store.currentCanvas.setScratchLayer(patch);
    store.currentCanvas.commitScratch();
  }

  getCursor(): string {
    return "cell";
  }
}
