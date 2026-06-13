export function parseSvgSize(svg: string): { width: number; height: number } | null {
  const viewBox = svg.match(/viewBox="([^"]+)"/);
  if (viewBox) {
    const parts = viewBox[1].split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
      return { width: parts[2], height: parts[3] };
    }
  }
  const wh = svg.match(/width="([^"]+)"[^>]*height="([^"]+)"/);
  if (wh) {
    const w = parseFloat(wh[1]);
    const h = parseFloat(wh[2]);
    if (!Number.isNaN(w) && !Number.isNaN(h)) return { width: w, height: h };
  }
  return null;
}

export function scaleSvgMarkup(svg: string, scale: number): string {
  if (scale === 1) return svg;
  const size = parseSvgSize(svg);
  if (!size) return svg;
  const w = size.width * scale;
  const h = size.height * scale;
  return svg.replace(
    /<svg([^>]*)>/,
    `<svg$1 width="${w}" height="${h}" viewBox="0 0 ${size.width} ${size.height}">`
  );
}
