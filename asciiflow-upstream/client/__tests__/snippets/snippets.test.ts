import { describe, expect, it } from "vitest";
import { SNIPPETS, resolveSnippetText } from "#asciiflow/client/lib/snippets/snippets";

describe("snippets", () => {
  it("uses clean box-drawing characters for built-in RTL blocks", () => {
    const snippetsToCheck = [
      "box",
      "pipeline",
      "reg/FF",
      "mux",
      "adder",
      "SRAM",
      "FIFO",
      "APB",
      "ICG",
      "rst sync",
      "CDC",
      "scan",
      "CSR",
      "IRQ",
    ];

    for (const label of snippetsToCheck) {
      const snippet = SNIPPETS.find((candidate) => candidate.label === label);
      expect(snippet, label).toBeTruthy();
      const text = resolveSnippetText(snippet!);
      expect(text, label).toMatch(/[┌┐└┘│─]/);
    }
  });
});
