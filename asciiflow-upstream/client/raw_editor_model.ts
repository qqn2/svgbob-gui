import { ILayerView, Layer } from "#asciiflow/client/layer";
import { layerBBox } from "#asciiflow/client/layer_placement";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

export interface RawEditorDocument {
  text: string;
  origin: Vector;
}

export function rawEditorDocument(
  layer: ILayerView,
  fallbackOrigin: Vector
): RawEditorDocument {
  const bounds = layerBBox(layer);
  if (!bounds) {
    return { text: "", origin: fallbackOrigin };
  }
  return {
    text: layerToText(layer, bounds),
    origin: bounds.topLeft(),
  };
}

export function rawEditorLayer(text: string, origin: Vector): Layer {
  return textToLayer(text, origin);
}
