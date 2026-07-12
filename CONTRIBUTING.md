# Contributing

Thanks for helping improve svgbob GUI.

## Setup

Use Node.js 22 and npm:

```bash
npm ci
npm run dev
```

Before submitting a pull request, run:

```bash
npm run check
npm run test:e2e
```

Install Playwright's browser runtimes once with
`npx playwright install chromium firefox`.

## Project structure

The active Vite application lives in `asciiflow-upstream/client/`. Prefer the
existing React, Zustand, canvas-layer, and tool-controller patterns. Keep
changes focused and include regression tests for editor behavior.

Reusable blocks are defined in
`asciiflow-upstream/client/lib/snippets/snippets.ts`. Keep block labels generic,
quote multi-character svgbob text, and verify every changed block at 1x, 2x,
and 3x.

Development-only review pages are available while `npm run dev` is running:

- `#/review/blocks/1`, `#/review/blocks/2`, and `#/review/blocks/3` place every block on a canvas.
- `#/review/blocks/1/inspect`, `#/review/blocks/2/inspect`, and `#/review/blocks/3/inspect` compare scaled ASCII with rendered SVG.

These routes are intentionally unavailable in production builds.

## Pull requests

- Explain the user-visible problem and the chosen behavior.
- Add focused unit tests and E2E coverage when appropriate.
- Include before/after screenshots for visual changes.
- Do not commit generated `dist/`, test reports, local logs, or editor settings.
- Do not include confidential diagrams, project names, signal names, or customer data in examples and fixtures.

By contributing, you agree that your contribution is licensed under the
repository's MIT License.
