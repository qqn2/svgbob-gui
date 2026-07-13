import { Box } from "#asciiflow/client/common";
import { connectsLeft, connectsRight } from "#asciiflow/client/characters";
import { UNICODE } from "#asciiflow/client/constants";
import { ILayerView, Layer } from "#asciiflow/client/layer";
import { Vector } from "#asciiflow/client/vector";

type CharacterMap = ReadonlyMap<string, string>;

function characterMap(pairs: ReadonlyArray<readonly [string, string]>): CharacterMap {
  return new Map(pairs);
}

const ROTATE_CW = characterMap([
  [UNICODE.cornerTopLeft, UNICODE.cornerTopRight],
  [UNICODE.cornerTopRight, UNICODE.cornerBottomRight],
  [UNICODE.cornerBottomRight, UNICODE.cornerBottomLeft],
  [UNICODE.cornerBottomLeft, UNICODE.cornerTopLeft],
  [UNICODE.lineHorizontal, UNICODE.lineVertical],
  [UNICODE.lineVertical, UNICODE.lineHorizontal],
  [UNICODE.junctionDown, UNICODE.junctionLeft],
  [UNICODE.junctionLeft, UNICODE.junctionUp],
  [UNICODE.junctionUp, UNICODE.junctionRight],
  [UNICODE.junctionRight, UNICODE.junctionDown],
  [UNICODE.arrowRight, UNICODE.arrowDown],
  [UNICODE.arrowDown, UNICODE.arrowLeft],
  [UNICODE.arrowLeft, UNICODE.arrowUp],
  [UNICODE.arrowUp, UNICODE.arrowRight],
  ["-", "|"],
  ["|", "-"],
  ["/", "\\"],
  ["\\", "/"],
]);

const FLIP_HORIZONTAL = characterMap([
  [UNICODE.cornerTopLeft, UNICODE.cornerTopRight],
  [UNICODE.cornerTopRight, UNICODE.cornerTopLeft],
  [UNICODE.cornerBottomLeft, UNICODE.cornerBottomRight],
  [UNICODE.cornerBottomRight, UNICODE.cornerBottomLeft],
  [UNICODE.junctionLeft, UNICODE.junctionRight],
  [UNICODE.junctionRight, UNICODE.junctionLeft],
  [UNICODE.arrowLeft, UNICODE.arrowRight],
  [UNICODE.arrowRight, UNICODE.arrowLeft],
  ["/", "\\"],
  ["\\", "/"],
  ["<", ">"],
  [">", "<"],
  ["(", ")"],
  [")", "("],
  ["[", "]"],
  ["]", "["],
  ["{", "}"],
  ["}", "{"],
]);

const FLIP_VERTICAL = characterMap([
  [UNICODE.cornerTopLeft, UNICODE.cornerBottomLeft],
  [UNICODE.cornerBottomLeft, UNICODE.cornerTopLeft],
  [UNICODE.cornerTopRight, UNICODE.cornerBottomRight],
  [UNICODE.cornerBottomRight, UNICODE.cornerTopRight],
  [UNICODE.junctionDown, UNICODE.junctionUp],
  [UNICODE.junctionUp, UNICODE.junctionDown],
  [UNICODE.arrowUp, UNICODE.arrowDown],
  [UNICODE.arrowDown, UNICODE.arrowUp],
  ["/", "\\"],
  ["\\", "/"],
  ["^", "v"],
  ["v", "^"],
]);

function transformCharacter(value: string, map: CharacterMap): string {
  return map.get(value) ?? value;
}

interface QuotedTextRun {
  start: number;
  end: number;
}

/** Complete horizontal quoted labels grouped by canvas row. */
function quotedTextRuns(layer: ILayerView): Map<number, QuotedTextRun[]> {
  const byRow = new Map<number, Vector[]>();
  for (const key of layer.keys()) {
    const row = byRow.get(key.y) ?? [];
    row.push(key);
    byRow.set(key.y, row);
  }

  const runsByRow = new Map<number, QuotedTextRun[]>();
  for (const [y, keys] of byRow) {
    keys.sort((a, b) => a.x - b.x);
    let start: number | null = null;
    const runs: QuotedTextRun[] = [];
    for (const key of keys) {
      if (layer.get(key) !== '"') continue;
      if (start === null) {
        start = key.x;
        continue;
      }
      runs.push({ start, end: key.x });
      start = null;
    }
    if (runs.length) runsByRow.set(y, runs);
  }
  return runsByRow;
}

/** Cells inside complete horizontal quotes are labels, not diagram glyphs. */
function quotedTextCells(layer: ILayerView): Set<string> {
  const quoted = new Set<string>();
  for (const [y, runs] of quotedTextRuns(layer)) {
    for (const { start, end } of runs) {
      for (let x = start; x <= end; x++) {
        quoted.add(new Vector(x, y).toString());
      }
    }
  }
  return quoted;
}

interface RotatedLabel {
  text: string;
  x: number;
  y: number;
  enclosed: boolean;
  startX?: number;
}

function cloneLayer(layer: ILayerView): Layer {
  const out = new Layer();
  out.setFrom(layer);
  return out;
}

function rotateCharacter(value: string, quarterTurns: number): string {
  let rotated = value;
  for (let i = 0; i < quarterTurns; i++) {
    rotated = transformCharacter(rotated, ROTATE_CW);
  }
  return rotated;
}

function insertColumns(layer: Layer, at: number, count: number): Layer {
  if (count <= 0) return layer;
  const out = new Layer();
  const rows = new Set(layer.keys().map((key) => key.y));
  for (const [key, value] of layer.entries()) {
    out.set(new Vector(key.x >= at ? key.x + count : key.x, key.y), value);
  }
  for (const y of rows) {
    const left = layer.get(new Vector(at - 1, y));
    const right = layer.get(new Vector(at, y));
    if (!connectsRight(left) || !connectsLeft(right)) continue;
    for (let x = at; x < at + count; x++) {
      out.set(new Vector(x, y), UNICODE.lineHorizontal);
    }
  }
  return out;
}

/**
 * Rotate a reusable block while keeping quoted svgbob labels horizontal.
 * Enclosed shapes are widened when their rotated label no longer fits.
 */
export function rotatePlacementLayer(layer: Layer, quarterTurns: number): Layer {
  const turns = ((quarterTurns % 4) + 4) % 4;
  if (turns === 0) return cloneLayer(layer);
  if (turns === 2) return flipLayerV(flipLayerH(layer));

  const bbox = layerBBox(layer);
  if (!bbox) return new Layer();
  const minX = bbox.left();
  const minY = bbox.top();
  const width = bbox.right() - minX + 1;
  const height = bbox.bottom() - minY + 1;
  const runs = quotedTextRuns(layer);
  const quoted = quotedTextCells(layer);
  const labels: RotatedLabel[] = [];
  let out = new Layer();

  for (const [y, rowRuns] of runs) {
    const rowKeys = layer.keys().filter((key) => key.y === y);
    for (const run of rowRuns) {
      const centerX = Math.round((run.start + run.end) / 2);
      const left = rowKeys.some((key) => key.x < run.start);
      const right = rowKeys.some((key) => key.x > run.end);
      const text = Array.from(
        { length: run.end - run.start + 1 },
        (_, index) => layer.get(new Vector(run.start + index, y)) ?? " "
      ).join("");
      labels.push({
        text,
        x:
          turns === 1
            ? minX + (height - 1 - (y - minY))
            : minX + (y - minY),
        y:
          turns === 1
            ? minY + (centerX - minX)
            : minY + (width - 1 - (centerX - minX)),
        enclosed: left && right,
      });
    }
  }

  for (const [key, value] of layer.entries()) {
    if (quoted.has(key.toString())) continue;
    const rx = key.x - minX;
    const ry = key.y - minY;
    const x = turns === 1 ? minX + (height - 1 - ry) : minX + ry;
    const y = turns === 1 ? minY + rx : minY + (width - 1 - rx);
    out.set(new Vector(x, y), rotateCharacter(value, turns));
  }

  const enclosedByRow = new Map<number, RotatedLabel[]>();
  for (const label of labels.filter(({ enclosed }) => enclosed)) {
    const row = enclosedByRow.get(label.y) ?? [];
    row.push(label);
    enclosedByRow.set(label.y, row);
  }
  for (const row of enclosedByRow.values()) {
    row.sort((a, b) => a.x - b.x);
    const first = row[0];
    const last = row[row.length - 1];
    const rowXs = out.keys()
      .filter((key) => key.y === first.y)
      .map((key) => key.x)
      .sort((a, b) => a - b);
    const left = rowXs.filter((x) => x < first.x).at(-1);
    const right = rowXs.find((x) => x > last.x);
    if (left === undefined || right === undefined) continue;
    const required = row.reduce((sum, label) => sum + label.text.length, 0) + row.length - 1;
    const extra = Math.max(0, required - (right - left - 1));
    if (extra > 0) {
      out = insertColumns(out, right, extra);
      for (const other of labels) {
        if (other.x >= right) other.x += extra;
      }
    }
    let startX = left + 1;
    for (const label of row) {
      label.startX = startX;
      startX += label.text.length + 1;
    }
  }

  const externalByRow = new Map<number, RotatedLabel[]>();
  for (const label of labels.filter(({ enclosed }) => !enclosed)) {
    const row = externalByRow.get(label.y) ?? [];
    row.push(label);
    externalByRow.set(label.y, row);
  }
  for (const row of externalByRow.values()) {
    row.sort((a, b) => a.x - b.x);
    const occupied = labels
      .filter(
        (label) =>
          label.y === row[0].y &&
          label.enclosed &&
          label.startX !== undefined
      )
      .map((label) => ({
        start: label.startX!,
        end: label.startX! + label.text.length - 1,
      }));
    for (const label of row) {
      let start = label.x - Math.floor(label.text.length / 2);
      let collision = occupied.find(
        (range) => start <= range.end && start + label.text.length - 1 >= range.start
      );
      while (collision) {
        start = collision.end + 1;
        collision = occupied.find(
          (range) => start <= range.end && start + label.text.length - 1 >= range.start
        );
      }
      label.startX = start;
      occupied.push({ start, end: start + label.text.length - 1 });
      occupied.sort((a, b) => a.start - b.start);
    }
  }

  for (const label of labels) {
    const startX = label.startX ?? label.x;
    Array.from(label.text).forEach((value, index) => {
      out.set(new Vector(startX + index, label.y), value);
    });
  }
  return out;
}

/** Bounding box of non-empty cells, or null when layer is empty. */
export function layerBBox(layer: ILayerView): Box | null {
  const keys = layer.keys();
  if (keys.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const k of keys) {
    minX = Math.min(minX, k.x);
    maxX = Math.max(maxX, k.x);
    minY = Math.min(minY, k.y);
    maxY = Math.max(maxY, k.y);
  }
  return new Box(new Vector(minX, minY), new Vector(maxX, maxY));
}

/** Anchor so the visual bbox top-left sits on the cursor cell. */
export function anchorForCursor(cursor: Vector, bbox: Box): Vector {
  return cursor.subtract(bbox.topLeft());
}

/** Snap anchor to nearby committed cell edges (within threshold cells). */
export function snapAnchor(
  anchor: Vector,
  committed: ILayerView,
  threshold = 2
): Vector {
  const keys = committed.keys();
  if (keys.length === 0) return anchor;

  const xs = new Set<number>();
  const ys = new Set<number>();
  for (const k of keys) {
    xs.add(k.x);
    xs.add(k.x + 1);
    ys.add(k.y);
    ys.add(k.y + 1);
  }

  let sx = anchor.x;
  let sy = anchor.y;
  let bestDx = threshold + 1;
  let bestDy = threshold + 1;

  for (const x of xs) {
    const d = Math.abs(anchor.x - x);
    if (d <= threshold && d < bestDx) {
      bestDx = d;
      sx = x;
    }
  }
  for (const y of ys) {
    const d = Math.abs(anchor.y - y);
    if (d <= threshold && d < bestDy) {
      bestDy = d;
      sy = y;
    }
  }
  return new Vector(sx, sy);
}

export function offsetLayer(layer: Layer, delta: Vector): Layer {
  const out = new Layer();
  for (const [key, value] of layer.entries()) {
    out.set(key.add(delta), value);
  }
  return out;
}

/** True when any ghost cell occupies a committed non-empty cell. */
export function layerOverlapsCommitted(
  ghost: ILayerView,
  committed: ILayerView
): boolean {
  for (const [pos, value] of ghost.entries()) {
    if (!value || value === " ") continue;
    const existing = committed.get(pos);
    if (existing && existing !== " ") return true;
  }
  return false;
}

export function flipLayerH(layer: Layer): Layer {
  const bbox = layerBBox(layer);
  if (!bbox) return new Layer();
  const out = new Layer();
  const minX = bbox.left();
  const maxX = bbox.right();
  const quotedRuns = quotedTextRuns(layer);
  for (const [key, value] of layer.entries()) {
    const run = quotedRuns
      .get(key.y)
      ?.find(({ start, end }) => key.x >= start && key.x <= end);
    const nx = run
      ? minX + (maxX - run.end) + (key.x - run.start)
      : minX + (maxX - key.x);
    out.set(
      new Vector(nx, key.y),
      run ? value : transformCharacter(value, FLIP_HORIZONTAL)
    );
  }
  return out;
}

export function flipLayerV(layer: Layer): Layer {
  const bbox = layerBBox(layer);
  if (!bbox) return new Layer();
  const out = new Layer();
  const minY = bbox.top();
  const maxY = bbox.bottom();
  const quoted = quotedTextCells(layer);
  for (const [key, value] of layer.entries()) {
    const ny = minY + (maxY - key.y);
    out.set(
      new Vector(key.x, ny),
      quoted.has(key.toString())
        ? value
        : transformCharacter(value, FLIP_VERTICAL)
    );
  }
  return out;
}

/** Rotate layer 90° clockwise within its bbox. */
export function rotateLayer90CW(layer: Layer): Layer {
  const bbox = layerBBox(layer);
  if (!bbox) return new Layer();
  const out = new Layer();
  const minX = bbox.left();
  const minY = bbox.top();
  const height = bbox.bottom() - minY + 1;
  for (const [key, value] of layer.entries()) {
    const rx = key.x - minX;
    const ry = key.y - minY;
    const nx = minX + (height - 1 - ry);
    const ny = minY + rx;
    out.set(new Vector(nx, ny), transformCharacter(value, ROTATE_CW));
  }
  return out;
}
