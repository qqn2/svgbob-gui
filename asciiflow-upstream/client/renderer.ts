import { errorSvg } from "#asciiflow/client/render_errors";

type ConvertFn = (input: string) => string;

let convertFn: ConvertFn | null = null;
let initError: string | null = null;
let initPromise: Promise<void> | null = null;

export async function initRenderer(): Promise<void> {
  if (convertFn) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const mod = await import("svgbob-wasm");
      if (typeof mod.render !== "function") {
        throw new Error("svgbob-wasm: render export not found");
      }
      convertFn = mod.render;
    } catch (err) {
      initError =
        err instanceof Error ? err.message : "svgbob WASM failed to load";
      throw new Error(initError);
    }
  })();
  return initPromise;
}

export function isRendererReady(): boolean {
  return convertFn !== null;
}

export function getRendererInitError(): string | null {
  return initError;
}

export function renderSync(ascii: string): string {
  if (!convertFn) {
    throw new Error(initError ?? "Renderer not initialized");
  }
  try {
    return convertFn(ascii);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Render error";
    throw new Error(msg);
  }
}

export async function renderAsync(ascii: string): Promise<string> {
  return renderSync(ascii);
}

export { errorSvg, isErrorSvg } from "#asciiflow/client/render_errors";
