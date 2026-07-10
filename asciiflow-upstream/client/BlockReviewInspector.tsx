import "#asciiflow/client/ui/theme.css";
import * as React from "react";
import {
  buildBlockReviewItems,
  clampReviewScale,
} from "#asciiflow/client/block_review";
import {
  BlockReviewLedger,
  BlockReviewStatus,
  applyAutomatedReview,
  applyReviewPrefill,
  emptyReviewRecord,
  normalizeReviewLedger,
  reviewLedgerCsv,
  reviewAuditKey,
  reviewPrefillKey,
  reviewStatusLabel,
  reviewStorageKey,
} from "#asciiflow/client/block_review_ledger";
import { renderSync } from "#asciiflow/client/renderer";
import { ThemeMode, loadThemeMode } from "#asciiflow/client/theme_settings";
import styles from "#asciiflow/client/block_review_inspector.module.css";

interface BlockReviewInspectorProps {
  scale: number;
}

function renderSvg(ascii: string): { svg: string; error: string | null } {
  try {
    return { svg: renderSync(ascii), error: null };
  } catch (error) {
    return {
      svg: "",
      error: error instanceof Error ? error.message : "Render failed",
    };
  }
}

function scaleHref(scale: number): string {
  return `#/review/blocks/${scale}/inspect`;
}

function loadLedger(scale: number, labels: string[]): BlockReviewLedger {
  try {
    let ledger = normalizeReviewLedger(
      JSON.parse(localStorage.getItem(reviewStorageKey(scale)) ?? "{}")
    );
    if (!localStorage.getItem(reviewPrefillKey(scale))) {
      localStorage.setItem(reviewPrefillKey(scale), "done");
      ledger = applyReviewPrefill(scale, ledger);
    }
    if (!localStorage.getItem(reviewAuditKey(scale))) {
      localStorage.setItem(reviewAuditKey(scale), "done");
      ledger = applyAutomatedReview(labels, ledger);
    }

    return ledger;
  } catch {
    return {};
  }
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function BlockReviewInspector({ scale }: BlockReviewInspectorProps) {
  const reviewScale = clampReviewScale(scale);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | BlockReviewStatus>("all");
  const [themeMode] = React.useState<ThemeMode>(loadThemeMode);
  const items = React.useMemo(
    () => buildBlockReviewItems(reviewScale),
    [reviewScale]
  );
  const labels = React.useMemo(
    () => items.map((item) => item.snippet.label),
    [items]
  );
  const [ledger, setLedger] = React.useState<BlockReviewLedger>(
    () => loadLedger(reviewScale, labels)
  );

  React.useEffect(() => {
    setLedger(loadLedger(reviewScale, labels));
    setStatusFilter("all");
  }, [labels, reviewScale]);

  React.useEffect(() => {
    localStorage.setItem(reviewStorageKey(reviewScale), JSON.stringify(ledger));
  }, [ledger, reviewScale]);

  const recordFor = React.useCallback(
    (label: string) => ledger[label] ?? emptyReviewRecord(),
    [ledger]
  );
  const updateRecord = React.useCallback(
    (label: string, update: Partial<BlockReviewLedger[string]>) => {
      setLedger((current) => ({
        ...current,
        [label]: { ...(current[label] ?? emptyReviewRecord()), ...update },
      }));
    },
    []
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = items.filter((item) => {
    const matchesQuery = !normalizedQuery || [
      item.snippet.label,
      item.snippet.title,
      item.sourceAscii,
      item.scaledAscii,
    ]
      .join("\n")
      .toLowerCase()
      .includes(normalizedQuery);
    return (
      matchesQuery &&
      (statusFilter === "all" || recordFor(item.snippet.label).status === statusFilter)
    );
  });
  const counts = items.reduce(
    (result, item) => {
      result[recordFor(item.snippet.label).status]++;
      return result;
    },
    { pending: 0, ok: 0, not_ok: 0 }
  );

  return (
    <main className={styles.reviewApp} data-theme={themeMode}>
      <header className={styles.header}>
        <div>
          <strong>Block scale review</strong>
          <span>{visibleItems.length} / {items.length} snippets · {counts.ok} OK · {counts.not_ok} not OK</span>
        </div>
        <label className={styles.search}>
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="label, title, or ASCII"
          />
        </label>
        <nav className={styles.scaleNav} aria-label="Review scale">
          {[1, 2, 3].map((candidate) => (
            <a
              key={candidate}
              className={candidate === reviewScale ? styles.activeScale : ""}
              href={scaleHref(candidate)}
            >
              {candidate}x
            </a>
          ))}
          <a href={`#/review/blocks/${reviewScale}`}>canvas</a>
        </nav>
        <div className={styles.ledgerControls}>
          <label>
            <span>Review</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.currentTarget.value as "all" | BlockReviewStatus)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="not_ok">Not OK</option>
              <option value="ok">OK</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `block-review-${reviewScale}x.csv`,
                reviewLedgerCsv(
                  reviewScale,
                  items.map((item) => ({
                    label: item.snippet.label,
                    title: item.snippet.title,
                  })),
                  ledger
                )
              )
            }
          >
            Export CSV
          </button>
        </div>
      </header>

      <section className={styles.grid}>
        {visibleItems.map((item) => {
          const record = recordFor(item.snippet.label);
          const rendered = renderSvg(item.scaledAscii);
          return (
            <article className={styles.card} key={item.snippet.label}>
              <header className={styles.cardHeader}>
                <div>
                  <span>{String(item.index + 1).padStart(2, "0")}</span>
                  <strong>{item.snippet.label}</strong>
                </div>
                <p>{item.snippet.title}</p>
              </header>
              <div className={styles.reviewStatus}>
                <label>
                  <span>Result</span>
                  <select
                    value={record.status}
                    onChange={(event) =>
                      updateRecord(item.snippet.label, {
                        status: event.currentTarget.value as BlockReviewStatus,
                      })
                    }
                  >
                    <option value="pending">PENDING</option>
                    <option value="ok">OK</option>
                    <option value="not_ok">NOT OK</option>
                  </select>
                </label>
                <label>
                  <span>Failure / note</span>
                  <input
                    value={record.failure}
                    onChange={(event) =>
                      updateRecord(item.snippet.label, {
                        failure: event.currentTarget.value,
                      })
                    }
                    placeholder="e.g. right wall has a gap at 2x"
                  />
                </label>
                <span className={styles.statusHint}>{reviewStatusLabel(record.status)}</span>
              </div>
              <div className={styles.reviewPair}>
                <section className={styles.asciiPane}>
                  <div className={styles.paneTitle}>scaled ASCII</div>
                  <pre>{item.scaledAscii}</pre>
                </section>
                <section className={styles.svgPane}>
                  <div className={styles.paneTitle}>svgbob render</div>
                  {rendered.error ? (
                    <pre className={styles.error}>{rendered.error}</pre>
                  ) : (
                    <div
                      className={styles.svgMount}
                      dangerouslySetInnerHTML={{ __html: rendered.svg }}
                    />
                  )}
                </section>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
