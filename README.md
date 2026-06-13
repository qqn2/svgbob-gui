# svgbob GUI Editor

Browser-based **ASCII block-diagram editor** with a **live svgbob SVG preview**. Draw RTL-style figures on a grid (AsciiFlow canvas), see the rendered vector output update as you edit. **Client-only** — no server or database.

Use it for pipeline sketches, mux/adder/register blocks, bus annotations, and any diagram you want as **plain ASCII in the repo** plus **SVG for docs and slides**.

## Solo desk scope

Built for **one engineer at a desk**: sketch a block diagram, copy ASCII into RTL comments or eng docs, export SVG for Confluence or PDF. Version control and sharing are handled by **Git** (or a share link for small diagrams), not by this app.

| In scope | Out of scope |
|----------|----------------|
| AsciiFlow-style canvas editing (box, line, arrow, select, text) | Backend, API, auth, cloud sync |
| Live svgbob WASM preview (offline, no network) | Full AsciiFlow Bazel build (optional upstream path) |
| RTL **blocks** panel (pipeline, mux, FF, SRAM, …) with ghost placement | Schematic capture, netlists, timing (see [wavedrom_attempt](../wavedrom_attempt/)) |
| Copy ASCII / SVG, download `.svg`, share URL | Team block libraries, VCD import |
| Per-drawing `localStorage` persistence (AsciiFlow) | |

## Quick start

From the project folder:

```bash
npm install   # first time only
npm run dev   # editor at http://localhost:5173 — stop with Ctrl+C
```

To ship a static copy: `npm run build` (creates `dist/`). Try it locally with `npm run preview`.

Before sharing changes: `npm run check` (typecheck + tests + build).

Regenerate SVG from committed ASCII (CLI, uses `svgbob-wasm`):

```bash
make svg ASCII_SRC=examples/diagram.txt SVG_OUT=examples/diagram.svg
make svg-all   # all examples/*.txt and docs/engdoc/img/ascii/*.txt
```

**Windows:** run the commands above in PowerShell if Node.js is installed, or use WSL/`make` via Git Bash.

## Using the editor

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  toolbar (svgbob · tools · zoom · blocks · export · view)   │
├──────────────────────────┬──────────────────────────────────┤
│  ASCII canvas            │  svgbob SVG preview              │
│  (monospace grid)        │  copy · export · link            │
│                          │                                  │
├──────────────────────────┴──────────────────────────────────┤
│  status bar (cell · tool · zoom · lines/chars · WASM state) │
└─────────────────────────────────────────────────────────────┘
         ▲ drag handle between panes (width saved in localStorage)
```

**View** panel: theme (`light` / `light grey` / `dark`), UI scale (S/M/L), grid toggle. Default theme is **light grey** (professional chrome, white canvas). Application chrome uses system UI fonts; the canvas and ASCII use a monospace stack (`Cascadia Mono`, `Consolas`, …).

**Canvas zoom** (`−` / `zoom%` / `+` / `fit` in the toolbar, or Ctrl/Cmd+scroll) applies to the editor viewport and is persisted per drawing.

### Tools (toolbar)

| Tool | Shortcut (hold **Alt**) | Use |
|------|-------------------------|-----|
| **box** | Alt+1 | Drag corner to corner for a rectangle |
| **select** | Alt+2 | Rubber-band select; drag selection to move; Ctrl+C / Ctrl+V copy/paste; Delete erases |
| **draw** | Alt+3 | Freeform character; press any key to change the pen character |
| **arrow** | Alt+4 | Drag start → end; Shift changes orientation |
| **line** | Alt+5 | Same as arrow, line style |
| **text** | Alt+6 | Click and type; Enter commits, Shift+Enter newline |

### Navigation

| Input | Action |
|-------|--------|
| Scroll | Pan |
| Shift+scroll | Pan horizontally |
| Middle-click drag | Pan |
| Ctrl/Cmd+scroll | Zoom |
| Ctrl/Cmd+Z | Undo (or discard in-progress scratch) |
| Ctrl/Cmd+Shift+Z | Redo |

### RTL blocks

Open **blocks** in the toolbar. Click a template (pipeline, register, mux, adder, SRAM, bus, …):

1. A **ghost** of the block follows the cursor over the canvas.
2. **Click** to stamp it at that grid position (repeat for multiple copies).
3. **Esc** cancels placement; **R** rotate 90°, **H**/**V** flip; red ghost = overlap — **click does not commit** on overlap.
4. Parametric blocks (box, bus, SRAM, …) prompt for label / bus width / clock name before placing.

Snippets use **plain ASCII** only so [svgbob](https://github.com/ivanceras/svgbob) parses them reliably. Edit labels in place with **text** or **select** after placing.

### Preview pane

| Control | Action |
|---------|--------|
| Copy ASCII | **Committed** plain-text diagram (ghost placement excluded) |
| **.txt** | Download committed `diagram.txt` |
| Copy SVG / **.svg** | SVG from **committed** ASCII (not live ghost preview) |
| **export…** | Dialog: `.txt` / `.svg` / `.png`, scale 1×/2×/4×, white or transparent background |
| **link** | Copy `#/bob/<base64url>` share URL from committed ASCII (≤ 6000 chars) |

Live preview renders `layerToText(combined)` — committed diagram plus placement ghosts — through **svgbob-wasm** (debounced ~180 ms). Copy, download, and share use the **committed** layer only.

### Files panel

AsciiFlow **local drawings** are stored in `localStorage` under per-drawing keys. Use **files** to create, rename, switch, and delete drawings. Shared read-only drawings use AsciiFlow’s `/share/…` route format.

## Architecture

```
  AsciiFlow canvas              svgbob preview
  (pointer → draw tools)              │
         │                            │
         ▼                            ▼
   CanvasStore  ◄── Zustand canvasVersion bump
   (Layer grid)         │
         │              │  layerToText(combined) → live preview
         │              │  layerToText(committed) → export / share
         │              ▼
         │         renderer.ts  →  svgbob-wasm
         │              │
         └──────────────┴──► SvgPreview + ExportDialog (copy / export / share)
```

| Layer | Location | Role |
|-------|----------|------|
| **Document** | `asciiflow-upstream/client/store/canvas.ts`, `layer.ts` | Sparse cell grid (`committed` + scratch); undo/redo stacks |
| **Tools** | `asciiflow-upstream/client/draw/` | Box, line, arrow, select, text, freeform, **place_block** (RTL stamps) |
| **Input** | `asciiflow-upstream/client/controller.ts` | Pointer, wheel, keyboard → tool + pan/zoom |
| **View** | `asciiflow-upstream/client/view.tsx` | Canvas paint (grid, selection, scratch highlight) |
| **Bridge** | `asciiflow-upstream/client/text_utils.ts` | `layerToText` / `textToLayer` — grid ↔ multiline ASCII |
| **Renderer** | `asciiflow-upstream/client/renderer.ts` | `svgbob-wasm` sync render (offline) |
| **UI shell** | `Workspace.tsx`, `toolbar.tsx`, `svg_preview.tsx`, `StatusBar.tsx` | Split layout, docked toolbar, preview + export dialog, status bar |
| **Export** | `export_engine.ts`, `ExportDialog.tsx` | TXT/SVG/PNG from committed ASCII with scale/background |
| **Sharing** | `svgbob_storage.ts`, `svgbob_bootstrap.ts` | Base64url encode/decode; `#/bob/…` route load |

Vite root is `asciiflow-upstream/client/`; `#asciiflow` alias points at the upstream tree (`vite.config.ts` at repo root).

### ASCII → SVG pipeline

| Step | Module | Notes |
|------|--------|-------|
| Edit cells | `CanvasStore` | Committed layer is source of truth; scratch is preview (selection, drag, block ghost) |
| Serialize | `layerToText()` | Bounding box trim; spaces skipped in `textToLayer` import |
| Render | `renderAsync()` | WASM only; errors surfaced in preview banner |
| Share | `buildShareUrl()` | Hash route `#/bob/<encoded>`; length limit 6000 characters |

### Key source files

1. `asciiflow-upstream/client/app.tsx` — routes, clipboard paste, bootstrap
2. `asciiflow-upstream/client/Workspace.tsx` — canvas + resizer + preview split
3. `asciiflow-upstream/client/snippets.ts` — RTL block templates + `beginBlockPlacement()`
4. `asciiflow-upstream/client/draw/place_block.ts` — ghost-follows-cursor stamp mode
5. `asciiflow-upstream/client/svg_preview.tsx` — debounced preview, export UI
6. `asciiflow-upstream/client/renderer.ts` — svgbob WASM
7. `scripts/render-cli.ts` — CLI regen for `make svg` (via `vite-node`)

## Project layout

| Path | Role |
|------|------|
| `asciiflow-upstream/` | Vendored [lewish/asciiflow](https://github.com/lewish/asciiflow) + svgbob patches |
| `asciiflow-upstream/client/` | React app (canvas, toolbar, preview) |
| `vite.config.ts` | Vite 5 root, WASM plugins, `#asciiflow` alias, `dist/` output |
| `package.json` | `npm run dev` / `build` / `preview` |
| `dist/` | Production static build |
| `src/` | Deprecated CodeMirror prototype — **do not extend** |
| `previous_agent.md` | Original spec — **archived** |
| `agent.md` | Original implementation notes — **archived** |

## Tips for hardware diagrams

- Prefer **box** and **line** / **arrow** for datapath and control flow; use **blocks** for common RTL shapes, then relabel with **text**.
- Keep signal names and notes in **double quotes** in svgbob sources when authoring by hand; the built-in snippets already use svgbob-friendly plain ASCII.
- For eng docs: commit the **ASCII** in `docs/engdoc/` (diffable in review) and regenerate SVG in CI or paste from **Export** when needed.
- Pair with [wavedrom_attempt](../wavedrom_attempt/) for **timing** diagrams; use **svgbob-gui** for **block / datapath** figures.

## Further reading

| Document | Purpose |
|----------|---------|
| [`agent.md`](./agent.md) | Archived feature checklist (CodeMirror era) |
| [`agent_orchestrator.md`](./agent_orchestrator.md) | Multi-step build plan |
| [`previous_agent.md`](./previous_agent.md) | Archived CodeMirror + draw-tools spec |
| [svgbob](https://github.com/ivanceras/svgbob) | ASCII-to-SVG grammar and CLI |
| [AsciiFlow](https://github.com/lewish/asciiflow) | Upstream canvas editor |
