import { describe, expect, it } from "vitest";
import { CHAR_PIXELS_H, CHAR_PIXELS_V } from "#asciiflow/client/constants";
import {
  frameToCell,
  offsetToScrollPosition,
  scrollPositionToOffset,
} from "#asciiflow/client/view";
import { Vector } from "#asciiflow/client/vector";

describe("view coordinate mapping", () => {
  it("allows pointer input to target the first canvas column", () => {
    expect(frameToCell(new Vector(0, CHAR_PIXELS_V)).x).toBe(0);
    expect(frameToCell(new Vector(CHAR_PIXELS_H / 2 - 1, CHAR_PIXELS_V)).x).toBe(0);
  });

  it("continues mapping the next cell after the first-column midpoint", () => {
    expect(frameToCell(new Vector(CHAR_PIXELS_H * 1.5, CHAR_PIXELS_V)).x).toBe(1);
  });

  it("maps canvas offset to native scrollbar position", () => {
    expect(offsetToScrollPosition(new Vector(100, 50), 2, 200, 100)).toEqual({
      left: 100,
      top: 50,
    });
  });

  it("maps native scrollbar position back to canvas offset", () => {
    const offset = scrollPositionToOffset(100, 50, 2, 200, 100);
    expect(offset.x).toBe(100);
    expect(offset.y).toBe(50);
  });
});
