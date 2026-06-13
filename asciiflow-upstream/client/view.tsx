import * as constants from "#asciiflow/client/constants";
import { Box } from "#asciiflow/client/common";
import { FONT_SPEC, CHAR_BASELINE } from "#asciiflow/client/font";
import { store, useAppStore, ToolMode } from "#asciiflow/client/store";
import { Vector } from "#asciiflow/client/vector";
import {
  getCanvasViewport,
  setCanvasViewport,
} from "#asciiflow/client/canvas_viewport";
import viewStyles from "#asciiflow/client/view.module.css";
import * as React from "react";
import { useEffect, useState, useRef } from "react";

/**
 * Handles view operations, state and management of the screen.
 */

/** Counter incremented after each actual canvas paint. */
export let renderedVersion = 0;

function getColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    background: style.getPropertyValue("--color-canvas-bg").trim() || "#ffffff",
    grid: style.getPropertyValue("--color-canvas-grid").trim() || "#e4e4e4",
    text: style.getPropertyValue("--color-canvas-text").trim() || "#1a1a1a",
    highlight: style.getPropertyValue("--color-canvas-highlight").trim() || "#f0f0f0",
    selection: style.getPropertyValue("--color-canvas-selection").trim() || "#d4cff8",
    overlap: style.getPropertyValue("--color-canvas-overlap").trim() || "#f8d4cf",
  };
}

export function setCanvasCursor(cursor: string) {
  const element = document.getElementById("ascii-canvas");
  if (element) {
    element.style.cursor = cursor;
  }
}

export const View = ({ ...rest }: React.HTMLAttributes<HTMLCanvasElement>) => {
  const darkMode = useAppStore((s) => s.darkMode);
  const showGrid = useAppStore((s) => s.showGrid);
  const canvasVersion = useAppStore((s) => s.canvasVersion);
  const route = useAppStore((s) => s.route);

  const hostRef = useRef<HTMLDivElement>(null);
  const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  const [dims, setDims] = useState({
    w: getCanvasViewport().width,
    h: getCanvasViewport().height,
  });

  const colors = getColors();

  useEffect(() => {
    const canvas = document.getElementById(
      "ascii-canvas"
    ) as HTMLCanvasElement;
    render(canvas);
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const sync = () => {
      const r = host.getBoundingClientRect();
      setCanvasViewport({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      });
      setDims({ w: r.width, h: r.height });
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(host);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <div ref={hostRef} className={viewStyles.canvasHost}>
      <canvas
        width={dims.w * dpr}
        height={dims.h * dpr}
        tabIndex={0}
        style={{
          backgroundColor: colors.background,
          touchAction: "none",
          position: "absolute",
          left: 0,
          top: 0,
          width: dims.w,
          height: dims.h,
        }}
        id="ascii-canvas"
        {...rest}
      />
    </div>
  );
};

/**
 * Renders the given state to the canvas.
 * TODO: Room for efficiency here still. Drawing should be incremental,
 *       however performance is currently very acceptable on test devices.
 */
function render(canvas: HTMLCanvasElement) {
  const committed = store.currentCanvas.committed;
  const scratch = store.currentCanvas.scratch;
  const selection = store.currentCanvas.selection;
  const showGrid = store.showGrid;

  const dpr = window.devicePixelRatio || 1;
  const context = canvas.getContext("2d");
  context.setTransform(1, 0, 0, 1, 0, 0);
  // Clear the visible area.
  context.clearRect(0, 0, canvas.width, canvas.height);

  const zoom = store.currentCanvas.zoom;
  const offset = store.currentCanvas.offset;

  // Scale for device pixel ratio first, then apply zoom.
  context.scale(dpr * zoom, dpr * zoom);
  // Use CSS dimensions (not canvas.width which includes DPR) for centering.
  const cssWidth = canvas.width / dpr;
  const cssHeight = canvas.height / dpr;
  context.translate(cssWidth / 2 / zoom, cssHeight / 2 / zoom);

  const visible = visibleCellBox();
  const startOffset = visible.topLeft();
  const endOffset = visible.bottomRight();

  const colors = getColors();

  // Render the grid.
  if (showGrid) {
    context.lineWidth = 1;
    context.strokeStyle = colors.grid;
    context.beginPath();
    for (let i = startOffset.x; i < endOffset.x; i++) {
      context.moveTo(i * constants.CHAR_PIXELS_H - offset.x, 0 - offset.y);
      context.lineTo(
        i * constants.CHAR_PIXELS_H - offset.x,
        2000 * constants.CHAR_PIXELS_V - offset.y
      );
    }
    for (let j = startOffset.y; j < endOffset.y; j++) {
      context.moveTo(0 - offset.x, j * constants.CHAR_PIXELS_V - offset.y);
      context.lineTo(
        2000 * constants.CHAR_PIXELS_H - offset.x,
        j * constants.CHAR_PIXELS_V - offset.y
      );
    }
    context.stroke();
  }
  context.font = FONT_SPEC;

  function highlight(position: Vector, color: string) {
    context.fillStyle = color;
    context.fillRect(
      position.x * constants.CHAR_PIXELS_H - offset.x + 0.5,
      (position.y - 1) * constants.CHAR_PIXELS_V - offset.y + 0.5,
      constants.CHAR_PIXELS_H - 1,
      constants.CHAR_PIXELS_V - 1
    );
  }

  function text(position: Vector, value: string) {
    if (value !== null && value !== "" && value !== " ") {
      context.fillStyle = colors.text;
      context.fillText(
        value,
        position.x * constants.CHAR_PIXELS_H - offset.x,
        (position.y - 1) * constants.CHAR_PIXELS_V - offset.y + CHAR_BASELINE
      );
    }
  }

  if (!!selection) {
    // Fill the selection box.
    const topLeft = selection.topLeft();
    const bottomRight = selection.bottomRight();
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        highlight(new Vector(x, y), colors.selection);
      }
    }
  }
  for (const [position, value] of committed.entries()) {
    const cellValue = committed.get(position);
    text(position, cellValue);
  }
  const blockOverlap =
    store.placeBlockTool.isActive && store.placeBlockTool.overlaps;
  const scratchHighlight = blockOverlap ? colors.overlap : colors.highlight;
  for (const [position] of scratch.entries()) {
    highlight(position, scratchHighlight);
    const cellValue = scratch.get(position);
    text(position, cellValue);
  }

  // Snap guide lines while placing RTL blocks.
  if (store.placeBlockTool.isActive && store.placeBlockTool.snapped) {
    context.save();
    context.strokeStyle = colors.selection;
    context.lineWidth = 1;
    context.setLineDash([4, 4]);
    const keys = scratch.keys();
    if (keys.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      for (const k of keys) {
        minX = Math.min(minX, k.x);
        minY = Math.min(minY, k.y);
      }
      const gx = minX * constants.CHAR_PIXELS_H - offset.x;
      const gy = (minY - 1) * constants.CHAR_PIXELS_V - offset.y;
      context.beginPath();
      context.moveTo(gx, 0 - offset.y);
      context.lineTo(gx, 2000 * constants.CHAR_PIXELS_V - offset.y);
      context.moveTo(0 - offset.x, gy);
      context.lineTo(2000 * constants.CHAR_PIXELS_H - offset.x, gy);
      context.stroke();
    }
    context.restore();
  }

  // Show dimensions label while dragging with box, line, or arrow tools.
  const toolMode = store.selectedToolMode;
  if (
    scratch.size() > 0 &&
    (toolMode === ToolMode.BOX ||
      toolMode === ToolMode.LINES ||
      toolMode === ToolMode.ARROWS ||
      toolMode === ToolMode.SELECT)
  ) {
    const scratchKeys = scratch.keys();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const key of scratchKeys) {
      if (key.x < minX) minX = key.x;
      if (key.x > maxX) maxX = key.x;
      if (key.y < minY) minY = key.y;
      if (key.y > maxY) maxY = key.y;
    }
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const label = `${w}\u00d7${h}`;

    // Position the label just below and right of the scratch bounds.
    const labelX = (maxX + 1) * constants.CHAR_PIXELS_H - offset.x + 4;
    const labelY = (maxY) * constants.CHAR_PIXELS_V - offset.y + 4;

    context.font = FONT_SPEC;
    const metrics = context.measureText(label);
    const padding = 3;
    const bgX = labelX - padding;
    const bgY = labelY - constants.CHAR_PIXELS_V + padding;
    const bgW = metrics.width + padding * 2;
    const bgH = constants.CHAR_PIXELS_V;

    context.fillStyle = colors.selection;
    context.fillRect(bgX, bgY, bgW, bgH);
    context.fillStyle = colors.background;
    context.fillText(label, labelX, labelY);
  }

  if (!!selection) {
    // Outline the selection box.
    const topLeft = selection.topLeft();
    const bottomRight = selection.bottomRight();
    context.lineWidth = 1;
    context.strokeStyle = colors.selection;
    context.beginPath();
    context.moveTo(
      topLeft.x * constants.CHAR_PIXELS_H - offset.x,
      (topLeft.y - 1) * constants.CHAR_PIXELS_V - offset.y
    );
    context.lineTo(
      topLeft.x * constants.CHAR_PIXELS_H - offset.x,
      bottomRight.y * constants.CHAR_PIXELS_V - offset.y
    );
    context.lineTo(
      (bottomRight.x + 1) * constants.CHAR_PIXELS_H - offset.x,
      bottomRight.y * constants.CHAR_PIXELS_V - offset.y
    );
    context.lineTo(
      (bottomRight.x + 1) * constants.CHAR_PIXELS_H - offset.x,
      (topLeft.y - 1) * constants.CHAR_PIXELS_V - offset.y
    );
    context.lineTo(
      topLeft.x * constants.CHAR_PIXELS_H - offset.x,
      (topLeft.y - 1) * constants.CHAR_PIXELS_V - offset.y
    );
    context.stroke();
  }
  renderedVersion++;
}

/** Cell bounding box currently visible in the canvas pane (matches paint culling). */
export function visibleCellBox(): Box {
  const vp = getCanvasViewport();
  const startOffset = screenToCell(new Vector(vp.left, vp.top)).subtract(
    new Vector(constants.RENDER_PADDING_CELLS, constants.RENDER_PADDING_CELLS)
  );
  const endOffset = screenToCell(
    new Vector(vp.left + vp.width, vp.top + vp.height)
  ).add(new Vector(constants.RENDER_PADDING_CELLS, constants.RENDER_PADDING_CELLS));

  const start = new Vector(
    Math.max(0, Math.min(startOffset.x, constants.MAX_GRID_WIDTH)),
    Math.max(0, Math.min(startOffset.y, constants.MAX_GRID_HEIGHT))
  );
  const end = new Vector(
    Math.max(0, Math.min(endOffset.x, constants.MAX_GRID_WIDTH)),
    Math.max(0, Math.min(endOffset.y, constants.MAX_GRID_HEIGHT))
  );
  return new Box(start, end);
}

/**
 * Given a screen coordinate, find the frame coordinates.
 */
export function screenToFrame(vector: Vector) {
  const zoom = store.currentCanvas.zoom;
  const offset = store.currentCanvas.offset;
  const vp = getCanvasViewport();
  const cx = vp.left + vp.width / 2;
  const cy = vp.top + vp.height / 2;
  return new Vector(
    (vector.x - cx) / zoom + offset.x,
    (vector.y - cy) / zoom + offset.y
  );
}

/**
 * Given a frame coordinate, find the screen coordinates.
 */
export function frameToScreen(vector: Vector) {
  const zoom = store.currentCanvas.zoom;
  const offset = store.currentCanvas.offset;
  const vp = getCanvasViewport();
  const cx = vp.left + vp.width / 2;
  const cy = vp.top + vp.height / 2;
  return new Vector(
    (vector.x - offset.x) * zoom + cx,
    (vector.y - offset.y) * zoom + cy
  );
}

/**
 * Given a frame coordinate, return the indices for the nearest cell.
 */
export function frameToCell(vector: Vector) {
  // We limit the edges in a bit, as most drawing needs a full context to work.
  return new Vector(
    Math.min(
      Math.max(
        1,
        Math.round(
          (vector.x - constants.CHAR_PIXELS_H / 2) / constants.CHAR_PIXELS_H
        )
      ),
      constants.MAX_GRID_WIDTH - 2
    ),
    Math.min(
      Math.max(
        1,
        Math.round(
          (vector.y + constants.CHAR_PIXELS_V / 2) / constants.CHAR_PIXELS_V
        )
      ),
      constants.MAX_GRID_HEIGHT - 2
    )
  );
}

/**
 * Given a cell coordinate, return the frame coordinates.
 */
export function cellToFrame(vector: Vector) {
  return new Vector(
    Math.round(vector.x * constants.CHAR_PIXELS_H),
    Math.round(vector.y * constants.CHAR_PIXELS_V)
  );
}

/**
 * Given a screen coordinate, return the indices for the nearest cell.
 */
export function screenToCell(vector: Vector) {
  return frameToCell(screenToFrame(vector));
}

/**
 * Given a cell coordinate, return the on screen coordinates.
 */
export function cellToScreen(vector: Vector) {
  return frameToScreen(cellToFrame(vector));
}
