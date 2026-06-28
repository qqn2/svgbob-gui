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
  }
  return scaled;
}

interface TextRun {
  positions: Vector[];
}

interface Compression {
  y: number;
  fromX: number;
  delta: number;
}

function findTextRuns(layer: Layer): TextRun[] {
  const runs: TextRun[] = [];
  for (const [position, value] of layer.entries()) {
    if (!isText(value)) continue;

    const left = position.add(Direction.LEFT);
    if (isText(layer.get(left))) {
      continue;
    }

    const positions = [position];
    let cursor = position.add(Direction.RIGHT);
    while (isText(layer.get(cursor))) {
      positions.push(cursor);
      cursor = cursor.add(Direction.RIGHT);
    }
    if (positions.length >= 2) {
      runs.push({ positions });
    }
  }
  return runs;
}

function bridgedTextRunCompressions(
  layer: Layer,
  runs: TextRun[],
  scale: number
): Compression[] {
  return runs
    .filter((run) => {
      const start = run.positions[0];
      const end = run.positions[run.positions.length - 1];
      return (
        isAsciiHorizontal(layer.get(start.add(Direction.LEFT))) &&
        isAsciiHorizontal(layer.get(end.add(Direction.RIGHT)))
      );
    })
    .map((run) => ({
      y: run.positions[0].y,
      fromX: run.positions[run.positions.length - 1].x + 1,
      delta: run.positions.length * (scale - 1),
    }));
}

function textRunScaledOffsets(
  runs: TextRun[],
  compressions: Compression[],
  scale: number
): Map<string, Vector> {
  const offsets = new Map<string, Vector>();
  for (const run of runs) {
    const position = run.positions[0];
    const start = new Vector(
      position.x * scale - compressionBefore(compressions, position),
      position.y * scale
    );
    run.positions.forEach((runPosition, index) => {
      offsets.set(runPosition.toString(), start.add(new Vector(index, 0)));
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
    (isAsciiHorizontal(value) && isAsciiHorizontal(right))
  );
}

function shouldFillDown(layer: Layer, position: Vector, value: string): boolean {
  const down = layer.get(position.add(Direction.DOWN));
  if (!down) return false;
  return (
    connects(value, Direction.DOWN) ||
    connects(down, Direction.UP) ||
    (isAsciiVertical(value) && isAsciiVertical(down))
  );
}

function isAsciiHorizontal(value: string): boolean {
  return value === "+" || value === "-" || value === "=" || value === "<" || value === ">";
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
