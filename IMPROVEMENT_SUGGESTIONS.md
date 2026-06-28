# Improvement Suggestions

The core editor is in good shape: live SVG preview with fit / 1:1 / sync modes and recenter, block categories, tooltips, lighter help typography, `Ctrl+A` select-all (with `Delete` to erase), share/copy toasts, preference persistence for theme, grid, zoom, UI scale, and preview mode, plus basic line/arrow junction merging and block-placement anchor snapping.

What follows is the remaining backlog — items not done, or only started.

## High Impact

### Block Gallery Test Page

Create a small internal page that renders every block template at 1x, 2x, and 3x scale. This would make it much easier to visually review templates like mux, flip-flop, SRAM, bus, FIFO, reset sync, and scan blocks after scaling changes.

Recommended checks:

- Show each block in normal, rotated, horizontally flipped, and vertically flipped states.
- Include parameterized blocks with default and larger values.
- Highlight the ASCII bounding box for each template.
- Show the final svgbob SVG beside the ASCII version.

This would prevent regressions where a scaled block looks aligned in ASCII but breaks in SVG, or where text spacing turns labels like `MUX` into `M U X`.

### Golden Fixtures for Block Scaling

`place_block_scale.test.ts` and `snippets.test.ts` cover a few scaling and box-drawing cases inline. Extend this into a proper fixture suite:

- Add fixture files for block outputs at each scale; tests compare generated ASCII against expected ASCII before rendering.
- Cover all built-in blocks at 1x, 2x, and 3x — not just primitives.
- Include edge cases: odd widths, short labels, long labels, side pins, overlapping connectors, rotated blocks.
- Groups to target: primitive blocks (box, arrow, arrow label, down, pipeline); RTL blocks (mux, adder, reg/FF, SRAM, bus, FIFO, APB, ICG, reset sync); parameterized variants.

### Arrow and Line Conflict Handling (remaining gaps)

`mergeCommittedConflicts()` handles basic junction insertion when lines cross existing geometry, and `draw_line.test.ts` covers crossings. Still missing:

- Conflict preview before commit, especially when drawing through dense diagrams.
- Explicit protection so box corners are not accidentally replaced.
- Broader regression coverage for arrowheads through box walls and mixed dense layouts.

### Optional Clear-Canvas Shortcut

Select-all vs erase is fixed (`Ctrl+A` selects; `Delete` erases). Consider an explicit, hard-to-trigger clear command — toolbar action or `Ctrl+Shift+Backspace` — for wiping the whole canvas without selecting first.

## Editor Experience

### Command Palette

A command palette would help users discover actions without adding more toolbar buttons. Expose commands like export SVG, copy ASCII, recenter, fit preview, select all, clear selection, toggle grid, and open help.

### Persist Remaining Preferences

Theme, grid, zoom, UI size, and preview mode already persist. Still session-only:

- Block scale (1x / 2x / 3x in the blocks panel).
- Last selected tool.

## Blocks and Templates

### Custom User Blocks

Let users save a selected ASCII region as a reusable block. Suggested fields: name, category, default scale, optional parameters, optional pin labels.

### Pin and Port Snapping for Lines and Arrows

Block placement already snaps ghost anchors to nearby committed edges. Extend snapping so arrow and line tools can snap to known block port anchors while drawing — without adopting a heavy diagramming model.

## Export and Sharing

### Export Presets

`ExportDialog` supports format, scale, and PNG background, but there are no one-click named presets. Add presets such as:

- Docs: light background, readable stroke weight.
- Slides: larger scale, transparent background.
- Markdown: copy SVG or image reference.
- Dark docs: inverted or theme-aware output.

### Compressed Share URLs

Copy/share toasts and size-limit feedback exist. Optional improvement: compressed URLs for large diagrams that exceed comfortable URL length.

## Quality and Reliability

### Extend Browser Smoke Tests

Playwright coverage exists for load, draw box/line/arrow, text, select+delete, undo/redo, copy/paste, export dialog, pan/zoom, and help button visibility. Add tests for:

- `Ctrl+A` select all.
- Block placement at 1x, 2x, and 3x.
- Toggle help panel content (not just button visibility).
- Export SVG from the preview pane.
- Preview recenter.

### Visual Regression Screenshots

For a drawing tool, screenshots are a high-value safety net. Suggested cases:

- Empty canvas.
- Dense RTL diagram.
- Large diagram with preview scrollbars.
- Help panel.
- Block placement ghost.
- Scaled blocks.
- Dark, grey, and light themes.

### ASCII Normalization Diagnostics (remaining gaps)

Line and character counts already appear in the status bar and preview footer; `svgbob_text.ts` handles preprocessing. Still useful:

- Highlight trailing whitespace in debug mode.
- Show bounding boxes for selected ASCII regions.
- Offer a "copy normalized ASCII" action.

## Performance

### Preview Status UX and Worker Offload

Preview rendering is debounced (180ms) and shows timing / render-failed in the footer. Improve further:

- Explicit Editing / Rendering / Rendered states in the UI (not just WASM ok/error in the status bar).
- Move SVG generation into a worker if large diagrams make the main thread stutter.

### Canvas Paint Culling for Committed Cells

Grid drawing is already limited to the visible cell box. Committed character painting still iterates all layer entries — cull text/highlight passes to the visible region, especially at high zoom on dense diagrams and while block ghosts follow the cursor.

## Recommended Next Steps

1. Create the block gallery test page.
2. Expand golden ASCII fixtures to all scaled blocks and edge cases.
3. Add Playwright coverage for `Ctrl+A`, block scales, preview recenter, and preview SVG export.
4. Add a command palette for discoverability.
5. Add export presets and persist block scale / last tool.

These changes would make the project easier to evolve without breaking the parts users notice most: block shape, preview accuracy, keyboard behavior, and export quality.
