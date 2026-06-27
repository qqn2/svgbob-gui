import { store } from "#asciiflow/client/store";

export interface SnippetParams {
  label?: string;
  busWidth?: number;
  clk?: string;
  rst?: string;
}

export interface Snippet {
  label: string;
  title: string;
  text: string | ((p: SnippetParams) => string);
  parametric?: boolean;
  defaultParams?: SnippetParams;
}

const DEFAULT_PARAMS: SnippetParams = {
  label: "BLOCK",
  busWidth: 32,
  clk: "CLK",
  rst: "RST_N",
};

/** Substitute {{key}} placeholders in snippet templates. */
export function applySnippetParams(
  text: string,
  params: SnippetParams
): string {
  const merged = { ...DEFAULT_PARAMS, ...params };
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = merged[key as keyof SnippetParams];
    return v !== undefined ? String(v) : "";
  });
}

export function resolveSnippetText(
  snippet: Snippet,
  params?: SnippetParams
): string {
  const p = { ...DEFAULT_PARAMS, ...snippet.defaultParams, ...params };
  if (typeof snippet.text === "function") {
    return snippet.text(p);
  }
  return applySnippetParams(snippet.text, p);
}

/** Plain ASCII — svgbob-friendly patterns for RTL block diagrams. */
export const SNIPPETS: Snippet[] = [
  {
    label: "box",
    title: "Empty labeled box",
    parametric: true,
    defaultParams: { label: "LABEL" },
    text: "+----------+\n| {{label}}  |\n+----------+\n",
  },
  {
    label: "arrow",
    title: "Right arrow",
    text: "---------->",
  },
  {
    label: "arr lbl",
    title: "Labeled right arrow",
    parametric: true,
    defaultParams: { label: "sig" },
    text: "---[{{label}}]-->",
  },
  {
    label: "down",
    title: "Down arrow",
    text: "|\n|\nv\n",
  },
  {
    label: "pipeline",
    title: "3-stage pipeline",
    text: [
      "+----------+     +----------+     +----------+",
      "|          |     |          |     |          |",
      "| STAGE 1  +---->| STAGE 2  +---->| STAGE 3  |",
      "|          |     |          |     |          |",
      "+----------+     +----------+     +----------+",
      "",
    ].join("\n"),
  },
  {
    label: "reg/FF",
    title: "D flip-flop / register",
    parametric: true,
    defaultParams: { label: "FF", clk: "CLK" },
    text: (p) =>
      [
        "+-------+",
        " D -->|D     Q+---> Q",
        `      |  ${p.label}  |`,
        `${p.clk} ->|>      |`,
        "      +-------+",
        "",
      ].join("\n"),
  },
  {
    label: "mux",
    title: "2-to-1 multiplexer",
    text: [
      "       +-----+",
      " A --->|     |",
      "       | MUX +----> Y",
      " B --->|     |",
      "       +--+--+",
      "          |",
      "         SEL",
      "",
    ].join("\n"),
  },
  {
    label: "adder",
    title: "Full adder block",
    text: [
      "         +-------+",
      "  A ---->|       |",
      "  B ---->|  FA   +----> Sum",
      "Cin ---->|       +----> Cout",
      "         +-------+",
      "",
    ].join("\n"),
  },
  {
    label: "SRAM",
    title: "SRAM / memory block",
    parametric: true,
    defaultParams: { busWidth: 32 },
    text: (p) =>
      [
        "        +----------+",
        "ADDR -->|          |",
        `        |   SRAM   |<--> DATA[${(p.busWidth ?? 32) - 1}:0]`,
        "  WE -->|          |",
        "  CE -->|  NxM     |",
        "CLK  -->|          |",
        "        +----------+",
        "",
      ].join("\n"),
  },
  {
    label: "bus",
    title: "Bus / bundle annotation",
    parametric: true,
    defaultParams: { busWidth: 32 },
    text: (p) => `=====[${p.busWidth}]=====>`,
  },
  {
    label: "FIFO",
    title: "FIFO buffer",
    text: [
      "+-------+",
      "|  IN   |",
      "| FIFO  |",
      "|       +---> OUT",
      "| ptr   |",
      "+-------+",
      "",
    ].join("\n"),
  },
  {
    label: "APB",
    title: "APB-lite slave stub",
    parametric: true,
    defaultParams: { clk: "PCLK", busWidth: 32 },
    text: (p) =>
      [
        "    +-----------+",
        `${p.clk}|           |`,
        `    |  APB      |---> PRDATA[${(p.busWidth ?? 32) - 1}:0]`,
        "    |  Slave    |<--- PWDATA[31:0]",
        "PSEL|           |",
        "    +-----------+",
        "",
      ].join("\n"),
  },
  {
    label: "ICG",
    title: "Clock gate / ICG",
    parametric: true,
    defaultParams: { clk: "CLK_IN" },
    text: (p) =>
      [
        `${p.clk} -->|>--+---> CLK_OUT`,
        "          |ICG|",
        "       EN-+---+",
        "",
      ].join("\n"),
  },
  {
    label: "rst sync",
    title: "Reset synchronizer",
    parametric: true,
    defaultParams: { clk: "clk", rst: "rst_async" },
    text: (p) =>
      [
        `${p.rst} -->|>|---> rst_sync`,
        "             |S|",
        `          ${p.clk}+>|`,
        "             +-+",
        "",
      ].join("\n"),
  },
  {
    label: "CDC",
    title: "Clock-domain crossing boundary",
    text: [
      "  CLK_A            CLK_B",
      "  +------+   CDC   +------+",
      "  | blk A+========>| blk B|",
      "  +------+         +------+",
      "",
    ].join("\n"),
  },
  {
    label: "scan",
    title: "Scan mux",
    text: [
      "func_in -->|\\",
      "           | MUX |--> out",
      "scan_in -->|/",
      "      scan_en",
      "",
    ].join("\n"),
  },
  {
    label: "CSR",
    title: "CSR / register block",
    parametric: true,
    defaultParams: { label: "REGS" },
    text: (p) =>
      [
        "        +-----------+",
        "APB -->|  CSR      |",
        `        |  ${p.label}  |--> ctrl_o`,
        "        +-----------+",
        "",
      ].join("\n"),
  },
  {
    label: "IRQ",
    title: "Interrupt OR tree",
    text: [
      "src0 -->|\\",
      "src1 -->| OR |--> IRQ",
      "src2 -->|/",
      "",
    ].join("\n"),
  },
];

/** Enter stamp mode: ghost follows the cursor until click places it (Esc cancels). */
export function beginBlockPlacement(
  snippet: Snippet,
  params?: SnippetParams,
  scale = 1
): void {
  store.placeBlockTool.begin(resolveSnippetText(snippet, params), scale);
}
