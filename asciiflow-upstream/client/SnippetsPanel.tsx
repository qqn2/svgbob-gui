import {
  SNIPPETS,
  Snippet,
  SnippetParams,
  beginBlockPlacement,
} from "#asciiflow/client/snippets";
import { store } from "#asciiflow/client/store";
import styles from "#asciiflow/client/snippets.module.css";
import { TextField } from "#asciiflow/client/ui/components";
import * as React from "react";

function ParamDialog({
  snippet,
  onParamsChange,
  onCancel,
}: {
  snippet: Snippet;
  onParamsChange: (params: SnippetParams) => void;
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

  const emitParams = (next: Partial<SnippetParams>) => {
    onParamsChange({
      label,
      busWidth: parseInt(busWidth, 10) || 32,
      clk,
      rst,
      ...next,
    });
  };

  return (
    <div className={styles.paramForm}>
      <span className={styles.paramTitle}>{snippet.title}</span>
      {needsLabel && (
        <TextField
          label="label"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            emitParams({ label: e.target.value });
          }}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}
      {needsBus && (
        <TextField
          label="bus width"
          value={busWidth}
          onChange={(e) => {
            setBusWidth(e.target.value);
            emitParams({ busWidth: parseInt(e.target.value, 10) || 32 });
          }}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}
      {needsClk && (
        <TextField
          label="clock"
          value={clk}
          onChange={(e) => {
            setClk(e.target.value);
            emitParams({ clk: e.target.value });
          }}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}
      {needsRst && (
        <TextField
          label="reset"
          value={rst}
          onChange={(e) => {
            setRst(e.target.value);
            emitParams({ rst: e.target.value });
          }}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}
      <div className={styles.paramActions}>
        <button type="button" className={styles.paramBtn} onClick={onCancel}>
          cancel
        </button>
      </div>
    </div>
  );
}

export function SnippetsPanel() {
  const [pending, setPending] = React.useState<Snippet | null>(null);
  const [activeSnippet, setActiveSnippet] = React.useState<Snippet | null>(null);
  const [activeParams, setActiveParams] = React.useState<SnippetParams | undefined>(undefined);
  const [scale, setScale] = React.useState(1);

  const handleClick = (snippet: Snippet) => {
    setActiveSnippet(snippet);
    setActiveParams(undefined);
    if (snippet.parametric) {
      setPending(snippet);
      beginBlockPlacement(snippet, undefined, scale);
    } else {
      setPending(null);
      beginBlockPlacement(snippet, undefined, scale);
    }
  };

  const handleScale = (nextScale: number) => {
    setScale(nextScale);
    if (activeSnippet) {
      beginBlockPlacement(activeSnippet, activeParams, nextScale);
    }
  };

  return (
    <div className={styles.panel}>
      <span className={styles.label}>RTL blocks</span>
      <span className={styles.hint}>
        ghost follows cursor · click to place · R rotate · H/V flip · Esc cancels
      </span>
      <span className={styles.scaleGroup} aria-label="block scale">
        <span className={styles.scaleLabel}>scale</span>
        {[1, 2, 3].map((value) => (
          <button
            key={value}
            type="button"
            className={[
              styles.snippetBtn,
              scale === value ? styles.snippetBtnActive : "",
            ].filter(Boolean).join(" ")}
            onClick={() => handleScale(value)}
            title={`Place blocks at ${value}x scale`}
          >
            {value}x
          </button>
        ))}
      </span>
      {pending && (
        <ParamDialog
          snippet={pending}
          onCancel={() => {
            store.placeBlockTool.cancel();
            setPending(null);
            setActiveSnippet(null);
            setActiveParams(undefined);
          }}
          onParamsChange={(params) => {
            setActiveParams(params);
            beginBlockPlacement(pending, params, scale);
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
