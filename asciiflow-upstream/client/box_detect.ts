import { FILL_TAG_PATTERN } from "#asciiflow/client/fill_palette";
import { ILayerView, Layer } from "#asciiflow/client/layer";
import { Vector } from "#asciiflow/client/vector";

export interface DetectedBox {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

const SCAN_LIMIT = 400;

function cell(layer: ILayerView, x: number, y: number): string | null {
  return layer.get(new Vector(x, y));
}

function isVerticalWall(c: string | null): boolean {
  return c === "|" || c === "│";
}

function isHorizontalWall(c: string | null): boolean {
  return c === "-" || c === "─" || c === "_";
}

function isCorner(c: string | null): boolean {
  return (
    c === "+" ||
    c === "┌" ||
    c === "┐" ||
    c === "└" ||
    c === "┘"
  );
}

function isHorizontalBorderRow(
  layer: ILayerView,
  y: number,
  left: number,
  right: number
): boolean {
  if (!isCorner(cell(layer, left, y)) || !isCorner(cell(layer, right, y))) {
    return false;
  }
  for (let x = left + 1; x < right; x++) {
    const c = cell(layer, x, y);
    if (!isHorizontalWall(c)) {
      return false;
    }
  }
  return left < right;
}

function isVerticalBorderCol(
  layer: ILayerView,
  x: number,
  top: number,
  bottom: number
): boolean {
  if (!isCorner(cell(layer, x, top)) || !isCorner(cell(layer, x, bottom))) {
    return false;
  }
  for (let y = top + 1; y < bottom; y++) {
    const c = cell(layer, x, y);
    if (!isVerticalWall(c)) {
      return false;
    }
  }
  return top < bottom;
}

function findVerticalWallsOnRow(
  layer: ILayerView,
  y: number,
  x: number
): { left: number; right: number } | null {
  let left = x;
  for (let i = 0; i < SCAN_LIMIT && left >= x - SCAN_LIMIT; i++, left--) {
    if (isVerticalWall(cell(layer, left, y))) {
      break;
    }
  }
  if (!isVerticalWall(cell(layer, left, y))) {
    return null;
  }

  let right = x;
  for (let i = 0; i < SCAN_LIMIT && right <= x + SCAN_LIMIT; i++, right++) {
    if (isVerticalWall(cell(layer, right, y))) {
      break;
    }
  }
  if (!isVerticalWall(cell(layer, right, y))) {
    return null;
  }

  return left < right ? { left, right } : null;
}

function findBoxAtRow(layer: ILayerView, point: Vector): DetectedBox | null {
  const walls = findVerticalWallsOnRow(layer, point.y, point.x);
  if (!walls) {
    return null;
  }
  const { left, right } = walls;

  let top = point.y;
  for (let i = 0; i < SCAN_LIMIT && top >= point.y - SCAN_LIMIT; i++, top--) {
    if (isHorizontalBorderRow(layer, top, left, right)) {
      break;
    }
  }
  if (!isHorizontalBorderRow(layer, top, left, right)) {
    return null;
  }

  let bottom = point.y;
  for (let i = 0; i < SCAN_LIMIT && bottom <= point.y + SCAN_LIMIT; i++, bottom++) {
    if (isHorizontalBorderRow(layer, bottom, left, right)) {
      break;
    }
  }
  if (!isHorizontalBorderRow(layer, bottom, left, right)) {
    return null;
  }

  if (
    !isVerticalBorderCol(layer, left, top, bottom) ||
    !isVerticalBorderCol(layer, right, top, bottom)
  ) {
    return null;
  }

  return { top, left, bottom, right };
}

/** Locate a closed +---+ / unicode box containing the cell. */
export function findBoxAt(layer: ILayerView, point: Vector): DetectedBox | null {
  for (const dy of [0, 1, -1, 2, -2]) {
    const box = findBoxAtRow(layer, new Vector(point.x, point.y + dy));
    if (box) {
      return box;
    }
  }
  return null;
}

function rowText(layer: ILayerView, box: DetectedBox, y: number): string {
  let text = "";
  for (let x = box.left + 1; x < box.right; x++) {
    text += cell(layer, x, y) ?? " ";
  }
  return text;
}

function rowScore(text: string): number {
  const stripped = text.replace(FILL_TAG_PATTERN, "").replace(/\s/g, "");
  return stripped.length;
}

/** Best interior row for a fill tag (most label content). */
export function pickLabelRow(layer: ILayerView, box: DetectedBox): number {
  let bestY = Math.floor((box.top + box.bottom) / 2);
  let bestScore = -1;
  for (let y = box.top + 1; y < box.bottom; y++) {
    const score = rowScore(rowText(layer, box, y));
    if (score > bestScore) {
      bestScore = score;
      bestY = y;
    }
  }
  return bestY;
}

function stripFillTags(text: string): string {
  return text.replace(FILL_TAG_PATTERN, "").replace(/\s+$/, "");
}

function applyTagToInterior(text: string, tagId: string | null): string {
  const base = stripFillTags(text);
  if (!tagId) {
    return base;
  }
  if (!base.trim()) {
    return `{${tagId}}`;
  }
  return `${base} {${tagId}}`;
}

/** Layer patch updating one interior row with a fill tag (or clearing it). */
export function buildFillPatch(
  layer: ILayerView,
  box: DetectedBox,
  labelRow: number,
  tagId: string | null
): Layer {
  const patch = new Layer();
  const interior = applyTagToInterior(rowText(layer, box, labelRow), tagId);
  const width = box.right - box.left - 1;

  for (let i = 0; i < width; i++) {
    const x = box.left + 1 + i;
    const pos = new Vector(x, labelRow);
    const nextChar = i < interior.length ? interior[i] : " ";
    const prev = cell(layer, x, labelRow);
    const normalizedPrev = prev ?? " ";
    if (nextChar !== normalizedPrev) {
      patch.set(pos, nextChar === " " ? " " : nextChar);
    }
  }

  // Trim trailing cells that became spaces (delete from layer).
  for (let x = box.left + 1; x < box.right; x++) {
    const pos = new Vector(x, labelRow);
    const idx = x - box.left - 1;
    if (idx >= interior.length) {
      const prev = cell(layer, x, labelRow);
      if (prev != null && prev !== " ") {
        patch.set(pos, " ");
      }
    }
  }

  return patch;
}
