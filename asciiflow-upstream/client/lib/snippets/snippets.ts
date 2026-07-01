import {
  asciiDiagram,
  asciiDiagramLines,
  asciiDiagramText,
} from "#asciiflow/client/lib/snippets/snippet_template";
import { store } from "#asciiflow/client/store";

export interface SnippetParams {
  label?: string;
  busWidth?: number;
  clk?: string;
  rst?: string;
}

const TEXT_PARAM_KEYS = new Set<keyof SnippetParams>(["label", "clk", "rst"]);

export interface Snippet {
  label: string;
  title: string;
  text: string | ((p: SnippetParams) => string);
  preview?: string;
  parametric?: boolean;
  defaultParams?: SnippetParams;
}

const DEFAULT_PARAMS: SnippetParams = {
  label: "BLOCK",
  busWidth: 32,
  clk: "CLK",
  rst: "RST_N",
};

function quoteText(value: unknown): string {
  const text = String(value ?? "").trim();
  if (text.length <= 1 || (text.startsWith('"') && text.endsWith('"'))) {
    return text;
  }
  return `"${text.replace(/"/g, '\\"')}"`;
}

function fitLabel(value: unknown, width: number): string {
  return quoteText(value).slice(0, width).padEnd(width);
}

function renderTextParam(
  value: unknown,
  width?: number
): string {
  return width ? fitLabel(value, width) : quoteText(value);
}

function applyBusWidthSubstitutions(
  text: string,
  defaults: SnippetParams,
  merged: SnippetParams
): string {
  const defWidth = defaults.busWidth;
  const newWidth = merged.busWidth;
  if (defWidth === undefined || newWidth === undefined || defWidth === newWidth) {
    return text;
  }
  const defMsb = defWidth - 1;
  const newMsb = newWidth - 1;
  return text
    .replaceAll(`[${defMsb}:0]`, `[${newMsb}:0]`)
    .replaceAll(`[${defWidth}]`, `[${newWidth}]`);
}

/**
 * Parametric diagram authored with default literals in raw +|-|> ASCII.
 * Substitutes params, then converts arrows and box corners (WYSIWYG editing).
 */
function makeParamDiagram(
  source: string,
  defaults: SnippetParams,
  widths: Partial<Record<keyof SnippetParams, number>> = {}
): (p: SnippetParams) => string {
  return (p) => {
    const merged = { ...DEFAULT_PARAMS, ...defaults, ...p };
    let text = source;
    for (const key of TEXT_PARAM_KEYS) {
      const defVal = defaults[key as keyof SnippetParams];
      const val = merged[key as keyof SnippetParams];
      if (defVal === undefined || val === undefined) {
        continue;
      }
      const width = widths[key as keyof SnippetParams];
      const defRendered = renderTextParam(defVal, width);
      const newRendered = renderTextParam(val, width);
      if (defRendered !== newRendered) {
        text = text.replace(defRendered, newRendered);
      }
    }
    text = applyBusWidthSubstitutions(text, defaults, merged);
    return asciiDiagramText(text);
  };
}

/** Substitute {{key}} placeholders in snippet templates. */
export function applySnippetParams(
  text: string,
  params: SnippetParams
): string {
  const merged = { ...DEFAULT_PARAMS, ...params };
  return text.replace(/\{\{(\w+)(?::(\d+))?\}\}/g, (_, key: string, width: string) => {
    const v = merged[key as keyof SnippetParams];
    if (v === undefined) {
      return "";
    }
    if (TEXT_PARAM_KEYS.has(key as keyof SnippetParams)) {
      const quoted = quoteText(v);
      return width ? quoted.slice(0, +width).padEnd(+width) : quoted;
    }
    return String(v);
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
    label: "process",
    title: "Flowchart process",
    text: asciiDiagram`
      +------------+
      | "PROCESS"  |
      +------------+
    `,
  },
  {
    label: "terminator",
    title: "Flowchart start / end terminator",
    text: asciiDiagram`
      .------------.
      |  "START"   |
      '------------'
    `,
  },
  {
    label: "decision",
    title: "Flowchart decision diamond",
    text: asciiDiagram`
          /\
         /  \
        <"OK">
         \  /
          \/
    `,
  },
  {
    label: "io shape",
    title: "Flowchart input / output shape",
    text: asciiDiagram`
        /----------/
       / "DATA"   /
      /----------/
    `,
  },
  {
    label: "database",
    title: "Database / storage cylinder",
    text: asciiDiagram`
        .------.
       / "DB" /|
      +------+ |
      |      | /
      '------'
    `,
  },
  {
    label: "document",
    title: "Document with folded edge",
    text: asciiDiagram`
      +--------.
      | "DOC"  |
      |      .-'
      '------'
    `,
  },
  {
    label: "actor",
    title: "Stick-figure actor",
    text: asciiDiagram`
         o
        /|\
        / \
      "ACTOR"
    `,
  },
  {
    label: "cloud",
    title: "Cloud / external service",
    text: asciiDiagram`
        .--. .--.
      (  "CLOUD" )
       '--' '--'
    `,
  },
  {
    label: "table",
    title: "Table / grid",
    text: asciiDiagram`
      +----+----+
      |"A" |"B" |
      +----+----+
      |"C" |"D" |
      +----+----+
    `,
  },
  {
    label: "swimlane",
    title: "Swimlane frame",
    text: asciiDiagram`
      +----------+----------+
      | "Lane A" | "Lane B" |
      +----------+----------+
      |          |          |
      +----------+----------+
    `,
  },
  {
    label: "sequence",
    title: "Simple sequence exchange",
    text: asciiDiagram`
      "A"          "B"
       |  "hello"  |
       +---------->+
       |           |
       +<----------+
    `,
  },
  {
    label: "state tree",
    title: "State / branch tree",
    text: asciiDiagram`
             ("0")
            /     \
          ("1")   ("2")
          /    \      \
        ("3") ("4")   ("5")
    `,
  },
  {
    label: "plot axes",
    title: "Plot axes / timing sketch",
    text: asciiDiagram`
      "Y" ^
          |
          |    .----.
          |   /
          +----------> "X"
    `,
  },
  {
    label: "box",
    title: "Empty labeled box",
    parametric: true,
    defaultParams: { label: "LABEL" },
    text: makeParamDiagram(
      `
      +------------------+
      | "LABEL"          |
      +------------------+
      `,
      { label: "LABEL" },
      { label: 10 }
    ),
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
    text: makeParamDiagram(
      `---["sig"]--->`,
      { label: "sig" }
    ),
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
      +---------- +     +-----------+      +-----------+
      |           |     |           |      |           |
      | "STAGE 1" |---->| "STAGE 2" |----->| "STAGE 3" |
      |           |     |           |      |           |
      +-----------+     +-----------+      +-----------+
    `,
  },
  {
    label: "reg/FF",
    title: "D flip-flop / register",
    parametric: true,
    defaultParams: { label: "FF", clk: "CLK" },
    text: makeParamDiagram(
      `
               +--------------+
         D --->+ D         Q  +---> Q
               |   "FF"       |
      "CLK" ---+>             |
               +--------------+
      `,
      { label: "FF", clk: "CLK" },
      { label: 8 }
    ),
  },
  {
    label: "mux",
    title: "2-to-1 multiplexer",
    text: asciiDiagram`
             +-----+
       A --->+     |
             |"MUX"+----> Y
       B --->+     |
             +--+--+
                |
              "SEL"
    `,
  },
  {
    label: "adder",
    title: "Full adder block",
    preview: asciiDiagram`
              +------+
        A --->+      +---> "Sum"
        B --->+ "FA" +---> "Cout"
      "Cin" ->+      |
              +------+
    `,
    text: asciiDiagram`
              +-------+
        A ----+       |
        B ----+  "FA" +----> "Sum"
      "Cin" --+       +----> "Cout"
              +-------+
    `,
  },
  {
    label: "SRAM",
    title: "SRAM / memory block",
    parametric: true,
    defaultParams: { busWidth: 32 },
    text: makeParamDiagram(
      `
              +----------+
    "ADDR" -->+          |
              |  "SRAM"  +<--> "DATA[31:0]"
      "WE" -->+          |
      "CE" -->+  "NxM"   |
    "CLK"  -->+          |
              +----------+
      `,
      { busWidth: 32 }
    ),
  },
  {
    label: "bus",
    title: "Bus / bundle annotation",
    parametric: true,
    defaultParams: { busWidth: 32 },
    text: makeParamDiagram(
      `=====[32]=====>`,
      { busWidth: 32 }
    ),
  },
  {
    label: "FIFO",
    title: "FIFO buffer",
    text: asciiDiagram`
      +-------+
      | "IN"  |
      |"FIFO" |
      |       +---> "OUT"
      |"ptr"  |
      +-------+
    `,
  },
  {
    label: "APB",
    title: "APB-lite slave stub",
    parametric: true,
    defaultParams: { clk: "PCLK", busWidth: 32 },
    text: makeParamDiagram(
      `
                +---------------------+
      "PCLK" -->+                     |
                |  "APB"              +---> "PRDATA[31:0]"
                | "Slave"             +<--- "PWDATA[31:0]"
      "PSEL" -->+                     |
                +---------------------+
      `,
      { clk: "PCLK", busWidth: 32 }
    ),
  },
  {
    label: "ICG",
    title: "Clock gate / ICG",
    parametric: true,
    defaultParams: { clk: "CLK_IN" },
    text: makeParamDiagram(
      `
      "CLK_IN" ---+>----+----> "CLK_OUT"
                  |"ICG"|
          "EN" -->|     |
                  +-----+
      `,
      { clk: "CLK_IN" }
    ),
  },
  {
    label: "rst sync",
    title: "Reset synchronizer",
    parametric: true,
    defaultParams: { clk: "clk", rst: "rst_async" },
    text: makeParamDiagram(
      `
  "rst_async"  -->+------+--> "rst_sync"
                  |"sync"|
         "clk" -->|      |
                  +------+
      `,
      { clk: "clk", rst: "rst_async" }
    ),
  },
  {
    label: "CDC",
    title: "Clock-domain crossing boundary",
    text: asciiDiagram`
          "CLK_A"             "CLK_B"
        +---------+  "CDC"   +---------+
        | "blk_A" |=========>| "blk_B" |
        +---------+          +---------+
    `,
  },
  {
    label: "scan",
    title: "Scan mux",
    text: asciiDiagram`
     "func_in" ──►┬─────.
                  │"MUX" )──► "out"
     "scan_in" ──►┴─────'
                     ▲
                     │
                "scan_en"
    `,
  },
  {
    label: "IRQ",
    title: "Interrupt OR tree",
    text: asciiDiagramLines([
      '"src0" -->+\\',
      '"src1" -->+"OR"+--> "IRQ"',
      '"src2" -->+/',
    ]),
  },
  {
    label: "chip shell",
    title: "Generic chip / power-domain subsystem shell",
    text: asciiDiagram`
      +---------------------------- "Chip" -----------------------------+
      |                                                                 |
      |  +-------------------- "Power Domain" -----------------------+  |
      |  |                                                           |  |
      |  | +----------+    +------------+    +------------+          |  |
      |  | | "core ss"+--->| "fabric"   +--->| "io ss"    +----+     |  |
      |  | +----+-----+    +-----+------+    +------+-----+    |     |  |
      |  |      |                |                  |          |     |  |
      |  |      v                v                  v          v     |  |
      |  | +----------+    +------------+    +------------+  "pads"  |  |
      |  | | "memory" |    | "cfg regs" |    | "ip blocks"|          |  |
      |  | +----------+    +------------+    +------------+          |  |
      |  +-----------------------------------------------------------+  |
      +-----------------------------------------------------------------+
    `,
  },
  {
    label: "io cluster",
    title: "Generic IO cluster with fabric, config, interrupt, and pads",
    text: asciiDiagram`
      +------------------------- "IO cluster" ------------------------+
      |                                                               |
      | "cfg bus" -->+-------------+                                 |
      |              | "reg bank"  +---> "ctrl/status"              |
      |              +------+------+                                 |
      |                     |                                        |
      |                     v                                        |
      |              +-------------+     +-------------+  +---------+|
      | "fabric" --->+ "ip block"  +---->| "buffer"    +->| "phy"   ++--> "pins"
      |              +------+------+     +-------------+  +---------+|
      |                     |                                        |
      |                     +---------------------------> "irq"      |
      +---------------------------------------------------------------+
    `,
  },
  {
    label: "clk tree",
    title: "Clock tree with mux, divider, and gated fanout",
    text: asciiDiagram`
      "osc_clk" --->+----------+     +-----------+     +-------------+
                    | "clk mux"+---->| "divider" +---->| "clk gate"  |
      "pll_clk" --->+----------+     +-----------+     +------+------+
                                                                |
                         +--------------------------------------+---+
                         |              |              |            |
                         v              v              v            v
                    "ip0_clk"      "ip1_clk"      "bus_clk"    "test_clk"
    `,
  },
  {
    label: "rst tree",
    title: "Reset sequencer and synchronized domain resets",
    text: asciiDiagram`
      "por_n" ------->+----------------+       +----------------+
      "scan_rst_n" -->| "reset seq"    +------>| "rst sync"     +---> "cpu_rst_n"
      "wdog_rst_n" -->| "reset manager"|       +-------+--------+
                      +-------+--------+               |
                              |                        +----------> "bus_rst_n"
                              |                        |
                              |                        +----------> "io_rst_n"
                              v
                         "warm_rst_n"
    `,
  },
  {
    label: "auth flow",
    title: "Generic image authentication flow",
    text: asciiDiagram`
      +-------------+        +-------------+        +-------------+
      | "image"     +------->| "hash"      +------->| "compare"   |----> "valid"
      +------+------+        +-------------+        +------+------+
             |                                            ^
             v                                            |
      +-------------+        +-------------+        +------+------+
      | "signature" +------->| "decrypt"   +------->| "cert hash" |
      +-------------+        +------+------+        +-------------+
                                  ^
                                  |
                            +-----+------+
                            | "root key" |
                            |   "OTP"    |
                            +------------+
    `,
  },
  {
    label: "pad mux",
    title: "Function / test / pin mux chain",
    text: asciiDiagram`
      +-------------------+       +------------+       +------------+       +--------+
      | "func signals"    +------>| "func mux" +------>| "test mux" +------>| "PAD"  |
      +-------------------+       +-----+------+       +-----+------+       +---+----+
      +-------------------+             ^                    ^                  |
      | "pin logic"       +-------------+                    |                  v
      +-------------------+                                  |                "pin"
      +-------------------+                                  |
      | "test controls"   +----------------------------------+
      +-------------------+
    `,
  },
  {
    label: "mem map",
    title: "Memory map with address ranges",
    text: asciiDiagram`
      "0x0000_0000" +-----------------------------+
                    | "Code / ROM"      "(512MiB)"|
      "0x2000_0000" +-----------------------------+
                    | "SRAM"            "(512MiB)"|
      "0x4000_0000" +-----------------------------+
                    | "Device IO"       "(512MiB)"|
      "0x6000_0000" +-----------------------------+
                    | "Ext. RAM"       "(1024MiB)"|
      "0xA000_0000" +-----------------------------+
                    | "Ext. Device"    "(1024MiB)"|
      "0xE000_0000" +-----------------------------+
                    | "System / PPB"              |
      "0xFFFF_FFFF" +-----------------------------+
    `,
  },
  {
    label: "serial blk",
    title: "Generic config-integrated serial block",
    text: asciiDiagram`
      "clk/rst" ----->+---------------------------- "Serial" ---------------------------+
      "cfg bus" ----->| +-------------+   +----------------+   +----------------+       |
      "rx_i" -------->| | "cfg regs"  |   | "TX/RX path"   |   | "irq/status"   +-------+----> "irq"
                      | +------+------+   +-------+--------+   +----------------+       |
                      |        |                  |                                     |
                      |        v                  v                                     |
                      | "control/status"    "timing/buf" -------------------------------+----> "tx_o"
                      +-----------------------------------------------------------------+
    `,
  },
  {
    label: "data path",
    title: "Streaming input-process-output data path",
    text: asciiDiagram`
                  +-------------+     +-------------+     +-------------+
      "input" --->| "in FIFO"   +---->| "process"   +---->| "out FIFO"  |---> "output"
                  +------+------+     +------+------+     +------+------+
                         |                   |                   |
                         v                   v                   v
                    "valid/ready"       "ctrl regs"          "status"
    `,
  },
  {
    label: "fanout",
    title: "Signal branch / fanout",
    text: asciiDiagram`
                         +-----------> "dst0"
                         |
      "source" ----------+-----------> "dst1"
                         |
                         +-----------> "dst2"
    `,
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
