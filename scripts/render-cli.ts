import { readFileSync, writeFileSync } from "node:fs";
import {
  initRenderer,
  renderSync,
} from "#asciiflow/client/renderer";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error("Usage: vite-node scripts/render-cli.ts <input.txt> <output.svg>");
  process.exit(1);
}

const ascii = readFileSync(inputPath, "utf8");
await initRenderer();
const svg = renderSync(ascii);
writeFileSync(outputPath, svg, "utf8");
console.log(`Wrote ${outputPath}`);
