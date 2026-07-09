import { describe, expect, it } from "vitest";
import {
  normalizeReviewLedger,
  reviewLedgerCsv,
  reviewStorageKey,
} from "#asciiflow/client/block_review_ledger";

describe("block review ledger", () => {
  it("normalizes saved review records", () => {
    expect(
      normalizeReviewLedger({
        process: { status: "ok", failure: "" },
        decision: { status: "not_ok", failure: "slash gap" },
        broken: { status: "wat", failure: 12 },
      })
    ).toEqual({
      process: { status: "ok", failure: "" },
      decision: { status: "not_ok", failure: "slash gap" },
      broken: { status: "pending", failure: "" },
    });
    expect(reviewStorageKey(2)).toBe("svgbob-gui:block-review:2x");
  });

  it("exports every review row as CSV", () => {
    const csv = reviewLedgerCsv(
      2,
      [
        { label: "process", title: "Flowchart process" },
        { label: "decision", title: "Flowchart decision" },
      ],
      {
        process: { status: "ok", failure: "" },
        decision: { status: "not_ok", failure: 'right wall says "hello"' },
      }
    );

    expect(csv).toBe([
      "scale,label,title,status,failure",
      '2,"process","Flowchart process","OK",""',
      '2,"decision","Flowchart decision","NOT OK","right wall says ""hello"""',
    ].join("\n"));
  });
});
