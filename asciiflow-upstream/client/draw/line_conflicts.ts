import {
  connect,
  connectable,
  connects,
  isBoxDrawing,
} from "#asciiflow/client/characters";
import { UNICODE } from "#asciiflow/client/constants";
import { Direction } from "#asciiflow/client/direction";
import { Layer } from "#asciiflow/client/layer";
import { Vector } from "#asciiflow/client/vector";

export function mergeCommittedConflicts(layer: Layer, committed: Layer): void {
  for (const position of layer.keys()) {
    const scratchValue = layer.get(position);
    const committedValue = committed.get(position);
    if (!isBoxDrawing(scratchValue) || !isBoxDrawing(committedValue)) {
      continue;
    }

    const incomingConnections = Direction.ALL.filter(
      (direction) =>
        connects(scratchValue, direction) &&
        scratchConnects(layer, position, direction) &&
        connectable(committedValue, direction) &&
        !connects(committedValue, direction)
    );

    if (incomingConnections.length > 0) {
      layer.set(position, connectWithoutCross(committedValue, incomingConnections));
    }
  }
}

function scratchConnects(layer: Layer, position: Vector, direction: Direction): boolean {
  return connects(
    layer.get(position.add(direction)),
    direction.opposite()
  );
}

function connectWithoutCross(value: string, directions: Direction[]): string {
  let nextValue = value;
  for (const direction of directions) {
    const candidate = connect(nextValue, direction);
    if (candidate !== UNICODE.junctionAll) {
      nextValue = candidate;
    }
  }
  return nextValue;
}
