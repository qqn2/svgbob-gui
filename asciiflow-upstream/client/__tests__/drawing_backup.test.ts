import { describe, expect, it } from "vitest";
import {
  parseDrawingBackup,
  serializeDrawingBackup,
} from "#asciiflow/client/drawing_backup";

describe("drawing backups", () => {
  it("roundtrips all local drawings", () => {
    const drawings = [
      { name: null, ascii: "+--+" },
      { name: "pipeline", ascii: '"A" --> "B"' },
    ];
    expect(parseDrawingBackup(serializeDrawingBackup(drawings)).drawings)
      .toEqual(drawings);
  });

  it("rejects malformed backups", () => {
    expect(() => parseDrawingBackup('{"version":2,"drawings":[]}'))
      .toThrow("Unsupported");
  });

  it("rejects backups with excessive drawing content", () => {
    expect(() => parseDrawingBackup(JSON.stringify({
      version: 1,
      drawings: [{ name: "huge", ascii: "x".repeat(2_000_001) }],
    }))).toThrow("too large");
  });
});
