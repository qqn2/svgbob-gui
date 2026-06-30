import { DEFAULT_DIAGRAM } from "#asciiflow/client/default_diagram";
import { store } from "#asciiflow/client/store";
import { textToLayer } from "#asciiflow/client/text_utils";
import { decodeAsciiFromUrl } from "#asciiflow/client/svgbob_storage";
import { Vector } from "#asciiflow/client/vector";

const SEEDED_KEY = "svgbob-gui:default-seeded";

export function loadAsciiDiagram(text: string, at = new Vector(5, 5)): void {
  const layer = textToLayer(text, at);
  store.currentCanvas.setScratchLayer(layer);
  store.currentCanvas.commitScratch();
}

export function seedDefaultDiagramIfEmpty(): void {
  if (store.currentCanvas.committed.size() > 0) return;
  if (!DEFAULT_DIAGRAM.trim()) return;
  try {
    if (localStorage.getItem(SEEDED_KEY)) return;
    localStorage.setItem(SEEDED_KEY, "1");
  } catch {
    // ignore
  }
  loadAsciiDiagram(DEFAULT_DIAGRAM);
}

export function loadFromBobRoute(encoded: string): boolean {
  const text = decodeAsciiFromUrl(encoded);
  if (!text) return false;
  store.currentCanvas.clear();
  loadAsciiDiagram(text);
  return true;
}
