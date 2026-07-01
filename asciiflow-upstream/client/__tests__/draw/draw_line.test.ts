import { describe, expect, it } from "vitest";
import { UNICODE } from "#asciiflow/client/constants";
import { mergeCommittedConflicts } from "#asciiflow/client/draw/line_conflicts";
import { Layer } from "#asciiflow/client/layer";
import { Vector } from "#asciiflow/client/vector";

describe("DrawLine", () => {
  it("turns a vertical endpoint on a horizontal edge into an upward tee", () => {
    const committed = new Layer();
    const scratch = new Layer();
    const crossing = new Vector(5, 5);

    committed.set(crossing, UNICODE.lineHorizontal);
    scratch.set(new Vector(5, 4), UNICODE.lineVertical);
    scratch.set(crossing, UNICODE.lineVertical);

    mergeCommittedConflicts(scratch, committed);

    expect(scratch.get(crossing)).toBe(UNICODE.junctionUp);
  });

  it("turns a vertical endpoint from below into a downward tee", () => {
    const committed = new Layer();
    const scratch = new Layer();
    const crossing = new Vector(5, 5);

    committed.set(crossing, UNICODE.lineHorizontal);
    scratch.set(crossing, UNICODE.lineVertical);
    scratch.set(new Vector(5, 6), UNICODE.lineVertical);

    mergeCommittedConflicts(scratch, committed);

    expect(scratch.get(crossing)).toBe(UNICODE.junctionDown);
  });

  it("turns a horizontal endpoint on a vertical edge into a left tee", () => {
    const committed = new Layer();
    const scratch = new Layer();
    const crossing = new Vector(5, 5);

    committed.set(crossing, UNICODE.lineVertical);
    scratch.set(new Vector(4, 5), UNICODE.lineHorizontal);
    scratch.set(crossing, UNICODE.lineHorizontal);

    mergeCommittedConflicts(scratch, committed);

    expect(scratch.get(crossing)).toBe(UNICODE.junctionLeft);
  });

  it("turns a horizontal endpoint from the right into a right tee", () => {
    const committed = new Layer();
    const scratch = new Layer();
    const crossing = new Vector(5, 5);

    committed.set(crossing, UNICODE.lineVertical);
    scratch.set(crossing, UNICODE.lineHorizontal);
    scratch.set(new Vector(6, 5), UNICODE.lineHorizontal);

    mergeCommittedConflicts(scratch, committed);

    expect(scratch.get(crossing)).toBe(UNICODE.junctionRight);
  });

  it("does not insert a full cross for a dragged crossing", () => {
    const committed = new Layer();
    const scratch = new Layer();
    const crossing = new Vector(5, 5);

    committed.set(crossing, UNICODE.lineHorizontal);
    scratch.set(new Vector(5, 4), UNICODE.lineVertical);
    scratch.set(crossing, UNICODE.lineVertical);
    scratch.set(new Vector(5, 6), UNICODE.lineVertical);

    mergeCommittedConflicts(scratch, committed);

    expect(scratch.get(crossing)).toBe(UNICODE.junctionUp);
    expect(scratch.get(crossing)).not.toBe(UNICODE.junctionAll);
  });
});
