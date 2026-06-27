import { SNIPPETS, resolveSnippetText } from "#asciiflow/client/snippets";
import { scalePlacementLayer } from "#asciiflow/client/draw/place_block_scale";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";

for (const snippet of SNIPPETS) {
  const source = resolveSnippetText(snippet);
  const scaled = layerToText(scalePlacementLayer(textToLayer(source), 3));
  console.log(`\n=== ${snippet.label} / ${snippet.title} ===\n${scaled}`);
}
