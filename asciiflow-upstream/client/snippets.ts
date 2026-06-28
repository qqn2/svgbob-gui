import { UNICODE } from "#asciiflow/client/constants";
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

const H = UNICODE.lineHorizontal;
const V = UNICODE.lineVertical;
const TL = UNICODE.cornerTopLeft;
const TR = UNICODE.cornerTopRight;
const BR = UNICODE.cornerBottomRight;
const BL = UNICODE.cornerBottomLeft;
const JR = UNICODE.junctionRight;
const JL = UNICODE.junctionLeft;
const JD = UNICODE.junctionDown;
const AR = UNICODE.arrowRight;
const AD = UNICODE.arrowDown;

function h(width: number): string {
  return H.repeat(width);
}

function top(width: number): string {
  return `${TL}${h(width)}${TR}`;
}

function bottom(width: number): string {
  return `${BL}${h(width)}${BR}`;
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

/** Plain ASCII — svgbob-friendly patterns for RTL block diagrams. */
export const SNIPPETS: Snippet[] = [
  {
    label: "box",
    title: "Empty labeled box",
    parametric: true,
    defaultParams: { label: "LABEL" },
    text: `${top(10)}\n${V} {{label}}  ${V}\n${bottom(10)}\n`,
  },
  {
    label: "arrow",
    title: "Right arrow",
    text: `${h(10)}${AR}`,
  },
  {
    label: "arr lbl",
    title: "Labeled right arrow",
    parametric: true,
    defaultParams: { label: "sig" },
    text: `${h(3)}[{{label}}]${h(2)}${AR}`,
  },
  {
    label: "down",
    title: "Down arrow",
    text: `${V}\n${V}\n${AD}\n`,
  },
  {
    label: "pipeline",
    title: "3-stage pipeline",
    text: [
      `${top(10)}     ${top(10)}     ${top(10)}`,
      `${V}          ${V}     ${V}          ${V}     ${V}          ${V}`,
      `${V} STAGE 1  ${JR}${h(4)}${AR}${V} STAGE 2  ${JR}${h(4)}${AR}${V} STAGE 3  ${V}`,
      `${V}          ${V}     ${V}          ${V}     ${V}          ${V}`,
      `${bottom(10)}     ${bottom(10)}     ${bottom(10)}`,
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
        `      ${top(7)}`,
        `D ${h(3)}${AR}${JL}D   Q  ${JR}${h(3)}${AR} Q`,
        `      ${V} ${fitLabel(p.label ?? "FF", 5)} ${V}`,
        `${p.clk} ${H}${AR}${JL}>      ${V}`,
        `      ${bottom(7)}`,
        "",
      ].join("\n"),
  },
  {
    label: "mux",
    title: "2-to-1 multiplexer",
    text: [
      `       ${top(5)}`,
      ` A ${h(3)}${AR}${JL}     ${V}`,
      `       ${V} MUX ${JR}${h(4)}${AR} Y`,
      ` B ${h(3)}${AR}${JL}     ${V}`,
      `       ${BL}${h(2)}${JD}${h(2)}${BR}`,
      `          ${V}`,
      "         SEL",
      "",
    ].join("\n"),
  },
  {
    label: "adder",
    title: "Full adder block",
    text: [
      `         ${top(7)}`,
      `  A ${h(4)}${AR}${JL}       ${V}`,
      `  B ${h(4)}${AR}${JL}  FA   ${JR}${h(4)}${AR} Sum`,
      `Cin ${h(4)}${AR}${JL}       ${JR}${h(4)}${AR} Cout`,
      `         ${bottom(7)}`,
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
        `        ${top(10)}`,
        `ADDR ${h(2)}${AR}${JL}          ${V}`,
        `        ${V}   SRAM   ${JR}<${h(2)}${AR} DATA[${(p.busWidth ?? 32) - 1}:0]`,
        `  WE ${h(2)}${AR}${JL}          ${V}`,
        `  CE ${h(2)}${AR}${JL}  NxM     ${V}`,
        `CLK  ${h(2)}${AR}${JL}          ${V}`,
        `        ${bottom(10)}`,
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
      `${top(7)}`,
      `${V}  IN   ${V}`,
      `${V} FIFO  ${V}`,
      `${V}       ${JR}${h(3)}${AR} OUT`,
      `${V} ptr   ${V}`,
      `${bottom(7)}`,
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
        `    ${top(11)}`,
        `${p.clk}${JL}           ${V}`,
        `    ${V}  APB      ${JR}${h(3)}${AR} PRDATA[${(p.busWidth ?? 32) - 1}:0]`,
        `    ${V}  Slave    ${JR}<${h(3)} PWDATA[31:0]`,
        `PSEL${JL}           ${V}`,
        `    ${bottom(11)}`,
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
        `${p.clk} ${h(2)}${AR}${JL}>${h(2)}${JD}${h(3)}${AR} CLK_OUT`,
        `          ${V}ICG${V}`,
        `       EN${H}${BL}${h(3)}${BR}`,
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
        `${p.rst} ${h(2)}${AR}${JL}>${V}${h(3)}${AR} rst_sync`,
        `             ${V}S${V}`,
        `          ${p.clk}${BL}>${V}`,
        `             ${bottom(1)}`,
        "",
      ].join("\n"),
  },
  {
    label: "CDC",
    title: "Clock-domain crossing boundary",
    text: [
      "  CLK_A            CLK_B",
      `  ${top(6)}   CDC   ${top(6)}`,
      `  ${V} blk_A${JR}========${AR}${JL} blk_B${V}`,
      `  ${bottom(6)}         ${bottom(6)}`,
      "",
    ].join("\n"),
  },
  {
    label: "scan",
    title: "Scan mux",
    text: [
      `func_in ${h(2)}${AR}${JL}\\`,
      `           ${V} MUX ${JR}${h(2)}${AR} out`,
      `scan_in ${h(2)}${AR}${JL}/`,
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
        `        ${top(11)}`,
        `APB ${h(3)}${AR}${JL}  CSR      ${V}`,
        `        ${V}  ${fitLabel(p.label ?? "REGS", 7)}  ${JR}${h(2)}${AR} ctrl_o`,
        `        ${bottom(11)}`,
        "",
      ].join("\n"),
  },
  {
    label: "IRQ",
    title: "Interrupt OR tree",
    text: [
      `src0 ${h(2)}${AR}${JL}\\`,
      `src1 ${h(2)}${AR}${JL} OR ${JR}${h(2)}${AR} IRQ`,
      `src2 ${h(2)}${AR}${JL}/`,
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
