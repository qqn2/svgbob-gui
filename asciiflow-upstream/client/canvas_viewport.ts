/** Screen rect of the ASCII canvas pane — used for pointer ↔ cell math. */
export interface CanvasViewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

let viewport: CanvasViewport = {
  left: 0,
  top: 0,
  width: typeof window !== "undefined" ? window.innerWidth : 800,
  height: typeof window !== "undefined" ? window.innerHeight : 600,
};

export function setCanvasViewport(next: CanvasViewport): void {
  viewport = next;
}

export function getCanvasViewport(): CanvasViewport {
  return viewport;
}

export function canvasCenter(): { x: number; y: number } {
  return {
    x: viewport.left + viewport.width / 2,
    y: viewport.top + viewport.height / 2,
  };
}
