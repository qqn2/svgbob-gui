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
  const compressions = bridgedTextRunCompressions(layer, textRuns, s);
  const textRunOffsets = textRunScaledOffsets(textRuns, compressions, s);
  for (const [position, value] of layer.entries()) {
    const textOffset = textRunOffsets.get(position.toString());
    const anchor = textOffset != null
      ? new Vector(textOffset.x, textOffset.y)
      : new Vector(position.x * s - compressionBefore(compressions, position), position.y * s);
    scaled.set(anchor, value);

    if (shouldFillRight(layer, position, value)) {
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
    if (shouldFillDownRight(layer, position, value)) {
      for (let i = 1; i < s; i++) {
        scaled.set(anchor.add(new Vector(i, i)), "\\");
      }
    }
    if (shouldFillDownLeft(layer, position, value)) {
      for (let i = 1; i < s; i++) {
        scaled.set(anchor.add(new Vector(-i, i)), "/");
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

  for (const [position, value] of layer.entries()) {
    if (value !== '"') continue;

    const left = position.add(Direction.LEFT);
    if (layer.get(left) === '"') {
      continue;
    }

    const end = findQuoteEnd(layer, position);
    if (!end) {
      continue;
    }

    const positions = existingPositionsInRange(layer, position, end);
    for (const runPosition of positions) {
      quotedPositionKeys.add(runPosition.toString());
    }
    runs.push({ positions, start: position, end });
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

function findQuoteEnd(layer: Layer, start: Vector): Vector | null {
  let cursor = start.add(Direction.RIGHT);
  while (cursor.x < start.x + 200) {
    if (layer.get(cursor) === '"') {
      return cursor;
    }
    cursor = cursor.add(Direction.RIGHT);
  }
  return null;
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

function bridgedTextRunCompressions(
  layer: Layer,
  runs: TextRun[],
  scale: number
): Compression[] {
  return runs
    .filter((run) => {
      return (
        isAsciiHorizontal(layer.get(run.start.add(Direction.LEFT))) &&
        isAsciiHorizontal(layer.get(run.end.add(Direction.RIGHT)))
      );
    })
    .map((run) => ({
      y: run.start.y,
      fromX: run.end.x + 1,
      delta: (run.end.x - run.start.x + 1) * (scale - 1),
    }));
}

function textRunScaledOffsets(
  runs: TextRun[],
  compressions: Compression[],
  scale: number
): Map<string, Vector> {
  const offsets = new Map<string, Vector>();
  for (const run of runs) {
    const start = new Vector(
      run.start.x * scale - compressionBefore(compressions, run.start),
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
    (value === "\\" && (downRight === "\\" || isShapeEndpoint(downRight))) ||
    (isShapeEndpoint(value) && downRight === "\\")
  );
}

function shouldFillDownLeft(layer: Layer, position: Vector, value: string): boolean {
  const downLeft = layer.get(position.add(new Vector(-1, 1)));
  return (
    (value === "/" && (downLeft === "/" || isShapeEndpoint(downLeft))) ||
    (isShapeEndpoint(value) && downLeft === "/")
  );
}

function isAsciiHorizontal(value: string): boolean {
  return value === "+" || value === "-" || value === "=" || value === "<" || value === ">";
}

function isShapeEndpoint(value: string): boolean {
  return value === "+" || value === "." || value === "'";
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
