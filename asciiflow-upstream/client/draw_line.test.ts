import { describe, expect, it } from "vitest";
import { UNICODE } from "#asciiflow/client/constants";
import { mergeCommittedConflicts } from "#asciiflow/client/draw/line_conflicts";
import { Layer } from "#asciiflow/client/layer";
import { Vector } from "#asciiflow/client/vector";

describe("DrawLine", () => {
  it("turns arrow crossings over box edges into junctions", () => {
    const committed = new Layer();
    const scratch = new Layer();
    const crossing = new Vector(5, 5);

    committed.set(crossing, UNICODE.lineHorizontal);
    scratch.set(crossing, UNICODE.lineVertical);

    mergeCommittedConflicts(scratch, committed);

    expect(scratch.get(crossing)).toBe(UNICODE.junctionAll);
  });

  it("turns horizontal arrow crossings over vertical box edges into junctions", () => {
    const committed = new Layer();
    const scratch = new Layer();
    const crossing = new Vector(5, 5);

    committed.set(crossing, UNICODE.lineVertical);
    scratch.set(crossing, UNICODE.lineHorizontal);

    mergeCommittedConflicts(scratch, committed);

    expect(scratch.get(crossing)).toBe(UNICODE.junctionAll);
  });
});
