export interface FillSwatch {
  id: string;
  label: string;
  fill: string;
  stroke: string;
}

export interface FillStyle {
  fill: string;
  stroke: string;
}

/** Fixed svgbob palette plus custom hex colors. */
export const FILL_SWATCHES: FillSwatch[] = [
  { id: "c1", label: "blue", fill: "#dbeafe", stroke: "#2563eb" },
  { id: "c2", label: "green", fill: "#dcfce7", stroke: "#16a34a" },
  { id: "c3", label: "amber", fill: "#fef3c7", stroke: "#d97706" },
  { id: "c4", label: "red", fill: "#fee2e2", stroke: "#dc2626" },
  { id: "c5", label: "slate", fill: "#f1f5f9", stroke: "#64748b" },
  { id: "c6", label: "violet", fill: "#ede9fe", stroke: "#7c3aed" },
  { id: "c7", label: "cyan", fill: "#cffafe", stroke: "#0891b2" },
  { id: "c8", label: "teal", fill: "#ccfbf1", stroke: "#0f766e" },
  { id: "c9", label: "lime", fill: "#ecfccb", stroke: "#65a30d" },
  { id: "c10", label: "orange", fill: "#ffedd5", stroke: "#ea580c" },
  { id: "c11", label: "pink", fill: "#fce7f3", stroke: "#db2777" },
  { id: "c12", label: "zinc", fill: "#e4e4e7", stroke: "#52525b" },
];

export const FILL_TAG_PATTERN = /\{(?:c\d+|#[0-9a-fA-F]{6})\}/g;
export const CUSTOM_FILL_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function swatchById(id: string): FillSwatch | undefined {
  return FILL_SWATCHES.find((s) => s.id === id);
}

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexByte(value: number): string {
  return clampColor(value).toString(16).padStart(2, "0");
}

function deriveStroke(fill: string): string {
  const normalized = normalizeCustomFillTag(fill);
  if (!normalized) {
    return "#475569";
  }
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return `#${hexByte(r * 0.58)}${hexByte(g * 0.58)}${hexByte(b * 0.58)}`;
}

export function normalizeCustomFillTag(value: string): string | null {
  const trimmed = value.trim();
  if (!CUSTOM_FILL_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed.toLowerCase();
}

export function fillStyleForTag(tagId: string): FillStyle | null {
  const swatch = swatchById(tagId);
  if (swatch) {
    return { fill: swatch.fill, stroke: swatch.stroke };
  }
  const custom = normalizeCustomFillTag(tagId);
  if (!custom) {
    return null;
  }
  return { fill: custom, stroke: deriveStroke(custom) };
}

export function legendLineForSwatch(swatch: FillSwatch): string {
  return `${swatch.id} = { fill: ${swatch.fill}; stroke: ${swatch.stroke}; }`;
}
