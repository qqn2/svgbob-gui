import { describe, expect, it } from "vitest";
import { errorSvg, isErrorSvg } from "#asciiflow/client/render_errors";

describe("renderer", () => {
  it("builds error SVG and detects it", () => {
    const svg = errorSvg("test <fail>");
    expect(svg).toContain("&lt;fail&gt;");
    expect(isErrorSvg(svg)).toBe(true);
  });

  it("does not flag normal SVG as error", () => {
    expect(
      isErrorSvg('<svg xmlns="http://www.w3.org/2000/svg"><rect /></svg>')
    ).toBe(false);
  });
});
