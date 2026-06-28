import {
  asciiDiagram,
  asciiDiagramLines,
} from "#asciiflow/client/lib/snippets/snippet_template";
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

function fitLabel(value: unknown, width: number): string {
  return String(value ?? "").slice(0, width).padEnd(width);
}

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

/** Readable ASCII sources. The helper converts +---+, |, -->, and v to clean drawing symbols. */
export const SNIPPETS: Snippet[] = [
  {
    label: "box",
    title: "Empty labeled box",
    parametric: true,
    defaultParams: { label: "LABEL" },
    text: asciiDiagram`
      +----------+
      |{{label}} |
      +----------+
    `,
  },
  {
    label: "arrow",
    title: "Right arrow",
    text: asciiDiagram`---------->`,
  },
  {
    label: "arr lbl",
    title: "Labeled right arrow",
    parametric: true,
    defaultParams: { label: "sig" },
    text: asciiDiagram`---[{{label}}]-->`,
  },
  {
    label: "down",
    title: "Down arrow",
    text: asciiDiagram`
      |
      |
      v
    `,
  },
  {
    label: "pipeline",
    title: "3-stage pipeline",
    text: asciiDiagram`
      +----------+     +----------+     +----------+
      |          |     |          |     |          |
      | STAGE 1  +---->| STAGE 2  +---->| STAGE 3  |
      |          |     |          |     |          |
      +----------+     +----------+     +----------+
    `,
  },
  {
    label: "reg/FF",
    title: "D flip-flop / register",
    parametric: true,
    defaultParams: { label: "FF", clk: "CLK" },
    text: (p) =>
      asciiDiagram`
            +-------+
      D --->+D   Q  +---> Q
            | ${fitLabel(p.label ?? "FF", 5)} |
      ${p.clk} ->+>      |
            +-------+
      `,
  },
  {
    label: "mux",
    title: "2-to-1 multiplexer",
    text: asciiDiagram`
             +-----+
       A --->+     |
             | MUX +----> Y
       B --->+     |
             +--+--+
                |
               SEL
    `,
  },
  {
    label: "adder",
    title: "Full adder block",
    text: asciiDiagram`
              +-------+
        A ----+       |
        B ----+  FA   +----> Sum
      Cin ----+       +----> Cout
              +-------+
    `,
  },
  {
    label: "SRAM",
    title: "SRAM / memory block",
    parametric: true,
    defaultParams: { busWidth: 32 },
    text: (p) =>
      asciiDiagram`
              +----------+
      ADDR -->+          |
              |   SRAM   +<--> DATA[${(p.busWidth ?? 32) - 1}:0]
        WE -->+          |
        CE -->+  NxM     |
      CLK  -->+          |
              +----------+
      `,
  },
  {
    label: "bus",
    title: "Bus / bundle annotation",
    parametric: true,
    defaultParams: { busWidth: 32 },
    text: (p) => asciiDiagram`=====[${p.busWidth}]=====>`,
  },
  {
    label: "FIFO",
    title: "FIFO buffer",
    text: asciiDiagram`
      +-------+
      |  IN   |
      | FIFO  |
      |       +---> OUT
      | ptr   |
      +-------+
    `,
  },
  {
    label: "APB",
    title: "APB-lite slave stub",
    parametric: true,
    defaultParams: { clk: "PCLK", busWidth: 32 },
    text: (p) =>
      asciiDiagram`
            +-----------+
      ${p.clk} -->+           |
            |  APB      +---> PRDATA[${(p.busWidth ?? 32) - 1}:0]
            |  Slave    +<--- PWDATA[31:0]
      PSEL -->+           |
            +-----------+
      `,
  },
  {
    label: "ICG",
    title: "Clock gate / ICG",
    parametric: true,
    defaultParams: { clk: "CLK_IN" },
    text: (p) =>
      asciiDiagram`
      ${p.clk} -->+>--+---> CLK_OUT
                 |ICG|
             EN--+---+
      `,
  },
  {
    label: "rst sync",
    title: "Reset synchronizer",
    parametric: true,
    defaultParams: { clk: "clk", rst: "rst_async" },
    text: (p) =>
      asciiDiagram`
      ${p.rst} -->+>|---> rst_sync
                   |S|
              ${p.clk}+>|
                   +-+
      `,
  },
  {
    label: "CDC",
    title: "Clock-domain crossing boundary",
    text: asciiDiagram`
        CLK_A            CLK_B
        +------+   CDC   +------+
        | blk_A+========>+ blk_B|
        +------+         +------+
    `,
  },
  {
    label: "scan",
    title: "Scan mux",
    text: asciiDiagramLines([
      "func_in -->+\\",
      "           | MUX +--> out",
      "scan_in -->+/",
      "      scan_en",
    ]),
  },
  {
    label: "CSR",
    title: "CSR / register block",
    parametric: true,
    defaultParams: { label: "REGS" },
    text: (p) =>
      asciiDiagram`
              +-----------+
      APB --->+  CSR      |
              |  ${fitLabel(p.label ?? "REGS", 7)}  +--> ctrl_o
              +-----------+
      `,
  },
  {
    label: "IRQ",
    title: "Interrupt OR tree",
    text: asciiDiagramLines([
      "src0 -->+\\",
      "src1 -->+ OR +--> IRQ",
      "src2 -->+/",
    ]),
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
