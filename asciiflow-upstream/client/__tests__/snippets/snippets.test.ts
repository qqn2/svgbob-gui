import { describe, expect, it } from "vitest";
import {
  SNIPPET_DISPLAY_LABELS,
  SNIPPET_GROUPS,
  previewText,
} from "#asciiflow/client/SnippetsPanel";
import { SNIPPETS, resolveSnippetText } from "#asciiflow/client/lib/snippets/snippets";

function unquotedMultiCharTextTokens(text: string): string[] {
  const tokens: string[] = [];
  for (const line of text.split("\n")) {
    let inQuote = false;
    let outside = "";
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i - 1] !== "\\") {
        inQuote = !inQuote;
        outside += " ";
      } else {
        outside += inQuote ? " " : char;
      }
    }
    for (const match of outside.matchAll(/[A-Za-z_][A-Za-z0-9_[\]:]*/g)) {
      if (match[0].length > 1) {
        tokens.push(match[0]);
      }
    }
  }
  return tokens;
}

function maxLineLength(text: string): number {
  return Math.max(...text.split("\n").map((line) => line.length));
}

describe("snippets", () => {
  it("uses clean box-drawing characters for built-in RTL blocks", () => {
    const textShapeLabels = new Set([
      "arrow",
      "arr lbl",
      "bus",
      "decision",
      "io shape",
      "actor",
      "cloud",
      "state tree",
      "plot axes",
    ]);
    for (const snippet of SNIPPETS) {
      if (textShapeLabels.has(snippet.label)) {
        continue;
      }
      const text = resolveSnippetText(snippet);
      expect(text, snippet.label).toMatch(/[\u250c\u2510\u2514\u2518\u2502\u2500]/);
    }
  });

  it("quotes multi-character text in built-in snippets", () => {
    for (const snippet of SNIPPETS) {
      const text = resolveSnippetText(snippet);
      expect(unquotedMultiCharTextTokens(text), snippet.label).toEqual([]);
    }
  });

  it("exposes generic schematic blocks from the panel", () => {
    const labels = new Set(SNIPPETS.map((snippet) => snippet.label));
    const panelItems = SNIPPET_GROUPS.flatMap((group) => group.items);

    for (const label of panelItems) {
      expect(labels.has(label), label).toBe(true);
    }

    expect(panelItems).toEqual(
      expect.arrayContaining([
        "process",
        "terminator",
        "decision",
        "database",
        "document",
        "cloud",
        "sequence",
        "state tree",
        "chip shell",
        "ctrl core",
        "io cluster",
        "clk tree",
        "rst tree",
        "guard path",
        "auth flow",
        "cert chain",
        "pad mux",
        "mem map",
        "reg access",
        "iface ss",
        "storage ss",
        "serial blk",
      ])
    );
  });

  it("uses clear display names for abbreviated block ids", () => {
    expect(SNIPPET_DISPLAY_LABELS["decision"]).toBe("Decision");
    expect(SNIPPET_DISPLAY_LABELS["database"]).toBe("Database");
    expect(SNIPPET_DISPLAY_LABELS["sequence"]).toBe("Sequence");
    expect(SNIPPET_DISPLAY_LABELS["arr lbl"]).toBe("Labeled arrow");
    expect(SNIPPET_DISPLAY_LABELS["clk tree"]).toBe("Clock tree");
    expect(SNIPPET_DISPLAY_LABELS["rst tree"]).toBe("Reset tree");
    expect(SNIPPET_DISPLAY_LABELS["reg access"]).toBe("Register access");
    expect(SNIPPET_DISPLAY_LABELS["iface ss"]).toBe("Interface subsystem");
    expect(SNIPPET_DISPLAY_LABELS["storage ss"]).toBe("Storage subsystem");
    expect(SNIPPET_DISPLAY_LABELS["serial blk"]).toBe("Serial block");
  });

  it("keeps dense sidebar previews readable without changing placed block text", () => {
    const adder = SNIPPETS.find((snippet) => snippet.label === "adder");
    expect(adder).toBeDefined();

    const preview = previewText(adder!);
    expect(preview).toContain('"FA"');
    expect(preview).toContain('"Sum"');
    expect(preview).toContain('"Cout"');
    expect(preview.split("\n").length).toBeLessThanOrEqual(5);
    expect(maxLineLength(preview)).toBeLessThanOrEqual(32);

    const placedText = resolveSnippetText(adder!);
    expect(placedText).toContain('A ────┤');
    expect(placedText).toContain('"Cin" ──┤');
    expect(placedText).toContain('├────► "Sum"');
  });

  it("does not expose source-specific labels in extracted schematic snippets", () => {
    const sourceSpecificTerms = [
      "scp",
      "peri",
      "dwc",
      "usb",
      "emmc",
      "uart",
      "rotpk",
      "efuse",
      "noc",
      "fw",
      "dbg",
    ];
    const text = SNIPPETS
      .map((snippet) => `${snippet.label}\n${snippet.title}\n${resolveSnippetText(snippet)}`)
      .join("\n")
      .toLowerCase();

    for (const term of sourceSpecificTerms) {
      expect(text, term).not.toContain(term);
    }
  });
});
