import { scalePlacementLayer } from "#asciiflow/client/draw/place_block_scale";
import { layerBBox, offsetLayer } from "#asciiflow/client/layer_placement";
import { Layer } from "#asciiflow/client/layer";
import {
  resolveSnippetText,
  SNIPPETS,
} from "#asciiflow/client/lib/snippets/snippets";
import { textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

function clampScale(scale: number): number {
  return Math.max(1, Math.min(3, Math.round(scale)));
}

export function blockReviewDrawingName(scale: number): string {
  return `block-review-${clampScale(scale)}x`;
}

/** Build an internal review sheet with every reusable block stamped at one scale. */
export function buildBlockReviewLayer(scale: number): Layer {
  const reviewScale = clampScale(scale);
  const sheet = new Layer();
  let y = 0;

  for (const snippet of SNIPPETS) {
    const heading = `${snippet.label} - ${snippet.title} (${reviewScale}x)`;
    sheet.setFrom(textToLayer(heading, new Vector(0, y)));

    const source = snippet.preview || resolveSnippetText(snippet);
    const scaled = scalePlacementLayer(textToLayer(source, new Vector(0, 0)), reviewScale);
    const bbox = layerBBox(scaled);

    if (!bbox) {
      y += 4;
      continue;
    }

    sheet.setFrom(offsetLayer(
      scaled,
      new Vector(-bbox.left(), y + 2 - bbox.top())
    ));
    y += bbox.bottom() - bbox.top() + 6;
  }

  return sheet;
}
