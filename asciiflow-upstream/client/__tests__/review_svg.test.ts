import { describe, expect, it } from "vitest";
import { expandSvgToFitText } from "#asciiflow/client/review_svg";

describe("expandSvgToFitText", () => {
  it("expands past a label placed beyond the right edge", () => {
    const svg = '<svg width="440" height="160"><text x="442" y="12">dst0</text></svg>';

    expect(expandSvgToFitText(svg)).toContain('width="478" height="160"');
  });

  it("expands past labels placed below the bottom edge", () => {
    const svg = '<svg width="216" height="160"><text x="2" y="172">A</text></svg>';

    expect(expandSvgToFitText(svg)).toContain('width="216" height="178"');
  });

  it("leaves sufficient SVG dimensions unchanged", () => {
    const svg = '<svg width="200" height="100"><text x="10" y="20">label</text></svg>';

    expect(expandSvgToFitText(svg)).toBe(svg);
  });
});
