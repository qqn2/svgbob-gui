export type BlockReviewStatus = "pending" | "ok" | "not_ok";

export interface BlockReviewRecord {
  status: BlockReviewStatus;
  failure: string;
}

export type BlockReviewLedger = Record<string, BlockReviewRecord>;

export function emptyReviewRecord(): BlockReviewRecord {
  return { status: "pending", failure: "" };
}

export function reviewStorageKey(scale: number): string {
  return `svgbob-gui:block-review:${scale}x`;
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
