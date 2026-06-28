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
const FILL_TAG_SLOT_WIDTH = 16;

function cell(layer: ILayerView, x: number, y: number): string | null {
  return layer.get(new Vector(x, y));
}

function isVerticalWall(c: string | null): boolean {
  return c === "|" || c === "│";
}

function isHorizontalWall(c: string | null): boolean {
  return (
    c === "-" ||
    c === "─" ||
    c === "_" ||
    c === "+" ||
    c === "┬" ||
    c === "┴" ||
    c === "┼"
  );
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

function rowTextRange(layer: ILayerView, y: number, left: number, width: number): string {
  let text = "";
  for (let x = left; x < left + width; x++) {
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

function tagText(tagId: string): string {
  return `{${tagId}}`;
}

function applyTagToInterior(
  text: string,
  tagId: string | null,
  width: number
): { text: string; placed: boolean } {
  const base = stripFillTags(text);
  if (!tagId) {
    return { text: base, placed: false };
  }
  const tag = tagText(tagId);
  if (!base.trim()) {
    return tag.length <= width
      ? { text: tag, placed: true }
      : { text: base, placed: false };
  }
  const tagged = `${base} ${tag}`;
  if (tagged.length <= width) {
    return { text: tagged, placed: true };
  }
  return { text: base, placed: false };
}

function outsideTagRows(box: DetectedBox, preferredRow: number): number[] {
  return [
    preferredRow,
    ...Array.from({ length: box.bottom - box.top + 1 }, (_, i) => box.top + i),
  ].filter((row, index, rows) => rows.indexOf(row) === index);
}

function canPlaceOutsideTag(
  layer: ILayerView,
  box: DetectedBox,
  y: number,
  tag: string
): boolean {
  const existing = rowTextRange(layer, y, box.right + 1, tag.length);
  const withoutTags = existing.replace(FILL_TAG_PATTERN, "");
  return withoutTags.trim() === "";
}

function writeRangePatch(
  patch: Layer,
  layer: ILayerView,
  y: number,
  left: number,
  width: number,
  value: string
) {
  for (let i = 0; i < width; i++) {
    const x = left + i;
    const pos = new Vector(x, y);
    const nextChar = i < value.length ? value[i] : " ";
    const prev = cell(layer, x, y);
    const normalizedPrev = prev ?? " ";
    if (nextChar !== normalizedPrev) {
      patch.set(pos, nextChar === " " ? " " : nextChar);
    }
  }
}

function clearOutsideFillTags(
  patch: Layer,
  layer: ILayerView,
  box: DetectedBox
) {
  for (let y = box.top; y <= box.bottom; y++) {
    const left = box.right + 1;
    const current = rowTextRange(layer, y, left, FILL_TAG_SLOT_WIDTH);
    const next = current.replace(FILL_TAG_PATTERN, (tag) => " ".repeat(tag.length));
    writeRangePatch(patch, layer, y, left, FILL_TAG_SLOT_WIDTH, next);
  }
}

/** Layer patch updating one interior row with a fill tag (or clearing it). */
export function buildFillPatch(
  layer: ILayerView,
  box: DetectedBox,
  labelRow: number,
  tagId: string | null
): Layer {
  const patch = new Layer();
  const width = box.right - box.left - 1;
  const interiorResult = applyTagToInterior(
    rowText(layer, box, labelRow),
    tagId,
    width
  );
  const interior = interiorResult.text;

  clearOutsideFillTags(patch, layer, box);

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

  if (tagId && !interiorResult.placed) {
    const tag = tagText(tagId);
    const outsideRow = outsideTagRows(box, labelRow).find((row) =>
      canPlaceOutsideTag(layer, box, row, tag)
    );
    if (outsideRow !== undefined) {
      writeRangePatch(patch, layer, outsideRow, box.right + 1, tag.length, tag);
    }
  }

  return patch;
}
