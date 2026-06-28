import {
  FILL_TAG_PATTERN,
  fillStyleForTag,
} from "#asciiflow/client/fill_palette";
import { ILayerView } from "#asciiflow/client/layer";
import { layerToText } from "#asciiflow/client/text_utils";

const SVG_CELL_W = 8;
const SVG_CELL_H = 16;
const SVG_BOX_INSET_X = 4;
const SVG_BOX_INSET_Y = 8;

interface FilledBox {
  top: number;
  left: number;
  bottom: number;
  right: number;
  tagId: string;
}

/** Tags referenced in diagram text (e.g. `{c1}`). */
export function collectFillTags(ascii: string): Set<string> {
  const tags = new Set<string>();
  const re = new RegExp(FILL_TAG_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(ascii)) !== null) {
    tags.add(match[0].slice(1, -1));
  }
  return tags;
}

function cell(lines: string[], x: number, y: number): string {
  return lines[y]?.charAt(x) || " ";
}

function isVerticalWall(c: string): boolean {
  return c === "|" || c === "│";
}

function isHorizontalWall(c: string): boolean {
  return c === "-" || c === "─" || c === "_";
}

function isCorner(c: string): boolean {
  return c === "+" || c === "┌" || c === "┐" || c === "└" || c === "┘";
}

function isHorizontalBorderRow(
  lines: string[],
  y: number,
  left: number,
  right: number
): boolean {
  if (!isCorner(cell(lines, left, y)) || !isCorner(cell(lines, right, y))) {
    return false;
  }
  for (let x = left + 1; x < right; x++) {
    if (!isHorizontalWall(cell(lines, x, y))) {
      return false;
    }
  }
  return left < right;
}

function isVerticalBorderCol(
  lines: string[],
  x: number,
  top: number,
  bottom: number
): boolean {
  if (!isCorner(cell(lines, x, top)) || !isCorner(cell(lines, x, bottom))) {
    return false;
  }
  for (let y = top + 1; y < bottom; y++) {
    if (!isVerticalWall(cell(lines, x, y))) {
      return false;
    }
  }
  return top < bottom;
}

function findFilledBoxAt(lines: string[], x: number, y: number): Omit<FilledBox, "tagId"> | null {
  let left = x;
  while (left >= 0 && !isVerticalWall(cell(lines, left, y))) left--;
  if (!isVerticalWall(cell(lines, left, y))) return null;

  let right = x;
  const maxWidth = Math.max(...lines.map((line) => line.length));
  while (right <= maxWidth && !isVerticalWall(cell(lines, right, y))) right++;
  if (!isVerticalWall(cell(lines, right, y)) || left >= right) return null;

  let top = y;
  while (top >= 0 && !isHorizontalBorderRow(lines, top, left, right)) top--;
  if (!isHorizontalBorderRow(lines, top, left, right)) return null;

  let bottom = y;
  while (bottom < lines.length && !isHorizontalBorderRow(lines, bottom, left, right)) bottom++;
  if (!isHorizontalBorderRow(lines, bottom, left, right)) return null;

  if (
    !isVerticalBorderCol(lines, left, top, bottom) ||
    !isVerticalBorderCol(lines, right, top, bottom)
  ) {
    return null;
  }

  return { top, left, bottom, right };
}

export function stripFillTags(ascii: string): string {
  return ascii.replace(FILL_TAG_PATTERN, (tag) => " ".repeat(tag.length));
}

export function collectFilledBoxes(ascii: string): FilledBox[] {
  const lines = ascii.replace(/\r\n?/g, "\n").split("\n");
  const boxes = new Map<string, FilledBox>();

  lines.forEach((line, y) => {
    const re = new RegExp(FILL_TAG_PATTERN.source, "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(line)) !== null) {
      const tagId = match[0].slice(1, -1);
      const box = findFilledBoxAt(lines, match.index, y);
      if (!box || !fillStyleForTag(tagId)) continue;
      boxes.set(
        `${box.left},${box.top},${box.right},${box.bottom}`,
        { ...box, tagId }
      );
    }
  });

  return [...boxes.values()];
}

function attrNumber(attrs: string, name: string): number | null {
  const match = attrs.match(new RegExp(`${name}="([^"]+)"`));
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : null;
}

function setAttr(attrs: string, name: string, value: string): string {
  if (attrs.match(new RegExp(`\\s${name}="[^"]*"`))) {
    return attrs.replace(new RegExp(`\\s${name}="[^"]*"`), ` ${name}="${value}"`);
  }
  return `${attrs} ${name}="${value}"`;
}

function withoutNoFillClass(attrs: string): string {
  return attrs.replace(/\sclass="([^"]*)"/, (_, classes: string) => {
    const next = classes
      .split(/\s+/)
      .filter((className) => className && className !== "nofill")
      .join(" ");
    return next ? ` class="${next}"` : "";
  });
}

function rectMatchesBox(attrs: string, box: FilledBox): boolean {
  const x = attrNumber(attrs, "x");
  const y = attrNumber(attrs, "y");
  const width = attrNumber(attrs, "width");
  const height = attrNumber(attrs, "height");
  if (x == null || y == null || width == null || height == null) return false;

  return (
    x === box.left * SVG_CELL_W + SVG_BOX_INSET_X &&
    y === box.top * SVG_CELL_H + SVG_BOX_INSET_Y &&
    width === (box.right - box.left) * SVG_CELL_W &&
    height === (box.bottom - box.top) * SVG_CELL_H
  );
}

export function applyFillStylesToSvg(svg: string, ascii: string): string {
  const boxes = collectFilledBoxes(ascii);
  if (boxes.length === 0) return svg;

  return svg.replace(/<rect\b([^>]*)><\/rect>/g, (full, attrs: string) => {
    const box = boxes.find((candidate) => rectMatchesBox(attrs, candidate));
    if (!box) return full;
    const fillStyle = fillStyleForTag(box.tagId);
    if (!fillStyle) return full;

    const nextAttrs = setAttr(
      withoutNoFillClass(attrs),
      "style",
      `fill:${fillStyle.fill};stroke:${fillStyle.stroke};`
    );
    return `<rect${nextAttrs}></rect>`;
  });
}

/** Plain grid text, including fill tags as source metadata. */
export function layerToSvgbobText(layer: ILayerView): string {
  return layerToText(layer);
}

export function isKnownFillTag(tagId: string): boolean {
  return fillStyleForTag(tagId) != null;
}
