import {
  SNIPPETS,
  Snippet,
  SnippetParams,
  beginBlockPlacement,
  resolveSnippetText,
} from "#asciiflow/client/lib/snippets/snippets";
import { store } from "#asciiflow/client/store";
import styles from "#asciiflow/client/lib/snippets/snippets.module.css";
import { TextField } from "#asciiflow/client/ui/components";
import * as React from "react";

export const SNIPPET_GROUPS = [
  { label: "General", items: ["process", "terminator", "decision", "io shape", "database", "document", "actor", "cloud", "table"] },
  { label: "Flowchart", items: ["swimlane", "sequence", "state tree", "binary tree", "railroad", "plot axes", "arrow", "arr lbl", "down", "radial fanout"] },
  { label: "RTL Basics", items: ["box", "pipeline", "bus", "fanout", "logic cone"] },
  { label: "Logic", items: ["reg/FF", "mux", "adder", "logic", "ICG", "rst sync"] },
  { label: "System", items: ["chip shell", "generic block", "network topo", "uml inherit", "data path", "fanout"] },
  { label: "Clock / Reset", items: ["clk tree", "rst tree", "CDC", "scan"] },
  { label: "Memory / Registers", items: ["SRAM", "mem map"] },
  { label: "Security", items: ["auth flow"] },
  { label: "Interfaces", items: ["bus", "APB", "IRQ", "pad mux", "serial blk"] },
];

export const SNIPPET_DISPLAY_LABELS: Record<string, string> = {
  process: "Process",
  terminator: "Start / End",
  decision: "Decision",
  "io shape": "Input / Output",
  database: "Database",
  document: "Document",
  actor: "Actor",
  cloud: "Cloud",
  table: "Table",
  swimlane: "Swimlane",
  sequence: "Sequence",
  "state tree": "State tree",
  "binary tree": "Binary tree",
  railroad: "Railroad",
  "plot axes": "Plot axes",
  "radial fanout": "Radial fanout",
  box: "Box",
  arrow: "Arrow",
  "arr lbl": "Labeled arrow",
  down: "Down arrow",
  pipeline: "Pipeline",
  "reg/FF": "Register / FF",
  mux: "Mux",
  adder: "Adder",
  "logic cone": "Logic cone",
  logic: "Logic gate",
  ICG: "Clock gate",
  "rst sync": "Reset sync",
  "chip shell": "Chip shell",
  "generic block": "Generic block",
  "network topo": "Network topology",
  "uml inherit": "UML inheritance",
  "data path": "Data path",
  fanout: "Fanout",
  "clk tree": "Clock tree",
  "rst tree": "Reset tree",
  CDC: "CDC boundary",
  scan: "Scan mux",
  SRAM: "SRAM",
  CSR: "CSR block",
  "mem map": "Memory map",
  "reg access": "Register access",
  "guard path": "Guard path",
  "auth flow": "Auth flow",
  "cert chain": "Certificate chain",
  bus: "Bus",
  APB: "APB slave",
  IRQ: "IRQ tree",
  "pad mux": "Pad mux",
  "iface ss": "Interface subsystem",
  "storage ss": "Storage subsystem",
  "serial blk": "Serial block",
};

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

function displayName(snippet: Snippet): string {
  return SNIPPET_DISPLAY_LABELS[snippet.label] ?? snippet.label;
}

function normalizedPreviewLines(source: string): string[] {
  const lines = source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""));
  while (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  const nonEmptyLines = lines.filter((line) => line.trim() !== "");
  const commonIndent = nonEmptyLines.length
    ? Math.min(...nonEmptyLines.map((line) => line.match(/^\s*/)?.[0].length ?? 0))
    : 0;
  return lines.map((line) => line.slice(commonIndent));
}

export function previewText(snippet: Snippet): string {
  const normalizedLines = normalizedPreviewLines(
    snippet.preview ?? resolveSnippetText(snippet)
  );
  const maxPreviewLines = 10;
  return normalizedLines.slice(0, maxPreviewLines).join("\n");
  const source = (snippet.preview ?? resolveSnippetText(snippet))
    .replace(/\r\n?/g, "\n")
    .trim();
  const lines = source.split("\n");
  const maxLines = 10;
  return lines.slice(0, maxLines).join("\n");
/*
  return lines
    .slice(0, maxLines)
    .map((line) => (line.length > maxColumns ? `${line.slice(0, maxColumns - 1)}…` : line))
    .join("\n");
*/
}

function previewTextClassName(preview: string): string {
  const lines = preview.split("\n");
  const maxColumns = Math.max(...lines.map((line) => line.length));
  if (lines.length > 8 || maxColumns > 46) {
    return styles.snippetPreviewTextDense;
  }
  if (lines.length > 6 || maxColumns > 34) {
    return styles.snippetPreviewTextCompact;
  }
  return "";
}

function snippetMatches(snippet: Snippet, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return `${displayName(snippet)} ${snippet.title} ${snippet.label}`
    .toLowerCase()
    .includes(needle);
}

export function SnippetsPanel() {
  const [pending, setPending] = React.useState<Snippet | null>(null);
  const [activeSnippet, setActiveSnippet] = React.useState<Snippet | null>(null);
  const [activeParams, setActiveParams] = React.useState<SnippetParams | undefined>(undefined);
  const [scale, setScale] = React.useState(1);
  const [query, setQuery] = React.useState("");

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

  const snippetsByLabel = new Map(SNIPPETS.map((snippet) => [snippet.label, snippet]));
  const visibleGroups = SNIPPET_GROUPS.map((group) => ({
    ...group,
    snippets: group.items
      .map((label) => snippetsByLabel.get(label))
      .filter((snippet): snippet is Snippet => Boolean(snippet))
      .filter((snippet) => snippetMatches(snippet, query)),
  })).filter((group) => group.snippets.length > 0);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.titleBlock}>
          <span className={styles.label}>Blocks</span>
          <span className={styles.hint}>Preview and place reusable schematic shapes</span>
        </div>
        <input
          className={styles.searchInput}
          value={query}
          placeholder="Search blocks"
          aria-label="Search blocks"
          spellCheck={false}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.stopPropagation()}
          onKeyPress={(event) => event.stopPropagation()}
        />
        <div className={styles.scaleGroup} aria-label="block scale">
          <span className={styles.scaleLabel}>Scale</span>
          {[1, 2, 3].map((value) => (
            <button
              key={value}
              type="button"
              className={[
                styles.scaleBtn,
                scale === value ? styles.scaleBtnActive : "",
              ].filter(Boolean).join(" ")}
              onClick={() => handleScale(value)}
              title={`Place blocks at ${value}x scale`}
            >
              {value}x
            </button>
          ))}
        </div>
      </div>
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
      <div className={styles.snippetGroups}>
        {visibleGroups.map((group) => (
          <div className={styles.snippetGroup} key={group.label}>
            <span className={styles.groupLabel}>{group.label}</span>
            <div className={styles.snippetGrid}>
              {group.snippets.map((snippet) => {
                const active = activeSnippet?.label === snippet.label;
                const preview = previewText(snippet);
                return (
                  <button
                    key={snippet.label}
                    type="button"
                    className={[
                      styles.snippetCard,
                      active ? styles.snippetCardActive : "",
                    ].filter(Boolean).join(" ")}
                    title={snippet.title}
                    onClick={() => handleClick(snippet)}
                  >
                    <div className={styles.snippetPreview} aria-hidden="true">
                      <pre
                        className={[
                          styles.snippetPreviewText,
                          previewTextClassName(preview),
                        ].filter(Boolean).join(" ")}
                      >
                        {preview}
                      </pre>
                    </div>
                    <span className={styles.snippetName}>{displayName(snippet)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
