import {
  connect,
  connectable,
  connects,
  isBoxDrawing,
} from "#asciiflow/client/characters";
import { Direction } from "#asciiflow/client/direction";
import { Layer } from "#asciiflow/client/layer";

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
        connectable(committedValue, direction) &&
        !connects(committedValue, direction)
    );

    if (incomingConnections.length > 0) {
      layer.set(position, connect(committedValue, incomingConnections));
    }
  }
}
