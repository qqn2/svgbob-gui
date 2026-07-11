import { describe, expect, it } from "vitest";
import {
  SNIPPET_DISPLAY_LABELS,
  SNIPPET_GROUPS,
  previewText,
} from "#asciiflow/client/SnippetsPanel";
import {
  buildBlockReviewItems,
  blockReviewDrawingName,
  buildBlockReviewLayer,
} from "#asciiflow/client/block_review";
import { SNIPPETS, resolveSnippetText } from "#asciiflow/client/lib/snippets/snippets";
import { layerToText } from "#asciiflow/client/text_utils";

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
      "binary tree",
      "plot axes",
      "and gate",
      "nand gate",
      "or gate",
      "xor gate",
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
        "binary tree",
        "railroad",
        "chip shell",
        "generic block",
        "network topo",
        "uml inherit",
        "logic cone",
        "and gate",
        "nand gate",
        "or gate",
        "xor gate",
        "radial fanout",
        "clk tree",
        "rst tree",
        "auth flow",
        "pad mux",
        "mem map",
        "serial blk",
      ])
    );
  });

  it("uses clear display names for abbreviated block ids", () => {
    expect(SNIPPET_DISPLAY_LABELS["decision"]).toBe("Decision");
    expect(SNIPPET_DISPLAY_LABELS["database"]).toBe("Database");
    expect(SNIPPET_DISPLAY_LABELS["sequence"]).toBe("Sequence");
    expect(SNIPPET_DISPLAY_LABELS["binary tree"]).toBe("Binary tree");
    expect(SNIPPET_DISPLAY_LABELS["railroad"]).toBe("Railroad");
    expect(SNIPPET_DISPLAY_LABELS["arr lbl"]).toBe("Labeled arrow");
    expect(SNIPPET_DISPLAY_LABELS["radial fanout"]).toBe("Radial fanout");
    expect(SNIPPET_DISPLAY_LABELS["logic cone"]).toBe("Logic cone");
    expect(SNIPPET_DISPLAY_LABELS["and gate"]).toBe("AND gate");
    expect(SNIPPET_DISPLAY_LABELS["nand gate"]).toBe("NAND gate");
    expect(SNIPPET_DISPLAY_LABELS["or gate"]).toBe("OR gate");
    expect(SNIPPET_DISPLAY_LABELS["xor gate"]).toBe("XOR gate");
    expect(SNIPPET_DISPLAY_LABELS["network topo"]).toBe("Network topology");
    expect(SNIPPET_DISPLAY_LABELS["uml inherit"]).toBe("UML inheritance");
    expect(SNIPPET_DISPLAY_LABELS["clk tree"]).toBe("Clock tree");
    expect(SNIPPET_DISPLAY_LABELS["rst tree"]).toBe("Reset tree");
    expect(SNIPPET_DISPLAY_LABELS["reg access"]).toBe("Register access");
    expect(SNIPPET_DISPLAY_LABELS["iface ss"]).toBe("Interface subsystem");
    expect(SNIPPET_DISPLAY_LABELS["storage ss"]).toBe("Storage subsystem");
    expect(SNIPPET_DISPLAY_LABELS["serial blk"]).toBe("Serial block");
  });

  it("resolves parametric snippets from default literals in raw ASCII", () => {
    const regFf = SNIPPETS.find((snippet) => snippet.label === "reg/FF");
    expect(regFf).toBeDefined();

    const defaultText = resolveSnippetText(regFf!);
    expect(defaultText).toMatch(/[\u250c\u2510\u2514\u2518\u2502\u2500]/);
    expect(defaultText).toContain('"FF"');
    expect(defaultText).toContain('"CLK"');

    const customText = resolveSnippetText(regFf!, { label: "REG", clk: "PCLK" });
    expect(customText).toContain('"REG"');
    expect(customText).toContain('"PCLK"');
    expect(customText).not.toContain('"FF"');
    expect(customText).not.toContain('"CLK"');

    const sram = SNIPPETS.find((snippet) => snippet.label === "SRAM");
    expect(resolveSnippetText(sram!, { busWidth: 64 })).toContain("[63:0]");

    const bus = SNIPPETS.find((snippet) => snippet.label === "bus");
    expect(resolveSnippetText(bus!, { busWidth: 64 })).toContain("[64]");
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

  it("builds a hidden review sheet for every snippet at the requested scale", () => {
    const text = layerToText(buildBlockReviewLayer(3));

    expect(blockReviewDrawingName(3)).toBe("block-review-3x");
    expect(text).toContain('"process - Flowchart process (3x)"');
    expect(text).toContain(
      '"generic block - Generic IO cluster with fabric, config, interrupt, and pads (3x)"'
    );
    for (const snippet of SNIPPETS) {
      expect(text, snippet.label).toContain(`"${snippet.label} - ${snippet.title} (3x)"`);
    }
  });

  it("builds per-snippet review items for inspector routes", () => {
    const items = buildBlockReviewItems(2);
    const process = items.find((item) => item.snippet.label === "process");
    const decision = items.find((item) => item.snippet.label === "decision");

    expect(items).toHaveLength(SNIPPETS.length);
    expect(process?.heading).toBe("process - Flowchart process (2x)");
    expect(process?.scaledAscii).toContain('"PROCESS"');
    expect(process?.scaledAscii.split("\n").length).toBeGreaterThan(1);
    expect(decision?.scaledAscii).toContain('"one"');
    expect(decision?.scaledAscii).toContain("/");
    expect(decision?.scaledAscii).toContain("\\");
  });
});
