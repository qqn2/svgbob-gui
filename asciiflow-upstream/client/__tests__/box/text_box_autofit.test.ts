import { describe, expect, it } from "vitest";
import { buildAutoFitTextPatch } from "#asciiflow/client/lib/box/text_box_autofit";
import { Layer } from "#asciiflow/client/layer";
import { textToLayer, layerToText } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

describe("text_box_autofit", () => {
  it("quotes text and expands the containing box to fit it", () => {
    const committed = textToLayer(
      ["+---+", "|   |", "+---+"].join("\n"),
      new Vector(0, 0)
    );
    const text = textToLayer("usb_ss traffic", new Vector(1, 1));
    const patch = buildAutoFitTextPatch(committed, text)!;
    const [next] = committed.apply(patch);

    expect(layerToText(next)).toBe(
      ['+----------------+', '|"usb_ss traffic"|', '+----------------+'].join("\n")
    );
  });

  it("does not add quotes to text outside boxes", () => {
    const committed = new Layer();
    const text = textToLayer("plain label", new Vector(3, 2));
    const patch = buildAutoFitTextPatch(committed, text)!;
    const [next] = committed.apply(patch);

    expect(layerToText(next)).toBe("plain label");
  });

  it("can quote text outside boxes when quote mode is all", () => {
    const committed = new Layer();
    const text = textToLayer("plain label", new Vector(3, 2));
    const patch = buildAutoFitTextPatch(committed, text, "all")!;
    const [next] = committed.apply(patch);

    expect(layerToText(next)).toBe('"plain label"');
  });

  it("can keep text inside boxes raw when quote mode is none", () => {
    const committed = textToLayer(
      ["+----+", "|    |", "+----+"].join("\n"),
      new Vector(0, 0)
    );
    const text = textToLayer("abcde", new Vector(1, 1));
    const patch = buildAutoFitTextPatch(committed, text, "none")!;
    const [next] = committed.apply(patch);

    expect(layerToText(next)).toBe(
      ["+-----+", "|abcde|", "+-----+"].join("\n")
    );
  });

  it("keeps already quoted text quoted once", () => {
    const committed = textToLayer(
      ["+-----+", "|     |", "+-----+"].join("\n"),
      new Vector(0, 0)
    );
    const text = textToLayer('"AXI"', new Vector(1, 1));
    const patch = buildAutoFitTextPatch(committed, text)!;
    const [next] = committed.apply(patch);

    expect(layerToText(next)).toBe(
      ['+-----+', '|"AXI"|', '+-----+'].join("\n")
    );
  });
});
