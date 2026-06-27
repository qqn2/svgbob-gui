import { connects } from "#asciiflow/client/characters";
import { UNICODE } from "#asciiflow/client/constants";
import { Direction } from "#asciiflow/client/direction";
import { Layer } from "#asciiflow/client/layer";
import { Vector } from "#asciiflow/client/vector";

export function scalePlacementLayer(layer: Layer, scale: number): Layer {
  const s = Math.max(1, Math.min(3, Math.round(scale)));
  if (s === 1) return layer;

  const scaled = new Layer();
  const textRunOffsets = textRunScaledOffsets(layer, s);
  for (const [position, value] of layer.entries()) {
    const textOffset = textRunOffsets.get(position.toString());
    const anchor = textOffset != null
      ? new Vector(textOffset.x, textOffset.y)
      : new Vector(position.x * s, position.y * s);
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

function textRunScaledOffsets(layer: Layer, scale: number): Map<string, Vector> {
  const offsets = new Map<string, Vector>();
  for (const [position, value] of layer.entries()) {
    if (!isText(value)) continue;

    const left = position.add(Direction.LEFT);
    if (isText(layer.get(left))) {
      continue;
    }

    const run = [position];
    let cursor = position.add(Direction.RIGHT);
    while (isText(layer.get(cursor))) {
      run.push(cursor);
      cursor = cursor.add(Direction.RIGHT);
    }
    if (run.length < 2) continue;

    const start = new Vector(position.x * scale, position.y * scale);
    run.forEach((runPosition, index) => {
      offsets.set(runPosition.toString(), start.add(new Vector(index, 0)));
    });
  }
  return offsets;
}

function shouldFillRight(layer: Layer, position: Vector, value: string): boolean {
  const right = layer.get(position.add(Direction.RIGHT));
  if (!right) return false;
  return (
    connects(value, Direction.RIGHT) ||
    connects(right, Direction.LEFT) ||
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
  return value === "+" || value === "-" || value === "<" || value === ">";
}

function isAsciiVertical(value: string): boolean {
  return value === "+" || value === "|" || value === "^" || value === "v";
}

function isText(value: string): boolean {
  return !!value && !isAsciiHorizontal(value) && !isAsciiVertical(value);
}

function rightFill(value: string, right: string): string {
  return isAsciiHorizontal(value) || isAsciiHorizontal(right)
    ? "-"
    : UNICODE.lineHorizontal;
}

function downFill(value: string, down: string): string {
  return isAsciiVertical(value) || isAsciiVertical(down)
    ? "|"
    : UNICODE.lineVertical;
}
