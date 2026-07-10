const TEXT_CHARACTER_WIDTH = 8;
const TEXT_RIGHT_PADDING = 4;
const TEXT_BOTTOM_PADDING = 6;

/** Expands svgbob's canvas when edge labels fall outside its reported size. */
export function expandSvgToFitText(svg: string): string {
  const root = svg.match(/<svg\b[^>]*\bwidth="([\d.]+)"[^>]*\bheight="([\d.]+)"[^>]*>/);
  if (!root) return svg;

  let width = Number(root[1]);
  let height = Number(root[2]);
  const textPattern = /<text\b[^>]*\bx="([\d.-]+)"[^>]*\by="([\d.-]+)"[^>]*>([\s\S]*?)<\/text>/g;

  for (const match of svg.matchAll(textPattern)) {
    const x = Number(match[1]);
    const y = Number(match[2]);
    const text = match[3]
      .replace(/<[^>]*>/g, "")
      .replace(/&(?:amp|lt|gt|quot|apos);/g, "x");
    width = Math.max(width, x + text.length * TEXT_CHARACTER_WIDTH + TEXT_RIGHT_PADDING);
    height = Math.max(height, y + TEXT_BOTTOM_PADDING);
  }

  return svg.replace(root[0], root[0]
    .replace(/\bwidth="[\d.]+"/, `width="${width}"`)
    .replace(/\bheight="[\d.]+"/, `height="${height}"`));
}
