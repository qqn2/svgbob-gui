import { describe, expect, it } from "vitest";
import { UNICODE } from "#asciiflow/client/constants";
import { asciiDiagram, asciiDiagramLines } from "#asciiflow/client/lib/snippets/snippet_template";

describe("snippet_template", () => {
  it("converts readable ASCII boxes to clean drawing characters", () => {
    expect(asciiDiagram`
      +---+
      | A |
      +---+
    `).toBe(
      [
        `${UNICODE.cornerTopLeft}${UNICODE.lineHorizontal.repeat(3)}${UNICODE.cornerTopRight}`,
        `${UNICODE.lineVertical} A ${UNICODE.lineVertical}`,
        `${UNICODE.cornerBottomLeft}${UNICODE.lineHorizontal.repeat(3)}${UNICODE.cornerBottomRight}`,
        "",
      ].join("\n")
    );
  });

  it("keeps one-line snippets one line", () => {
    expect(asciiDiagram`---->`).toBe(
      `${UNICODE.lineHorizontal.repeat(4)}${UNICODE.arrowRight}`
    );
  });

  it("supports backslash-heavy ASCII via line arrays", () => {
    expect(asciiDiagramLines(["a -->+\\", "b -->+/"])).toContain("\\");
  });
});
