import {
  SNIPPETS,
  Snippet,
  SnippetParams,
  beginBlockPlacement,
} from "#asciiflow/client/snippets";
import styles from "#asciiflow/client/snippets.module.css";
import { TextField } from "#asciiflow/client/ui/components";
import * as React from "react";

function ParamDialog({
  snippet,
  onPlace,
  onCancel,
}: {
  snippet: Snippet;
  onPlace: (params: SnippetParams) => void;
  onCancel: () => void;
}) {
  const defaults = snippet.defaultParams ?? {};
  const [label, setLabel] = React.useState(defaults.label ?? "BLOCK");
  const [busWidth, setBusWidth] = React.useState(String(defaults.busWidth ?? 32));
  const [clk, setClk] = React.useState(defaults.clk ?? "CLK");
  const [rst, setRst] = React.useState(defaults.rst ?? "RST_N");

  const needsLabel = "label" in defaults || snippet.label === "box";
  const needsBus =
    "busWidth" in defaults ||
    snippet.label === "bus" ||
    snippet.label === "SRAM";
  const needsClk =
    "clk" in defaults ||
    snippet.label === "reg/FF" ||
    snippet.label === "ICG" ||
    snippet.label === "APB" ||
    snippet.label === "rst sync";
  const needsRst = snippet.label === "rst sync";

  return (
    <div className={styles.paramForm}>
      <span className={styles.paramTitle}>{snippet.title}</span>
      {needsLabel && (
        <TextField
          label="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}
      {needsBus && (
        <TextField
          label="bus width"
          value={busWidth}
          onChange={(e) => setBusWidth(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}
      {needsClk && (
        <TextField
          label="clock"
          value={clk}
          onChange={(e) => setClk(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}
      {needsRst && (
        <TextField
          label="reset"
          value={rst}
          onChange={(e) => setRst(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}
      <div className={styles.paramActions}>
        <button type="button" className={styles.paramBtn} onClick={onCancel}>
          cancel
        </button>
        <button
          type="button"
          className={[styles.paramBtn, styles.paramBtnPrimary].join(" ")}
          onClick={() =>
            onPlace({
              label,
              busWidth: parseInt(busWidth, 10) || 32,
              clk,
              rst,
            })
          }
        >
          place
        </button>
      </div>
    </div>
  );
}

export function SnippetsPanel() {
  const [pending, setPending] = React.useState<Snippet | null>(null);

  const handleClick = (snippet: Snippet) => {
    if (snippet.parametric) {
      setPending(snippet);
    } else {
      beginBlockPlacement(snippet);
    }
  };

  return (
    <div className={styles.panel}>
      <span className={styles.label}>RTL blocks</span>
      <span className={styles.hint}>
        ghost follows cursor · click to place · R rotate · H/V flip · Esc cancels
      </span>
      {pending && (
        <ParamDialog
          snippet={pending}
          onCancel={() => setPending(null)}
          onPlace={(params) => {
            beginBlockPlacement(pending, params);
            setPending(null);
          }}
        />
      )}
      {SNIPPETS.map((s) => (
        <button
          key={s.label}
          type="button"
          className={styles.snippetBtn}
          title={s.title}
          onClick={() => handleClick(s)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
