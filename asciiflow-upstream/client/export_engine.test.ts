import { describe, expect, it } from "vitest";
import { parseSvgSize, scaleSvgMarkup } from "#asciiflow/client/export_svg_utils";

describe("export_svg_utils", () => {
  const sampleSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 100 50"></svg>';

  it("parses SVG width and height", () => {
    expect(parseSvgSize(sampleSvg)).toEqual({ width: 100, height: 50 });
  });

  it("scales SVG markup dimensions", () => {
    const scaled = scaleSvgMarkup(sampleSvg, 2);
    expect(scaled).toContain('width="200"');
    expect(scaled).toContain('height="100"');
    expect(scaled).toContain('viewBox="0 0 100 50"');
  });

  it("leaves scale 1 SVG unchanged", () => {
    expect(scaleSvgMarkup(sampleSvg, 1)).toBe(sampleSvg);
  });
});
