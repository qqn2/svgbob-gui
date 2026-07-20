# svgbob GUI

[![CI](https://github.com/qqn2/svgbob-gui/actions/workflows/ci.yml/badge.svg)](https://github.com/qqn2/svgbob-gui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A browser-based ASCII diagram editor with a live
[svgbob](https://github.com/ivanceras/svgbob) SVG preview. It combines an
[ASCIIFlow](https://github.com/lewish/asciiflow)-style grid editor with reusable
flowchart and RTL schematic blocks.

The application is client-only. It has no application server, account system,
or cloud database.

## Features

- Draw boxes, lines, arrows, freeform characters, and quoted text on a grid.
- Edit the complete ASCII source in Raw mode with line numbers, selections,
  native clipboard controls, and editor undo/redo.
- Move and resize selections with keyboard-friendly editing controls.
- Place reusable flowchart, logic, clock/reset, memory, and interface blocks.
- Scale blocks to 1x, 2x, or 3x before placement.
- Render the committed ASCII source through `svgbob-wasm` in the browser.
- Export diagrams as TXT, SVG, or PNG.
- Back up and restore all local drawings as JSON.
- Create compact share links for diagrams that are safe to place in a URL.
- Choose light, grey, or dark themes and resize the workspace panes.

## Privacy

Drawings are stored in the current browser's `localStorage`. They are not
uploaded by the application and do not synchronize between browsers or devices.
Clearing site data removes local drawings, so use **Files -> backup all** when a
drawing matters.

Share links encode the diagram in the URL fragment. Fragments are not sent to
the hosting server, but the complete link can remain in browser and clipboard
history and can be read by anyone who receives it.

## Run Locally

Requirements: Node.js 22 and npm.

```bash
git clone https://github.com/qqn2/svgbob-gui.git
cd svgbob-gui
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`.

## Editor Basics

| Action | Control |
| --- | --- |
| Pan | Scroll, Shift+scroll, or middle-button drag |
| Zoom | Ctrl/Cmd+scroll or toolbar zoom controls |
| Undo / redo | Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z |
| Copy / cut / paste | Ctrl/Cmd+C / X / V |
| Cancel active operation | Escape |
| Select all | Ctrl/Cmd+A |
| Erase selection | Delete or Backspace outside Raw mode |

Open **Blocks** to search the reusable block library. Select a scale, choose a
block, and click the canvas to place it. While placing a block, use `R` to
rotate, `H` or `V` to flip, and Escape to cancel.

The preview pane always renders the committed ASCII diagram. Copy or download
the ASCII source for version-controlled documentation, or export SVG/PNG for
documents and presentations.

## Development

```bash
npm run typecheck       # TypeScript checks
npm test                # Vitest suite
npm run security-check  # hostile SVG rendering checks
npm run build           # production build in dist/
npm run check           # all checks above
npm run test:e2e        # production Playwright tests
```

Install the E2E browser runtimes once:

```bash
npx playwright install chromium firefox
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for project structure, block-review
routes, and pull-request expectations.

### Support and feedback

Use the **Report a bug** action in the app's Help panel or open the
[GitHub bug report form](https://github.com/qqn2/svgbob-gui/issues/new?template=bug_report.yml).
Reduce diagrams to generic ASCII before posting; do not attach confidential
schematics or proprietary signal names. Report security vulnerabilities
privately through [GitHub Security Advisories](https://github.com/qqn2/svgbob-gui/security/advisories/new).

### Block review workspace

The app includes a development-only visual QA workspace for checking every
reusable block after editing snippets or scaling logic. Start `npm run dev`,
then open:

- `http://127.0.0.1:5173/#/review/blocks/1/inspect`
- `http://127.0.0.1:5173/#/review/blocks/2/inspect`
- `http://127.0.0.1:5173/#/review/blocks/3/inspect`

Each inspector compares the scaled ASCII source with its svgbob render and
records OK/Not OK notes for CSV export. Remove `/inspect` to place the complete
block library on the normal canvas at that scale. These routes are deliberately
excluded from production builds; see [CONTRIBUTING.md](CONTRIBUTING.md) for the
authoring rules and review checklist.

## Deployment

The repository supports an assets-only Cloudflare Worker:

```bash
npm run build
npm run deploy
```

`wrangler.jsonc` serves `dist/` with single-page application fallback behavior.
The files in `asciiflow-upstream/client/public/` provide production security
headers and static assets.

## Architecture

The Vite application root is `asciiflow-upstream/client/`. The main pieces are:

- `store/` and `layer.ts`: sparse ASCII canvas and undo/redo history.
- `draw/`: box, line, arrow, text, select, erase, and block placement tools.
- `RawEditor.tsx`: lazy-loaded CodeMirror source editor used by Raw mode.
- `lib/snippets/`: reusable block definitions and parameter handling.
- `renderer.ts`: browser-side `svgbob-wasm` rendering.
- `svg_preview.tsx` and `ExportDialog.tsx`: preview and export workflows.
- `drawing_backup.ts` and `svgbob_storage.ts`: local persistence and sharing.

## Attribution

This is an independent community project and is not affiliated with or
endorsed by the svgbob or ASCIIFlow maintainers.

This project includes a modified, vendored copy of
[ASCIIFlow](https://github.com/lewish/asciiflow), originally created by Lewis
Hemens and distributed under the MIT License. SVG rendering is provided by
[svgbob-wasm](https://github.com/agoose77/svgbob-wasm), which wraps svgbob and
whose installed package declares the Apache-2.0 license. The upstream
svgbob-wasm repository also includes an MIT license.

Raw mode is powered by [CodeMirror](https://codemirror.net/), distributed
under the MIT License.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for details.
Deployed builds include the applicable texts under `/licenses/`.

## License

The original code in this repository is available under the [MIT License](LICENSE).
Vendored and third-party components remain subject to their respective licenses.
