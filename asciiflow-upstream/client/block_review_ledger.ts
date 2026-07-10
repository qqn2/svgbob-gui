export type BlockReviewStatus = "pending" | "ok" | "not_ok";

export interface BlockReviewRecord {
  status: BlockReviewStatus;
  failure: string;
}

export type BlockReviewLedger = Record<string, BlockReviewRecord>;

/** Confirmed failures from the initial 3x visual pass. */
const PREFILLED_3X_REVIEW: BlockReviewLedger = {
  process: { status: "not_ok", failure: "Text needs to be centered" },
  terminator: { status: "not_ok", failure: "Text needs to be centered when scaling" },
  decision: { status: "not_ok", failure: "Text needs to be centered when scaling" },
  "io shape": { status: "not_ok", failure: "Text needs to be centered when scaling" },
  database: { status: "not_ok", failure: "Text needs to be centered when scaling" },
  document: {
    status: "not_ok",
    failure: "Text needs to be centered when scaling and scale did not work on the . ' connection",
  },
  actor: { status: "not_ok", failure: "/ \\ were not expanded" },
};

const LEGACY_AUTOMATED_FAILURES = new Set(
  Object.values(PREFILLED_3X_REVIEW).map((record) => record.failure)
);

export function emptyReviewRecord(): BlockReviewRecord {
  return { status: "pending", failure: "" };
}

export function reviewStorageKey(scale: number): string {
  return `svgbob-gui:block-review:${scale}x`;
}

export function reviewPrefillKey(scale: number): string {
  return `${reviewStorageKey(scale)}:prefill-v1`;
}

export function reviewAuditKey(scale: number): string {
  return `${reviewStorageKey(scale)}:automated-audit-v3`;
}

/**
 * Add the initial visual-review findings without replacing a reviewer decision.
 * A pending record is promoted because the prefill is a confirmed failure.
 */
export function applyReviewPrefill(
  scale: number,
  ledger: BlockReviewLedger
): BlockReviewLedger {
  if (scale !== 3) return ledger;

  const result = { ...ledger };
  for (const [label, prefilled] of Object.entries(PREFILLED_3X_REVIEW)) {
    const existing = result[label];
    result[label] = {
      status: !existing || existing.status === "pending" ? prefilled.status : existing.status,
      failure: existing?.failure || prefilled.failure,
    };
  }
  return result;
}

/** Mark the automated three-scale audit as passing without erasing custom notes. */
export function applyAutomatedReview(
  labels: string[],
  ledger: BlockReviewLedger
): BlockReviewLedger {
  const result = { ...ledger };
  for (const label of labels) {
    const existing = result[label];
    const isLegacyFinding = Boolean(
      existing?.failure && LEGACY_AUTOMATED_FAILURES.has(existing.failure)
    );
    if (
      !existing ||
      (existing.status === "pending" && !existing.failure) ||
      isLegacyFinding
    ) {
      result[label] = { status: "ok", failure: "" };
    }
  }
  return result;
}

export function normalizeReviewLedger(value: unknown): BlockReviewLedger {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const ledger: BlockReviewLedger = {};
  for (const [label, record] of Object.entries(value as Record<string, unknown>)) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      continue;
    }
    const status = (record as { status?: unknown }).status;
    const failure = (record as { failure?: unknown }).failure;
    ledger[label] = {
      status: status === "ok" || status === "not_ok" ? status : "pending",
      failure: typeof failure === "string" ? failure : "",
    };
  }
  return ledger;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function reviewStatusLabel(status: BlockReviewStatus): string {
  if (status === "ok") return "OK";
  if (status === "not_ok") return "NOT OK";
  return "PENDING";
}

export function reviewLedgerCsv(
  scale: number,
  items: Array<{ label: string; title: string }>,
  ledger: BlockReviewLedger
): string {
  const rows = ["scale,label,title,status,failure"];
  for (const item of items) {
    const record = ledger[item.label] ?? emptyReviewRecord();
    rows.push(
      [
        String(scale),
        csvCell(item.label),
        csvCell(item.title),
        csvCell(reviewStatusLabel(record.status)),
        csvCell(record.failure),
      ].join(",")
    );
  }
  return rows.join("\n");
}
