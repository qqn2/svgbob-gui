import { render } from "../node_modules/svgbob-wasm/svgbob_wasm.js";

const hostile = '"<script>alert(1)</script>"\n"<img src=x onerror=alert(2)>"';
const svg = render(hostile);

if (svg.includes("<script>") || svg.includes("<img")) {
  throw new Error("svgbob emitted executable markup from diagram text");
}
if (!svg.includes("&lt;script&gt;") || !svg.includes("&lt;img")) {
  throw new Error("svgbob no longer escapes hostile diagram text as expected");
}

console.log("svgbob hostile markup is escaped");
