import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const publicDir = resolve(root, "asciiflow-upstream/client/public");
const licensesDir = resolve(publicDir, "licenses");

function bytes(path: string) {
  return readFileSync(resolve(root, path));
}

describe("production license assets", () => {
  it.each([
    ["LICENSE", "PROJECT-MIT.txt"],
    ["asciiflow-upstream/LICENSE", "ASCIIFlow-MIT.txt"],
    [
      "node_modules/svgbob-wasm/LICENSE_APACHE",
      "svgbob-and-svgbob-wasm-APACHE-2.0.txt",
    ],
    ["node_modules/svgbob-wasm/LICENSE_MIT", "svgbob-wasm-MIT.txt"],
    ["node_modules/codemirror/LICENSE", "CodeMirror-MIT.txt"],
  ])("ships an exact copy of %s", (source, publicName) => {
    expect(readFileSync(resolve(licensesDir, publicName))).toEqual(bytes(source));
  });

  it("ships the independent-project disclaimer", () => {
    const notices = readFileSync(
      resolve(licensesDir, "THIRD-PARTY-NOTICES.txt"),
      "utf8",
    );

    const normalized = notices.replace(/\s+/g, " ");
    expect(normalized).toContain("independent community project");
    expect(normalized).toContain("not affiliated with or endorsed by");
  });

  it.each(["logo_full.svg", "logo_min.svg"])(
    "does not publish unused ASCIIFlow branding: %s",
    (name) => {
      expect(existsSync(resolve(publicDir, name))).toBe(false);
    },
  );
});
