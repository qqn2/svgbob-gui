import { Box } from "#asciiflow/client/common";
import { ILayerView, Layer } from "#asciiflow/client/layer";
import { Vector } from "#asciiflow/client/vector";

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
    if (!value) continue;
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
  for (const [key, value] of layer.entries()) {
    const nx = minX + (maxX - key.x);
    out.set(new Vector(nx, key.y), value);
  }
  return out;
}

export function flipLayerV(layer: Layer): Layer {
  const bbox = layerBBox(layer);
  if (!bbox) return new Layer();
  const out = new Layer();
  const minY = bbox.top();
  const maxY = bbox.bottom();
  for (const [key, value] of layer.entries()) {
    const ny = minY + (maxY - key.y);
    out.set(new Vector(key.x, ny), value);
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
  const w = bbox.right() - minX + 1;
  for (const [key, value] of layer.entries()) {
    const rx = key.x - minX;
    const ry = key.y - minY;
    const nx = minX + ry;
    const ny = minY + (w - 1 - rx);
    out.set(new Vector(nx, ny), value);
  }
  return out;
}
