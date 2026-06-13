import { renderSync } from "#asciiflow/client/renderer";
import {
  parseSvgSize,
  scaleSvgMarkup,
} from "#asciiflow/client/export_svg_utils";
import { ILayerView } from "#asciiflow/client/layer";
import { layerToText } from "#asciiflow/client/text_utils";

export { parseSvgSize, scaleSvgMarkup } from "#asciiflow/client/export_svg_utils";

export type ExportFormat = "txt" | "svg" | "png";
export type ExportBackground = "white" | "transparent";

export interface ExportOptions {
  format: ExportFormat;
  scale: number;
  background: ExportBackground;
  filenameBase: string;
}

export function renderAsciiToSvg(ascii: string): string {
  return renderSync(ascii);
}

export function asciiFromLayer(layer: ILayerView): string {
  return layerToText(layer);
}

export function downloadBlob(content: Blob | string, filename: string, mime?: string): void {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: mime ?? "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function svgToPngBlob(
  svg: string,
  scale: number,
  background: ExportBackground
): Promise<Blob> {
  const size = parseSvgSize(svg);
  const baseW = size?.width ?? 800;
  const baseH = size?.height ?? 600;
  const pixelW = Math.ceil(baseW * scale);
  const pixelH = Math.ceil(baseH * scale);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    );
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = pixelW;
        canvas.height = pixelH;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        if (background === "white") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pixelW, pixelH);
        }
        ctx.drawImage(img, 0, 0, pixelW, pixelH);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) reject(new Error("PNG export failed"));
            else resolve(blob);
          },
          "image/png",
          1
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG for PNG export"));
    };
    img.src = url;
  });
}

export async function exportDiagram(
  ascii: string,
  options: ExportOptions
): Promise<void> {
  const base = options.filenameBase || "diagram";
  if (options.format === "txt") {
    downloadBlob(ascii, `${base}.txt`, "text/plain;charset=utf-8");
    return;
  }
  const svg = scaleSvgMarkup(renderAsciiToSvg(ascii), options.scale);
  if (options.format === "svg") {
    downloadBlob(svg, `${base}.svg`, "image/svg+xml;charset=utf-8");
    return;
  }
  const png = await svgToPngBlob(svg, 1, options.background);
  downloadBlob(png, `${base}.png`, "image/png");
}

export async function exportLayer(
  layer: ILayerView,
  options: ExportOptions
): Promise<void> {
  const ascii = layerToText(layer);
  await exportDiagram(ascii, options);
}
