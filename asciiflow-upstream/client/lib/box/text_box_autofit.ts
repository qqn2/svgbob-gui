import { DetectedBox, findBoxAt } from "#asciiflow/client/lib/box/box_detect";
import { UNICODE } from "#asciiflow/client/constants";
import { ILayerView, Layer } from "#asciiflow/client/layer";
import { Vector } from "#asciiflow/client/vector";

interface TextRow {
  y: number;
  left: number;
  right: number;
  text: string;
}

interface BoxStyle {
  horizontal: string;
  vertical: string;
  topRight: string;
  bottomRight: string;
}

function boxStyle(committed: ILayerView, box: DetectedBox): BoxStyle {
  const topRight = committed.get(new Vector(box.right, box.top));
  const bottomRight = committed.get(new Vector(box.right, box.bottom));
  const isAscii = topRight === "+" || bottomRight === "+";
  return isAscii
    ? {
        horizontal: "-",
        vertical: "|",
        topRight: "+",
        bottomRight: "+",
      }
    : {
        horizontal: UNICODE.lineHorizontal,
        vertical: UNICODE.lineVertical,
        topRight: UNICODE.cornerTopRight,
        bottomRight: UNICODE.cornerBottomRight,
      };
}

function isBoxDrawing(value: string | null): boolean {
  return (
    value === "|" ||
    value === "-" ||
    value === "+" ||
    value === UNICODE.lineVertical ||
    value === UNICODE.lineHorizontal ||
    value === UNICODE.cornerTopLeft ||
    value === UNICODE.cornerTopRight ||
    value === UNICODE.cornerBottomLeft ||
    value === UNICODE.cornerBottomRight ||
    value === UNICODE.junctionDown ||
    value === UNICODE.junctionUp ||
    value === UNICODE.junctionLeft ||
    value === UNICODE.junctionRight ||
    value === UNICODE.junctionAll
  );
}

function quoteSvgbobText(value: string): string {
  const trimmed = value.trimEnd();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed;
  }
  return `"${trimmed.replace(/"/g, '\\"')}"`;
}

function textRows(layer: Layer): TextRow[] {
  const rows = new Map<number, Array<[number, string]>>();
  for (const [position, value] of layer.entries()) {
    if (!rows.has(position.y)) {
      rows.set(position.y, []);
    }
    rows.get(position.y)!.push([position.x, value]);
  }

  return [...rows.entries()]
    .map(([y, cells]) => {
      const xs = cells.map(([x]) => x);
      const left = Math.min(...xs);
      const right = Math.max(...xs);
      const byX = new Map(cells);
      let text = "";
      for (let x = left; x <= right; x++) {
        text += byX.get(x) ?? " ";
      }
      return { y, left, right, text };
    })
    .filter((row) => row.text.trim() !== "");
}

function drawExpandedRightEdge(
  patch: Layer,
  committed: ILayerView,
  box: DetectedBox,
  nextRight: number
) {
  if (nextRight <= box.right) {
    return;
  }

  const style = boxStyle(committed, box);

  for (let y = box.top; y <= box.bottom; y++) {
    const oldPos = new Vector(box.right, y);
    const oldValue = committed.get(oldPos);
    if (isBoxDrawing(oldValue)) {
      patch.set(oldPos, " ");
    }
  }

  for (let x = box.right; x <= nextRight; x++) {
    patch.set(new Vector(x, box.top), style.horizontal);
    patch.set(new Vector(x, box.bottom), style.horizontal);
  }

  for (let y = box.top; y <= box.bottom; y++) {
    patch.set(new Vector(nextRight, y), style.vertical);
  }

  patch.set(new Vector(nextRight, box.top), style.topRight);
  patch.set(new Vector(nextRight, box.bottom), style.bottomRight);
}

function writeText(patch: Layer, row: TextRow, text: string) {
  const width = Math.max(row.right - row.left + 1, text.length);
  for (let i = 0; i < width; i++) {
    const value = i < text.length ? text[i] : " ";
    patch.set(new Vector(row.left + i, row.y), value);
  }
}

export function buildAutoFitTextPatch(
  committed: ILayerView,
  textLayer: Layer
): Layer | null {
  const rows = textRows(textLayer);
  if (rows.length === 0) {
    return null;
  }

  const patch = new Layer();
  let changed = false;

  for (const row of rows) {
    const box = findBoxAt(committed, new Vector(row.left, row.y));
    if (!box || row.y <= box.top || row.y >= box.bottom) {
      writeText(patch, row, row.text);
      changed = true;
      continue;
    }

    const text = quoteSvgbobText(row.text);
    const requiredRight = row.left + text.length;
    drawExpandedRightEdge(patch, committed, box, requiredRight);
    writeText(patch, row, text);
    changed = true;
  }

  return changed ? patch : null;
}
