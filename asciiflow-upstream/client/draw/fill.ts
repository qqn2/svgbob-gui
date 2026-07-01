import {
  buildFillPatch,
  DetectedBox,
  findBoxAt,
  pickLabelRow,
} from "#asciiflow/client/lib/box/box_detect";
import { AbstractDrawFunction } from "#asciiflow/client/draw/function";
import { Layer } from "#asciiflow/client/layer";
import { FillStatus, store } from "#asciiflow/client/store";
import { Vector } from "#asciiflow/client/vector";

interface FillAnalysis {
  box: DetectedBox | null;
  labelRow: number | null;
  patch: Layer | null;
  status: FillStatus;
}

export class DrawFill extends AbstractDrawFunction {
  start(position: Vector): void {
    store.placeBlockTool.cancel();
    const analysis = this.analyze(position);
    store.setFillStatus(analysis.status);

    if (!analysis.box) {
      if (store.fillForceMode) {
        this.writeTagAt(position, store.selectedFillTag);
      }
      return;
    }

    if (!analysis.patch || analysis.patch.size() === 0) {
      return;
    }

    store.currentCanvas.clearScratch();
    store.currentCanvas.setScratchLayer(analysis.patch);
    store.currentCanvas.commitScratch();
  }

  getCursor(position?: Vector): string {
    if (position) {
      const analysis = this.analyze(position);
      store.setFillStatus(analysis.status);
      store.currentCanvas.setScratchLayer(
        this.previewLayer(position, analysis)
      );
    }
    return "cell";
  }

  cleanup(): void {
    store.currentCanvas.clearScratch();
    store.setFillStatus(null);
  }

  analyze(position: Vector): FillAnalysis {
    const layer = store.currentCanvas.committed;
    const tagId = store.selectedFillTag;
    const box = findBoxAt(layer, position);

    if (!box) {
      return {
        box: null,
        labelRow: null,
        patch: null,
        status: {
          message: store.fillForceMode
            ? "no box detected - force writes tag here"
            : "no box detected - force is off",
          tone: store.fillForceMode ? "warn" : "muted",
        },
      };
    }

    const labelRow = pickLabelRow(layer, box);
    const patch = buildFillPatch(layer, box, labelRow, tagId);
    const overflowCount = this.countOverwrites(patch, box);
    const action = tagId ? `apply {${tagId}}` : "clear fill";
    return {
      box,
      labelRow,
      patch,
      status: {
        message:
          overflowCount > 0
            ? `box detected - ${action}; overflow over ${overflowCount} occupied cell${overflowCount === 1 ? "" : "s"}`
            : `box detected - ${action}; space ok`,
        tone: overflowCount > 0 ? "warn" : "ok",
        box,
        overflowCount,
      },
    };
  }

  private writeTagAt(position: Vector, tagId: string | null): void {
    const patch = this.buildForcePatch(position, tagId);

    if (patch.size() === 0) {
      return;
    }
    store.currentCanvas.clearScratch();
    store.currentCanvas.setScratchLayer(patch);
    store.currentCanvas.commitScratch();
  }

  private previewLayer(position: Vector, analysis: FillAnalysis): Layer {
    if (analysis.patch) {
      return analysis.patch;
    }
    if (store.fillForceMode) {
      return this.buildForcePatch(position, store.selectedFillTag);
    }
    return new Layer();
  }

  private buildForcePatch(position: Vector, tagId: string | null): Layer {
    const patch = new Layer();
    if (!tagId) {
      return patch;
    }

    const text = `{${tagId}}`;
    for (let i = 0; i < text.length; i++) {
      patch.set(position.right(i), text[i]);
    }
    return patch;
  }

  private countOverwrites(patch: Layer, box: DetectedBox): number {
    let count = 0;
    for (const [position, next] of patch.entries()) {
      if (next === " " || next === "") {
        continue;
      }
      if (
        position.x <= box.right &&
        position.y >= box.top &&
        position.y <= box.bottom
      ) {
        continue;
      }
      const current = store.currentCanvas.committed.get(position);
      if (current != null && current !== " " && current !== next) {
        count++;
      }
    }
    return count;
  }
}
