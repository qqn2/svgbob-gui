import { connects } from "#asciiflow/client/characters";
import { UNICODE } from "#asciiflow/client/constants";
import { Direction } from "#asciiflow/client/direction";
import { Layer } from "#asciiflow/client/layer";
import { Vector } from "#asciiflow/client/vector";

export function scalePlacementLayer(layer: Layer, scale: number): Layer {
  const s = Math.max(1, Math.min(3, Math.round(scale)));
  if (s === 1) return layer;

  const scaled = new Layer();
  const textRuns = findTextRuns(layer);
  const textPositionKeys = new Set(
    textRuns.flatMap((run) => run.positions.map((position) => position.toString()))
  );
  const compressions = bridgedTextRunCompressions(layer, textRuns, s);
  const textRunOffsets = textRunScaledOffsets(layer, textRuns, compressions, s);
  for (const [position, value] of layer.entries()) {
    const textOffset = textRunOffsets.get(position.toString());
    const anchor = textOffset != null
      ? new Vector(textOffset.x, textOffset.y)
      : new Vector(position.x * s - compressionBefore(compressions, position), position.y * s);
    scaled.set(anchor, value);

    const isTextPosition = (
      textPositionKeys.has(position.toString()) ||
      isInsideQuotedText(layer, position)
    );
    if (!isTextPosition && shouldFillRight(layer, position, value)) {
      const fill = rightFill(value, layer.get(position.add(Direction.RIGHT)));
      for (let i = 1; i < s; i++) {
        scaled.set(anchor.add(new Vector(i, 0)), fill);
      }
    }
    if (shouldFillDown(layer, position, value)) {
      const fill = downFill(value, layer.get(position.add(Direction.DOWN)));
      for (let i = 1; i < s; i++) {
        scaled.set(anchor.add(new Vector(0, i)), fill);
      }
    }
    if ((!isTextPosition || isDiagramWrapper(value)) && shouldFillDownRight(layer, position, value)) {
      for (let i = 1; i < s; i++) {
        scaled.set(anchor.add(new Vector(i, i)), "\\");
      }
    }
    if ((!isTextPosition || isDiagramWrapper(value)) && shouldFillDownLeft(layer, position, value)) {
      for (let i = 1; i < s; i++) {
        scaled.set(anchor.add(new Vector(-i, i)), "/");
      }
    }
    if (
      !isTextPosition &&
      value === "/" &&
      layer.get(position.add(new Vector(1, -1))) !== "/"
    ) {
      for (let i = 1; i < s; i++) {
        scaled.set(anchor.add(new Vector(i, -i)), "/");
      }
    }
    if (
      !isTextPosition &&
      value === "\\" &&
      layer.get(position.add(new Vector(-1, -1))) !== "\\"
    ) {
      for (let i = 1; i < s; i++) {
        scaled.set(anchor.add(new Vector(-i, -i)), "\\");
      }
    }
  }
  return scaled;
}

interface TextRun {
  positions: Vector[];
  start: Vector;
  end: Vector;
}

interface Compression {
  y: number;
  fromX: number;
  delta: number;
}

function findTextRuns(layer: Layer): TextRun[] {
  const runs: TextRun[] = [];
  const quotedPositionKeys = new Set<string>();
  const quotesByRow = new Map<number, Vector[]>();

  for (const [position, value] of layer.entries()) {
    if (value !== '"') continue;
    const row = quotesByRow.get(position.y) ?? [];
    row.push(position);
    quotesByRow.set(position.y, row);
  }

  for (const row of quotesByRow.values()) {
    row.sort((left, right) => left.x - right.x);
    for (let index = 0; index + 1 < row.length; index += 2) {
      const quotedStart = row[index];
      const quotedEnd = row[index + 1];
      const { start, end } = includeTextWrapper(layer, quotedStart, quotedEnd);
      const positions = existingPositionsInRange(layer, start, end);
      for (const runPosition of positions) {
        quotedPositionKeys.add(runPosition.toString());
      }
      runs.push({ positions, start, end });
    }
  }

  for (const [position, value] of layer.entries()) {
    if (quotedPositionKeys.has(position.toString())) continue;
    if (!isText(value)) continue;

    const left = position.add(Direction.LEFT);
    if (isText(layer.get(left)) && !quotedPositionKeys.has(left.toString())) {
      continue;
    }

    const positions = [position];
    let cursor = position.add(Direction.RIGHT);
    while (isText(layer.get(cursor)) && !quotedPositionKeys.has(cursor.toString())) {
      positions.push(cursor);
      cursor = cursor.add(Direction.RIGHT);
    }
    if (positions.length >= 2) {
      runs.push({
        positions,
        start: positions[0],
        end: positions[positions.length - 1],
      });
    }
  }
  return runs;
}

function includeTextWrapper(
  layer: Layer,
  quotedStart: Vector,
  quotedEnd: Vector
): { start: Vector; end: Vector } {
  let left = quotedStart.add(Direction.LEFT);
  while (left.x >= quotedStart.x - 3 && layer.get(left) == null) {
    left = left.add(Direction.LEFT);
  }
  let right = quotedEnd.add(Direction.RIGHT);
  while (right.x <= quotedEnd.x + 3 && layer.get(right) == null) {
    right = right.add(Direction.RIGHT);
  }

  const wrapper = layer.get(left);
  const matchingWrapper = wrapper === "[" ? "]" : wrapper === "(" ? ")" : null;
  if (matchingWrapper && layer.get(right) === matchingWrapper) {
    return { start: left, end: right };
  }
  return { start: quotedStart, end: quotedEnd };
}

function existingPositionsInRange(layer: Layer, start: Vector, end: Vector): Vector[] {
  const positions: Vector[] = [];
  for (let x = start.x; x <= end.x; x++) {
    const position = new Vector(x, start.y);
    if (layer.get(position) != null) {
      positions.push(position);
    }
  }
  return positions;
}

function isInsideQuotedText(layer: Layer, position: Vector): boolean {
  let quoteCount = 0;
  for (let x = position.x - 1; x >= position.x - 300; x--) {
    if (layer.get(new Vector(x, position.y)) === '"') {
      quoteCount++;
    }
  }
  return quoteCount % 2 === 1;
}

function bridgedTextRunCompressions(
  layer: Layer,
  runs: TextRun[],
  scale: number
): Compression[] {
  return runs
    .filter((run) => {
      return (
        isHorizontalConnector(layer.get(run.start.add(Direction.LEFT))) &&
        isHorizontalConnector(layer.get(run.end.add(Direction.RIGHT)))
      );
    })
    .map((run) => ({
      y: run.start.y,
      fromX: run.end.x + 1,
      delta: (run.end.x - run.start.x + 1) * (scale - 1),
    }));
}

function textRunScaledOffsets(
  layer: Layer,
  runs: TextRun[],
  compressions: Compression[],
  scale: number
): Map<string, Vector> {
  const offsets = new Map<string, Vector>();
  const textPositionKeys = new Set(
    runs.flatMap((run) => run.positions.map((position) => position.toString()))
  );
  for (const run of runs) {
    const width = run.end.x - run.start.x + 1;
    const bounds = uniqueEnclosingBounds(layer, run, runs, textPositionKeys);
    const externalAnchor = anchoredTextStart(
      layer,
      run,
      width,
      textPositionKeys,
      compressions,
      scale
    );
    const centeredStart = bounds
      ? Math.round((
        scaledX(bounds.left, run.start.y, compressions, scale) +
        scaledX(bounds.right, run.start.y, compressions, scale) -
        (width - 1)
      ) / 2)
      : Math.round(
        ((run.start.x + run.end.x) * scale - (width - 1)) / 2 -
        compressionBefore(compressions, run.start)
      );
    const start = new Vector(
      isBridgedTextRun(layer, run)
        ? scaledX(run.start.x, run.start.y, compressions, scale)
        : bounds
          ? centeredStart
          : externalAnchor ?? centeredStart,
      run.start.y * scale
    );
    run.positions.forEach((runPosition) => {
      offsets.set(
        runPosition.toString(),
        start.add(new Vector(runPosition.x - run.start.x, 0))
      );
    });
  }
  return offsets;
}

function scaledX(
  x: number,
  y: number,
  compressions: Compression[],
  scale: number
): number {
  return x * scale - compressionBefore(compressions, new Vector(x, y));
}

function isBridgedTextRun(layer: Layer, run: TextRun): boolean {
  return (
    isHorizontalConnector(layer.get(run.start.add(Direction.LEFT))) &&
    isHorizontalConnector(layer.get(run.end.add(Direction.RIGHT)))
  );
}

function uniqueEnclosingBounds(
  layer: Layer,
  run: TextRun,
  runs: TextRun[],
  textPositionKeys: Set<string>
): { left: number; right: number } | null {
  const left = findShapeBoundary(layer, run.start, Direction.LEFT, textPositionKeys);
  const right = findShapeBoundary(layer, run.end, Direction.RIGHT, textPositionKeys);
  if (left == null || right == null || left >= run.start.x || right <= run.end.x) {
    return null;
  }

  const enclosedRuns = runs.filter((candidate) => (
    candidate.start.y === run.start.y &&
    candidate.start.x > left &&
    candidate.end.x < right
  ));
  return enclosedRuns.length === 1 ? { left, right } : null;
}

function findShapeBoundary(
  layer: Layer,
  origin: Vector,
  direction: Vector,
  textPositionKeys: Set<string>
): number | null {
  let cursor = origin.add(direction);
  for (let distance = 0; distance < 200; distance++) {
    const value = layer.get(cursor);
    if (
      value != null &&
      !textPositionKeys.has(cursor.toString()) &&
      (
        value === "+" ||
        (connects(value, Direction.UP) && connects(value, Direction.DOWN)) ||
        !isHorizontalConnector(value)
      )
    ) {
      return cursor.x;
    }
    cursor = cursor.add(direction);
  }
  return null;
}

function anchoredTextStart(
  layer: Layer,
  run: TextRun,
  width: number,
  textPositionKeys: Set<string>,
  compressions: Compression[],
  scale: number
): number | null {
  const left = nearestStructuralPosition(layer, run.start, Direction.LEFT, textPositionKeys);
  const right = nearestStructuralPosition(layer, run.end, Direction.RIGHT, textPositionKeys);
  const leftGap = left ? run.start.x - left.x : Number.POSITIVE_INFINITY;
  const rightGap = right ? right.x - run.end.x : Number.POSITIVE_INFINITY;

  if (left && leftGap <= 3 && rightGap > 3) {
    return scaledX(left.x, left.y, compressions, scale) + leftGap;
  }
  if (right && rightGap <= 3 && leftGap > 3) {
    return scaledX(right.x, right.y, compressions, scale) - rightGap - width + 1;
  }
  return null;
}

function nearestStructuralPosition(
  layer: Layer,
  origin: Vector,
  direction: Vector,
  textPositionKeys: Set<string>
): Vector | null {
  let cursor = origin.add(direction);
  for (let distance = 0; distance < 200; distance++) {
    if (layer.get(cursor) != null && !textPositionKeys.has(cursor.toString())) {
      return cursor;
    }
    cursor = cursor.add(direction);
  }
  return null;
}

function compressionBefore(compressions: Compression[], position: Vector): number {
  return compressions
    .filter((compression) => compression.y === position.y && position.x >= compression.fromX)
    .reduce((total, compression) => total + compression.delta, 0);
}

function shouldFillRight(layer: Layer, position: Vector, value: string): boolean {
  const right = layer.get(position.add(Direction.RIGHT));
  if (!right) return false;
  return (
    connects(value, Direction.RIGHT) ||
    connects(right, Direction.LEFT) ||
    value === "=" ||
    (isShapeEndpoint(value) && isAsciiHorizontal(right)) ||
    (isAsciiHorizontal(value) && isShapeEndpoint(right)) ||
    (isAsciiHorizontal(value) && isAsciiHorizontal(right))
  );
}

function shouldFillDown(layer: Layer, position: Vector, value: string): boolean {
  const down = layer.get(position.add(Direction.DOWN));
  if (!down) return false;
  return (
    connects(value, Direction.DOWN) ||
    connects(down, Direction.UP) ||
    (isShapeEndpoint(value) && isAsciiVertical(down)) ||
    (isAsciiVertical(value) && isShapeEndpoint(down)) ||
    (isAsciiVertical(value) && isAsciiVertical(down))
  );
}

function shouldFillDownRight(layer: Layer, position: Vector, value: string): boolean {
  const downRight = layer.get(position.add(new Vector(1, 1)));
  return (
    (value === "\\" && (downRight === "\\" || isDiagonalEndpoint(downRight))) ||
    (isDiagonalEndpoint(value) && downRight === "\\")
  );
}

function shouldFillDownLeft(layer: Layer, position: Vector, value: string): boolean {
  const downLeft = layer.get(position.add(new Vector(-1, 1)));
  return (
    (value === "/" && (downLeft === "/" || isDiagonalEndpoint(downLeft))) ||
    (isDiagonalEndpoint(value) && downLeft === "/")
  );
}

function isAsciiHorizontal(value: string): boolean {
  return value === "+" || value === "-" || value === "=" || value === "<" || value === ">";
}

function isHorizontalConnector(value: string): boolean {
  return (
    isAsciiHorizontal(value) ||
    (Boolean(value) && connects(value, Direction.LEFT) && connects(value, Direction.RIGHT))
  );
}

function isShapeEndpoint(value: string): boolean {
  return value === "+" || value === "." || value === "'";
}

function isDiagonalEndpoint(value: string): boolean {
  return (
    isShapeEndpoint(value) ||
    isAsciiVertical(value) ||
    value === "o" ||
    isDiagramWrapper(value) ||
    ["┌", "┐", "└", "┘", "├", "┤", "┬", "┴", "┼"].includes(value)
  );
}

function isDiagramWrapper(value: string): boolean {
  return value === "(" || value === ")" || value === "[" || value === "]";
}

function isAsciiVertical(value: string): boolean {
  return value === "+" || value === "|" || value === "^" || value === "v";
}

function isText(value: string): boolean {
  return /^[A-Za-z0-9_[\]:.]+$/.test(value ?? "");
}

function rightFill(value: string, right: string): string {
  if (value === "=" || right === "=") return "=";
  return isAsciiHorizontal(value) || isAsciiHorizontal(right)
    ? "-"
    : UNICODE.lineHorizontal;
}

function downFill(value: string, down: string): string {
  return isAsciiVertical(value) || isAsciiVertical(down)
    ? "|"
    : UNICODE.lineVertical;
}
