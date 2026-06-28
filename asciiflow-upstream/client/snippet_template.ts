import { UNICODE } from "#asciiflow/client/constants";

type TemplateValue = string | number | null | undefined;

function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start++;
  while (end > start && lines[end - 1].trim() === "") end--;
  return lines.slice(start, end);
}

function commonIndent(lines: string[]): number {
  const indents = lines
    .filter((line) => line.trim() !== "")
    .map((line) => line.match(/^ */)?.[0].length ?? 0);
  return indents.length ? Math.min(...indents) : 0;
}

function dedent(text: string): string {
  const lines = trimBlankEdges(text.replace(/\r\n?/g, "\n").split("\n"));
  const indent = commonIndent(lines);
  return lines.map((line) => line.slice(indent)).join("\n");
}

function rawTemplate(
  strings: TemplateStringsArray,
  values: TemplateValue[]
): string {
  return strings.raw.reduce((out, part, index) => {
    return out + part + (index < values.length ? String(values[index] ?? "") : "");
  }, "");
}

function lineChars(lines: string[], x: number, y: number): string {
  return lines[y]?.[x] ?? " ";
}

function isHorizontalSource(char: string): boolean {
  return char === "-" || char === "=" || char === "<" || char === ">" || char === "+";
}

function isVerticalSource(char: string): boolean {
  return char === "|" || char === "+" || char === "^" || char === "v";
}

function isArrowShaft(char: string): boolean {
  return char === "-" || char === "=";
}

function convertPlus(lines: string[], x: number, y: number): string {
  const left = isHorizontalSource(lineChars(lines, x - 1, y));
  const right = isHorizontalSource(lineChars(lines, x + 1, y));
  const up = isVerticalSource(lineChars(lines, x, y - 1));
  const down = isVerticalSource(lineChars(lines, x, y + 1));

  if (left && right && up && down) return UNICODE.junctionAll;
  if (left && right && down) return UNICODE.junctionDown;
  if (left && right && up) return UNICODE.junctionUp;
  if (right && up && down) return UNICODE.junctionRight;
  if (left && up && down) return UNICODE.junctionLeft;
  if (right && down) return UNICODE.cornerTopLeft;
  if (left && down) return UNICODE.cornerTopRight;
  if (left && up) return UNICODE.cornerBottomRight;
  if (right && up) return UNICODE.cornerBottomLeft;
  return UNICODE.junctionAll;
}

function convertChar(lines: string[], x: number, y: number): string {
  const char = lineChars(lines, x, y);
  if (char === "+") return convertPlus(lines, x, y);
  if (char === "-") return UNICODE.lineHorizontal;
  if (char === "|") return UNICODE.lineVertical;
  if (char === ">" && isArrowShaft(lineChars(lines, x - 1, y))) {
    return UNICODE.arrowRight;
  }
  if (char === "<" && isArrowShaft(lineChars(lines, x + 1, y))) {
    return UNICODE.arrowLeft;
  }
  if (char === "v" && isVerticalSource(lineChars(lines, x, y - 1))) {
    return UNICODE.arrowDown;
  }
  if (char === "^" && isVerticalSource(lineChars(lines, x, y + 1))) {
    return UNICODE.arrowUp;
  }
  return char;
}

export function asciiDiagramText(text: string): string {
  const source = dedent(text);
  const lines = source.split("\n");
  const converted = lines
    .map((line, y) =>
      Array.from(line, (_, x) => convertChar(lines, x, y)).join("")
    )
    .join("\n");
  return source.includes("\n") ? `${converted}\n` : converted;
}

export function asciiDiagram(
  strings: TemplateStringsArray,
  ...values: TemplateValue[]
): string {
  return asciiDiagramText(rawTemplate(strings, values));
}

export function asciiDiagramLines(lines: string[]): string {
  return asciiDiagramText(lines.join("\n"));
}
