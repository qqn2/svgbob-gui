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

/** Substitute {{key}} placeholders in snippet templates. */
export function applySnippetParams(
  text: string,
  params: SnippetParams
): string {
  const merged = { ...DEFAULT_PARAMS, ...params };
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = merged[key as keyof SnippetParams];
    if (v === undefined) {
      return "";
    }
    return TEXT_PARAM_KEYS.has(key as keyof SnippetParams) ? quoteText(v) : String(v);
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
             (0)
            /   \
          (1)   (2)
          / \     \
        (3) (4)   (5)
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
    defaultParams: { label: quoteText("sig") },
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
      |"STAGE 1" +---->|"STAGE 2" +---->|"STAGE 3" |
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
      ${quoteText(p.clk)} -->+>      |
            +-------+
      `,
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
    text: (p) =>
      asciiDiagram`
              +----------+
      "ADDR" -->+          |
              |  "SRAM"  +<--> "DATA[${(p.busWidth ?? 32) - 1}:0]"
        "WE" -->+          |
        "CE" -->+  "NxM"   |
      "CLK"  -->+          |
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
    text: (p) =>
      asciiDiagram`
            +-----------+
      ${quoteText(p.clk)} -->+           |
            |  "APB"    +---> "PRDATA[${(p.busWidth ?? 32) - 1}:0]"
            | "Slave"   +<--- "PWDATA[31:0]"
      "PSEL" -->+           |
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
      ${quoteText(p.clk)} -->+>--+---> "CLK_OUT"
                 |"ICG"|
             "EN"--+---+
      `,
  },
  {
    label: "rst sync",
    title: "Reset synchronizer",
    parametric: true,
    defaultParams: { clk: "clk", rst: "rst_async" },
    text: (p) =>
      asciiDiagram`
      ${quoteText(p.rst)} -->+>|---> "rst_sync"
                   |S|
              ${quoteText(p.clk)}+>|
                   +-+
      `,
  },
  {
    label: "CDC",
    title: "Clock-domain crossing boundary",
    text: asciiDiagram`
        "CLK_A"          "CLK_B"
        +------+  "CDC"  +------+
        |"blk_A"========>+"blk_B"|
        +------+         +------+
    `,
  },
  {
    label: "scan",
    title: "Scan mux",
    text: asciiDiagramLines([
      '"func_in" -->+\\',
      '           |"MUX"+--> "out"',
      '"scan_in" -->+/',
      '     "scan_en"',
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
      "APB" -->+ "CSR"     |
              | ${fitLabel(p.label ?? "REGS", 8)} +--> "ctrl_o"
              +-----------+
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
    label: "guard path",
    title: "Guarded data path with policy checks",
    text: asciiDiagram`
      "master" --->+-------------+     +--------------+     +-------------+
                   | "fabric"    +---->| "guard"      +---->| "target"    |
                   +------+------+     +------+-------+     +-------------+
                          |                   |
                          v                   v
                    "addr/user"        +--------------+
                                       | "policy"     |
      "cfg bus" ---------------------->| "regs"       +----> "error/deny"
                                       +--------------+
    `,
  },
  {
    label: "auth flow",
    title: "Generic image authentication flow",
    text: asciiDiagram`
      +-------------+        +-------------+        +-------------+
      | "image"     +------->| "hash"      +------->| "compare"   |
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
                            | "OTP"      |
                            +------------+
    `,
  },
  {
    label: "cert chain",
    title: "Generic certificate-chain authorization flow",
    text: asciiDiagram`
      +-------------+     +----------------+     +----------------+
      | "cert"      +---->| "subject key"  +---->| "auth check"   |
      +------+------+     +----------------+     +-------+--------+
             |                                           |
             v                                           v
      +-------------+     +----------------+     +----------------+
      | "signature" +---->| "root key"     +---->| "enable"       |
      +-------------+     +----------------+     +----------------+
             ^
             |
      +-------------+
      | "scenario"  |
      +-------------+
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
      +-------------------+                                  |              "pin"
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
                    | "System / PPB"             |
      "0xFFFF_FFFF" +-----------------------------+
    `,
  },
  {
    label: "reg access",
    title: "Config register access and field fanout",
    text: asciiDiagram`
      "cfg bus" --->+--------------+      +--------------+
                    | "addr decode"+----->| "reg bank"   +----> "status_i"
                    +------+-------+      +------+-------+
                           |                     |
                           v                     v
                    +--------------+      +--------------+
                    | "write data" |      | "ctrl fields" +----> "ctrl_o"
                    +--------------+      +--------------+
    `,
  },
  {
    label: "iface ss",
    title: "Generic external-interface subsystem block",
    text: asciiDiagram`
      +--------------------------- "Iface SS" ---------------------------+
      |                                                                 |
      | +------------+  "sideband"  +---------------+     +----------+  |
      | | "cfg regs" +------------->| "controller"  +---->| "fabric" |  |
      | +-----+------+              | "link layer"  |     +----------+  |
      |       |                     +-------+-------+                   |
      |       v                             |                           |
      | +------------+     "phy bus"        v                           |
      | | "phy"      |<----------------+ +-----------+                  |
      | +-----+------+                 | | "RAM"     |                  |
      |       |                        | +-----------+                  |
      |       v                        |                                |
      | "pins"                    "interrupt"                           |
      +-----------------------------------------------------------------+
    `,
  },
  {
    label: "storage ss",
    title: "Generic storage-interface subsystem block",
    text: asciiDiagram`
      +-------------------------- "Storage SS" --------------------------+
      |                                                                 |
      | "data/cmd/clk" ->+------------+ "pad/tune" +------------+       |
      |                  | "phy"      |<---------->| "ctrl"     |       |
      |                  +-----+------+            +-----+------+       |
      |                        ^                         |              |
      |                        |                         v              |
      |                  +-----+------+            +------------+       |
      |                  | "clk div"  |            | "RAM"      |       |
      |                  +------------+            +-----+------+       |
      |                                                   |              |
      |                                                   v              |
      |                                             +------------+       |
      |                                             | "fabric"   |       |
      |                                             +------------+       |
      +-----------------------------------------------------------------+
    `,
  },
  {
    label: "serial blk",
    title: "Generic config-integrated serial block",
    text: asciiDiagram`
      "clk/rst" ----->+---------------------------- "Serial" ---------------------------+
      "cfg bus" ----->| +-------------+   +----------------+   +----------------+       |
      "rx_i" -------->| | "cfg regs"  |   | "TX/RX path"   |   | "irq/status"   +------> "irq"
                      | +------+------+   +-------+--------+   +----------------+       |
                      |        |                  |                                     |
                      |        v                  v                                     |
                      | "control/status"    "timing/buf" -----------------------------> "tx_o"
                      +-----------------------------------------------------------------+
    `,
  },
  {
    label: "ctrl core",
    title: "Generic controller core island",
    text: asciiDiagram`
      +------------------------- "Control Core" -------------------------+
      |                                                                 |
      | +----------+    +----------+    +----------+    +-------------+ |
      | | "CPU"    +--->| "bus mtx"+--->| "fabric" +--->| "io block"  | |
      | +----+-----+    +----+-----+    +----+-----+    +------+------+ |
      |      |               |               |                 |        |
      |      v               v               v                 v        |
      | +----------+    +----------+    +----------+      +----------+  |
      | | "ROM"    |    | "RAM"    |    | "DMA"    |      | "serial" | |
      | +----------+    +----------+    +----------+      +----------+  |
      +-----------------------------------------------------------------+
    `,
  },
  {
    label: "data path",
    title: "Streaming input-process-output data path",
    text: asciiDiagram`
      "input" --->+-------------+     +-------------+     +-------------+---> "output"
                  | "in FIFO"   +---->| "process"   +---->| "out FIFO"  |
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
