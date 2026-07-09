import { scalePlacementLayer } from "#asciiflow/client/draw/place_block_scale";
import { layerBBox, offsetLayer } from "#asciiflow/client/layer_placement";
import { Layer } from "#asciiflow/client/layer";
import {
  Snippet,
  resolveSnippetText,
  SNIPPETS,
} from "#asciiflow/client/lib/snippets/snippets";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

export function clampReviewScale(scale: number): number {
  return Math.max(1, Math.min(3, Math.round(scale)));
}

export function blockReviewDrawingName(scale: number): string {
  return `block-review-${clampReviewScale(scale)}x`;
}

export interface BlockReviewItem {
  snippet: Snippet;
  index: number;
  heading: string;
  sourceAscii: string;
  scaledAscii: string;
  scaledLayer: Layer;
}

export function buildBlockReviewItems(scale: number): BlockReviewItem[] {
  const reviewScale = clampReviewScale(scale);
  return SNIPPETS.map((snippet, index) => {
    const sourceAscii = snippet.preview || resolveSnippetText(snippet);
    const scaledLayer = scalePlacementLayer(
      textToLayer(sourceAscii, new Vector(0, 0)),
      reviewScale
    );
    return {
      snippet,
      index,
      heading: `${snippet.label} - ${snippet.title} (${reviewScale}x)`,
      sourceAscii,
      scaledAscii: layerToText(scaledLayer),
      scaledLayer,
    };
  });
}

/** Build an internal review sheet with every reusable block stamped at one scale. */
export function buildBlockReviewLayer(scale: number): Layer {
  const reviewScale = clampReviewScale(scale);
  const sheet = new Layer();
  let y = 0;

  for (const item of buildBlockReviewItems(reviewScale)) {
    sheet.setFrom(textToLayer(`"${item.heading}"`, new Vector(0, y)));
    const bbox = layerBBox(item.scaledLayer);

    if (!bbox) {
      y += 4;
      continue;
    }

    sheet.setFrom(offsetLayer(
      item.scaledLayer,
      new Vector(-bbox.left(), y + 2 - bbox.top())
    ));
    y += bbox.bottom() - bbox.top() + 6;
  }

  return sheet;
}
