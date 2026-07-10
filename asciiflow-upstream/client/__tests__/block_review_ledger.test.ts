import { describe, expect, it } from "vitest";
import {
  applyAutomatedReview,
  applyReviewPrefill,
  normalizeReviewLedger,
  reviewLedgerCsv,
  reviewAuditKey,
  reviewPrefillKey,
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
    expect(reviewPrefillKey(2)).toBe("svgbob-gui:block-review:2x:prefill-v1");
    expect(reviewAuditKey(2)).toBe("svgbob-gui:block-review:2x:automated-audit-v3");
  });

  it("marks audited entries OK while preserving custom review remarks", () => {
    expect(
      applyAutomatedReview(["process", "actor", "custom"], {
        process: { status: "not_ok", failure: "Text needs to be centered" },
        actor: { status: "not_ok", failure: "arm is still too short" },
      })
    ).toEqual({
      process: { status: "ok", failure: "" },
      actor: { status: "not_ok", failure: "arm is still too short" },
      custom: { status: "ok", failure: "" },
    });
  });

  it("prefills confirmed 3x failures once without replacing a decision", () => {
    expect(applyReviewPrefill(2, {})).toEqual({});
    expect(
      applyReviewPrefill(3, {
        actor: { status: "pending", failure: "specific slash issue" },
        process: { status: "ok", failure: "checked manually" },
      })
    ).toMatchObject({
      actor: { status: "not_ok", failure: "specific slash issue" },
      process: { status: "ok", failure: "checked manually" },
      document: { status: "not_ok" },
    });
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
