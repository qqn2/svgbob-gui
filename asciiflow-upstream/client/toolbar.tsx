import { ASCII, UNICODE } from "#asciiflow/client/constants";
import { ExportPanel } from "#asciiflow/client/export";
import {
  FILL_SWATCHES,
  normalizeCustomFillTag,
  swatchById,
} from "#asciiflow/client/lib/svgbob/fill_palette";
import { DrawingId, store, ToolMode, useAppStore } from "#asciiflow/client/store";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
import { ThemeMode } from "#asciiflow/client/theme_settings";
import { DrawingStringifier } from "#asciiflow/client/store/drawing_stringifier";
import {
  Button,
  ControlledDialog,
  Kbd,
  TextField,
  Toast,
} from "#asciiflow/client/ui/components";
import styles from "#asciiflow/client/toolbar.module.css";
import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  parseDrawingBackup,
  serializeDrawingBackup,
} from "#asciiflow/client/drawing_backup";
import {
  redoRawEditor,
  undoRawEditor,
} from "#asciiflow/client/raw_editor_bridge";

// ---------------------------------------------------------------------------
// Which panel owns the second row (singleton — only one at a time)
// ---------------------------------------------------------------------------

export type PanelId = "file" | "export" | "snippets" | "help" | "view" | null;

// Module-level panel state so it survives React Router remounts.
let _currentPanel: PanelId = null;
const _panelListeners = new Set<(p: PanelId) => void>();
export function setActivePanel(id: PanelId) {
  _currentPanel = id;
  _panelListeners.forEach((listener) => listener(id));
}

export function usePanel(): [PanelId, (id: PanelId) => void] {
  const [panel, _setPanel] = useState<PanelId>(_currentPanel);
  useEffect(() => {
    const listener = (p: PanelId) => _setPanel(p);
    _panelListeners.add(listener);
    return () => { _panelListeners.delete(listener); };
  }, []);
  return [panel, setActivePanel];
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS: Array<{
  mode: ToolMode;
  label: string;
  testId: string;
  shortcut: string;
  color: string;
}> = [
  { mode: ToolMode.BOX, label: "box", testId: "tool-boxes", shortcut: "1", color: "var(--color-cyan)" },
  { mode: ToolMode.SELECT, label: "select", testId: "tool-select---move", shortcut: "2", color: "var(--color-success)" },
  { mode: ToolMode.FREEFORM, label: "draw", testId: "tool-freeform", shortcut: "3", color: "var(--color-orange)" },
  { mode: ToolMode.ARROWS, label: "arrow", testId: "tool-arrow", shortcut: "4", color: "var(--color-purple)" },
  { mode: ToolMode.LINES, label: "line", testId: "tool-line", shortcut: "5", color: "var(--color-accent)" },
  { mode: ToolMode.TEXT, label: "text", testId: "tool-text", shortcut: "6", color: "var(--color-warning)" },
  { mode: ToolMode.FILL, label: "fill", testId: "tool-fill", shortcut: "7", color: "var(--color-danger)" },
  { mode: ToolMode.ERASE, label: "erase", testId: "tool-erase", shortcut: "8", color: "var(--color-danger)" },
  { mode: ToolMode.RAW, label: "raw", testId: "tool-raw", shortcut: "9", color: "var(--color-accent)" },
];

// Helper: stop all keyboard event propagation so controller doesn't intercept
function stopKeys(e: React.KeyboardEvent) {
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation();
}

// ---------------------------------------------------------------------------
// Top-level Toolbar
// ---------------------------------------------------------------------------

export function Toolbar() {
  const route = useAppStore((s) => s.route);
  const selectedToolMode = useAppStore((s) => s.selectedToolMode);
  const altPressed = useAppStore((s) => s.altPressed);
  const canvasVersion = useAppStore((s) => s.canvasVersion);
  const isShared = Boolean(route.shareSpec);
  const [panel, setPanel] = usePanel();

  function togglePanel(id: PanelId) {
    setPanel(panel === id ? null : id);
  }

  // The freeform tool shows its picker in the second row when no panel is open
  const showFreeformPicker =
    !isShared && selectedToolMode === ToolMode.FREEFORM && panel === null;

  const showFillPicker =
    !isShared && selectedToolMode === ToolMode.FILL && panel === null;

  const showTextPanel =
    !isShared && selectedToolMode === ToolMode.TEXT && panel === null;

  const showTopPanel = panel !== null && panel !== "snippets";
  const showSecondRow = showTopPanel || showFreeformPicker || showFillPicker || showTextPanel;

  return (
    <div className={styles.topBarWrapper}>
    <div className={styles.topBar}>
      {/* ── Primary row ── */}
      <div className={styles.topRow}>
        {/* Branding */}
        <span className={styles.brand} title="svgbob GUI — offline RTL block diagrams">
          <span style={{ color: "var(--color-brand)" }}>svg</span>
          <span style={{ color: "var(--color-accent)" }}>bob</span>
        </span>

        <ToolbarGroup>
          <PanelBtn id="file" current={panel} onClick={togglePanel} title="Files">
            files
          </PanelBtn>
        </ToolbarGroup>

        {/* Tools (or shared banner) */}
        {isShared ? (
          <ToolbarGroup>
            <SharedBanner drawingId={route} />
          </ToolbarGroup>
        ) : (
          <ToolbarGroup className={styles.toolsGroup}>
            {TOOLS.map((tool) => {
              const active = selectedToolMode === tool.mode;
              return (
                <button
                  key={tool.mode}
                  className={[
                    styles.toolTab,
                    active ? styles.toolTabActive : "",
                  ].filter(Boolean).join(" ")}
                  style={active ? { color: tool.color } : undefined}
                  title={`${tool.label} tool`}
                  onClick={() => {
                    store.setToolMode(tool.mode);
                    setPanel(null);
                  }}
                  data-testid={tool.testId}
                >
                  {tool.label}
                  {altPressed && <> <Kbd>{tool.shortcut}</Kbd></>}
                </button>
              );
            })}
          </ToolbarGroup>
        )}

        {!isShared ? (
          <ToolbarGroup>
            <ZoomCluster />
            <ActionBtn
              color="var(--color-orange)"
              onClick={() => store.currentCanvas.recenter()}
              title="Recenter canvas"
            >
              recenter
            </ActionBtn>
          </ToolbarGroup>
        ) : null}

        <ToolbarGroup>
          <PanelBtn id="snippets" current={panel} onClick={togglePanel} title="Blocks">
            blocks
          </PanelBtn>

          <PanelBtn id="export" current={panel} onClick={togglePanel} title="Export">
            export
          </PanelBtn>
        </ToolbarGroup>

        {/* Actions */}
        {!isShared && (
          <ToolbarGroup>
            <ActionBtn
              color="var(--color-success)"
              onClick={() => {
                if (selectedToolMode === ToolMode.RAW) {
                  undoRawEditor();
                } else {
                  store.currentCanvas.undo();
                }
              }}
              title="Undo"
            >
              undo
            </ActionBtn>
            <ActionBtn
              color="var(--color-danger)"
              onClick={() => {
                if (selectedToolMode === ToolMode.RAW) {
                  redoRawEditor();
                } else {
                  store.currentCanvas.redo();
                }
              }}
              title="Redo"
            >
              redo
            </ActionBtn>
          </ToolbarGroup>
        )}

        <ToolbarGroup className={styles.utilityGroup}>
          <PanelBtn id="view" current={panel} onClick={togglePanel} title="View settings">
            view
          </PanelBtn>

          <PanelBtn id="help" current={panel} onClick={togglePanel} title="Help">
            help
          </PanelBtn>
        </ToolbarGroup>
      </div>
    </div>

      {/* ── Secondary row (contextual) ── */}
      {showSecondRow && (
        <div className={styles.secondRow}>
          {panel === "file" && <FilePanel />}
          {panel === "help" && <HelpContent />}
          {panel === "export" && <ExportPanel drawingId={route} />}
          {panel === "view" && <ViewPanel />}
          {showFreeformPicker && <DrawPanel />}
          {showFillPicker && <FillPanel />}
          {showTextPanel && <TextPanel />}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel toggle button (highlights when its panel is active)
// ---------------------------------------------------------------------------

function ToolbarGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={[styles.toolbarGroup, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

function PanelBtn({
  id,
  current,
  onClick,
  title,
  children,
}: {
  id: PanelId;
  current: PanelId;
  onClick: (id: PanelId) => void;
  title?: string;
  children: React.ReactNode;
}) {
  const active = current === id;
  return (
    <button
      className={[styles.menuBarBtn, active ? styles.menuBarBtnActive : ""]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onClick(id)}
      data-testid={`${id}-button`}
      title={title}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Bracket-wrapped action button: [colored text]
// ---------------------------------------------------------------------------

function ActionBtn({
  color,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { color: string }) {
  return (
    <button className={styles.actionBtn} style={{ color }} {...rest}>
      [{children}]
    </button>
  );
}

// ---------------------------------------------------------------------------
// Separator — box-drawing vertical line │
// ---------------------------------------------------------------------------

function Sep() {
  return <span className={styles.sep}>{"\u2502"}</span>;
}

function ZoomCluster() {
  useAppStore((s) => s.canvasVersion);
  const zoom = store.currentCanvas.zoom;
  const zoomPct = Math.round(zoom * 100);

  const stepZoom = (delta: number) => store.stepZoom(delta);

  return (
    <>
      <ActionBtn color="var(--color-cyan)" onClick={() => stepZoom(-0.2)} title="Zoom out">
        −
      </ActionBtn>
      <span className={styles.zoomLabel}>{zoomPct}%</span>
      <ActionBtn color="var(--color-cyan)" onClick={() => stepZoom(0.2)} title="Zoom in">
        +
      </ActionBtn>
      <ActionBtn
        color="var(--color-orange)"
        onClick={() => store.fitDiagram()}
        title="Fit diagram to canvas"
      >
        fit
      </ActionBtn>
    </>
  );
}

// ---------------------------------------------------------------------------
// View panel — theme and grid
// ---------------------------------------------------------------------------

function ViewPanel() {
  const themeMode = useAppStore((s) => s.themeMode);
  const showGrid = useAppStore((s) => s.showGrid);

  const themes: Array<{ id: ThemeMode; label: string }> = [
    { id: "light", label: "light" },
    { id: "light-grey", label: "grey" },
    { id: "dark", label: "dark" },
  ];

  return (
    <div className={styles.viewPanel}>
      <span className={styles.viewLabel}>theme</span>
      {themes.map((t) => (
        <ActionBtn
          key={t.id}
          color={themeMode === t.id ? "var(--color-accent)" : "var(--color-text-muted)"}
          onClick={() => store.setThemeMode(t.id)}
        >
          {t.label}
        </ActionBtn>
      ))}
      <span className={styles.sep}>{"\u2502"}</span>
      <span className={styles.viewLabel}>
        grid: <span className={styles.viewValue}>{showGrid ? "on" : "off"}</span>
      </span>
      <ActionBtn
        color="var(--color-success)"
        onClick={() => store.setShowGrid(!showGrid)}
      >
        {showGrid ? "hide" : "show"}
      </ActionBtn>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draw panel — hint + expandable character picker
// ---------------------------------------------------------------------------

const BLOCK_ELEMENTS = [
  "\u2588", // █ FULL BLOCK
  "\u2584", // ▄ LOWER HALF
  "\u2580", // ▀ UPPER HALF
  "\u258C", // ▌ LEFT HALF
  "\u2590", // ▐ RIGHT HALF
  "\u2591", // ░ LIGHT SHADE
  "\u2592", // ▒ MEDIUM SHADE
  "\u2593", // ▓ DARK SHADE
];

const PRINTABLE_KEYS = Array.from(Array(127 - 33).keys())
  .map((i) => i + 33)
  .map((i) => String.fromCharCode(i));

const CHAR_GROUPS: Array<{ label: string; keys: string[] }> = [
  { label: "box drawing", keys: Object.values(UNICODE) },
  { label: "ASCII lines", keys: [...new Set(Object.values(ASCII))] },
  { label: "block shades", keys: BLOCK_ELEMENTS },
  {
    label: "punctuation",
    keys: PRINTABLE_KEYS.filter((key) => /[^A-Za-z0-9]/.test(key)),
  },
  {
    label: "numbers",
    keys: PRINTABLE_KEYS.filter((key) => /[0-9]/.test(key)),
  },
  {
    label: "uppercase",
    keys: PRINTABLE_KEYS.filter((key) => /[A-Z]/.test(key)),
  },
  {
    label: "lowercase",
    keys: PRINTABLE_KEYS.filter((key) => /[a-z]/.test(key)),
  },
];

function FillPanel() {
  const selectedFillTag = useAppStore((s) => s.selectedFillTag);
  const fillForceMode = useAppStore((s) => s.fillForceMode);
  const fillStatus = useAppStore((s) => s.fillStatus);
  const selectedSwatch = selectedFillTag ? swatchById(selectedFillTag) : null;
  const activeCustomColor =
    selectedFillTag && !selectedSwatch
      ? normalizeCustomFillTag(selectedFillTag) ?? "#c7d2fe"
      : "#c7d2fe";
  const [customColor, setCustomColor] = useState(activeCustomColor);
  const rgb = hexToRgb(customColor);

  useEffect(() => {
    setCustomColor(activeCustomColor);
  }, [activeCustomColor]);

  const selectCustomColor = (value: string) => {
    const normalized = normalizeCustomFillTag(value);
    if (!normalized) {
      return;
    }
    setCustomColor(normalized);
    store.setSelectedFillTag(normalized);
  };

  return (
    <div className={styles.fillPanel}>
      <span className={styles.fillHint}>click box or force-place tag</span>
      <div className={styles.fillSection}>
        <span className={styles.fillLabel}>force</span>
        <ActionBtn
          color={fillForceMode ? "var(--color-danger)" : "var(--color-text-muted)"}
          onClick={() => store.setFillForceMode(!fillForceMode)}
          title={fillForceMode ? "No-box clicks write the fill tag" : "No-box clicks do nothing"}
        >
          {fillForceMode ? "on" : "off"}
        </ActionBtn>
      </div>
      <span
        className={[
          styles.fillStatus,
          fillStatus?.tone === "ok" ? styles.fillStatusOk : "",
          fillStatus?.tone === "warn" ? styles.fillStatusWarn : "",
        ].filter(Boolean).join(" ")}
      >
        {fillStatus?.message ?? "move over canvas for fill status"}
        {fillStatus?.box
          ? ` (${fillStatus.box.left},${fillStatus.box.top} to ${fillStatus.box.right},${fillStatus.box.bottom})`
          : ""}
      </span>
      <div className={styles.fillSection}>
        <span className={styles.fillLabel}>presets</span>
        <div className={styles.fillSwatches} aria-label="preset fill colors">
        {FILL_SWATCHES.map((swatch) => (
          <button
            key={swatch.id}
            type="button"
            className={[
              styles.fillSwatch,
              selectedFillTag === swatch.id ? styles.fillSwatchActive : "",
            ].filter(Boolean).join(" ")}
            style={{
              background: swatch.fill,
              borderColor: swatch.stroke,
            }}
            title={`${swatch.label} (${swatch.id})`}
            onClick={() => store.setSelectedFillTag(swatch.id)}
          />
        ))}
        </div>
      </div>
      <div className={styles.fillSection}>
        <span className={styles.fillLabel}>RGB</span>
        <input
          type="color"
          className={styles.fillColorInput}
          value={normalizeCustomFillTag(customColor) ?? activeCustomColor}
          title="custom RGB color"
          onChange={(e) => selectCustomColor(e.target.value)}
        />
        <input
          className={styles.fillHexInput}
          value={customColor}
          aria-label="custom fill hex color"
          spellCheck={false}
          onKeyDown={stopKeys}
          onKeyPress={stopKeys}
          onChange={(e) => {
            setCustomColor(e.target.value);
            selectCustomColor(e.target.value);
          }}
        />
        <span className={styles.fillRgbValue}>
          {rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : "invalid"}
        </span>
      </div>
      <div className={styles.fillSection}>
        <button
          type="button"
          className={[
            styles.fillSwatch,
            styles.fillSwatchClear,
            selectedFillTag === null ? styles.fillSwatchActive : "",
          ].filter(Boolean).join(" ")}
          title="clear fill"
          onClick={() => store.setSelectedFillTag(null)}
        >
          ∅
        </button>
        <span className={styles.fillLabel}>clear</span>
      </div>
    </div>
  );
}

function TextPanel() {
  const quoteMode = useAppStore((s) => s.textQuoteMode);

  return (
    <div className={styles.textPanel}>
      <span className={styles.textHint}>quotes</span>
      <ActionBtn
        color={quoteMode ? "var(--color-warning)" : "var(--color-text-muted)"}
        onClick={() => store.setTextQuoteMode(!quoteMode)}
        title={quoteMode ? "Text commits as quoted svgbob labels" : "Text commits raw"}
      >
        {quoteMode ? "on" : "off"}
      </ActionBtn>
      <span className={styles.textPreview}>
        {quoteMode ? '"TEXT"' : "TEXT"}
      </span>
    </div>
  );
}

function hexToRgb(value: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeCustomFillTag(value);
  if (!normalized) {
    return null;
  }
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function DrawPanel() {
  const [expanded, setExpanded] = useState(false);
  const freeformCharacter = useAppStore((s) => s.freeformCharacter);

  return (
    <div className={styles.drawPanel}>
      <div>
        <span className={styles.drawHint}>
          drawing with <strong style={{ color: "var(--color-orange)" }}>{freeformCharacter}</strong> {"\u2502"} press any key to change
        </span>
        {" "}
        <button
          className={styles.drawExpandBtn}
          onClick={() => setExpanded(!expanded)}
        >
          [{expanded ? "hide" : "show"} characters]
        </button>
      </div>
      {expanded && (
        <div className={styles.charPicker}>
          {CHAR_GROUPS.map((group) => (
            <div className={styles.charGroup} key={group.label}>
              <span className={styles.charGroupLabel}>{group.label}</span>
              <div className={styles.charGroupKeys}>
                {group.keys.map((key, i) => (
                  <button
                    key={`${group.label}-${key}-${i}`}
                    className={[
                      styles.charBtn,
                      key === freeformCharacter ? styles.charBtnActive : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => {
                      store.setToolMode(ToolMode.FREEFORM);
                      store.setFreeformCharacter(key);
                    }}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Help content
// ---------------------------------------------------------------------------

const BUG_REPORT_URL =
  "https://github.com/qqn2/svgbob-gui/issues/new?template=bug_report.yml";

function HelpContent() {
  const route = useAppStore((s) => s.route);
  const isShared = Boolean(route.shareSpec);
  const cmd = ctrlOrCmd();

  return (
    <div className={styles.helpContent}>
      <div className={styles.helpHero}>
        <div>
          <div className={styles.helpEyebrow}>svgbob workspace</div>
          <div className={styles.helpTitle}>Draw ASCII, inspect SVG, export clean docs.</div>
        </div>
        <div className={styles.helpHeroActions}>
          <span><Kbd>diagram.txt</Kbd> source</span>
          <span><Kbd>.svg</Kbd> export</span>
          <a
            className={styles.helpReportLink}
            href={BUG_REPORT_URL}
            target="_blank"
            rel="noreferrer"
          >
            Report a bug
          </a>
        </div>
      </div>

      <div className={styles.helpColumns}>
        <section className={styles.helpPanel}>
          <div className={styles.helpPanelHeader}>
            <span className={styles.helpSection}>workspace</span>
            <span className={styles.helpSectionHint}>preview and block placement</span>
          </div>
          <div className={styles.helpCards}>
            <HelpCard tone="accent" title="preview" detail="Live SVG from the canvas ASCII.">
              <Kbd>sync</Kbd><Kbd>1:1</Kbd><Kbd>fit</Kbd><Kbd>export .svg</Kbd>
            </HelpCard>
            <HelpCard tone="cyan" title="blocks" detail="Searchable schematic templates with placement preview.">
              <Kbd>1x</Kbd><Kbd>2x</Kbd><Kbd>3x</Kbd><Kbd>R</Kbd><Kbd>H</Kbd><Kbd>V</Kbd><Kbd>esc</Kbd>
            </HelpCard>
          </div>
        </section>

        <section className={styles.helpPanel}>
          <div className={styles.helpPanelHeader}>
            <span className={styles.helpSection}>tools</span>
            <span className={styles.helpSectionHint}>draw and edit cells</span>
          </div>
          <div className={styles.helpToolList}>
            <HelpTool tone="cyan" title="box" detail="Drag corner to corner." />
            <HelpTool tone="success" title="select" detail="Move, resize, copy, paste, erase, and repair edges.">
              <Kbd>{cmd}+a</Kbd><Kbd>{cmd}+c</Kbd><Kbd>{cmd}+v</Kbd><Kbd>delete</Kbd><Kbd>shift</Kbd>
            </HelpTool>
            <HelpTool tone="orange" title="draw" detail="Freeform drawing; press any key to change character." />
            <HelpTool tone="purple" title="arrow / line" detail="Drag start to end; shift changes orientation.">
              <Kbd>shift</Kbd>
            </HelpTool>
            <HelpTool tone="warning" title="text" detail="Type labels; quote mode makes svgbob text explicit and boxes expand when needed.">
              <Kbd>enter</Kbd><Kbd>shift+enter</Kbd>
            </HelpTool>
            <HelpTool tone="danger" title="fill" detail="Apply a color tag inside a detected box, or use force mode to place a tag.">
              <Kbd>alt+7</Kbd>
            </HelpTool>
            <HelpTool tone="danger" title="erase" detail="Drag over cells to clear them.">
              <Kbd>alt+8</Kbd>
            </HelpTool>
            <HelpTool tone="accent" title="raw" detail="Full ASCII source editor with line numbers, selection, and native clipboard behavior.">
              <Kbd>alt+9</Kbd><Kbd>{cmd}+z</Kbd><Kbd>{cmd}+f</Kbd>
            </HelpTool>
          </div>
        </section>

        <section className={styles.helpPanel}>
          <div className={styles.helpPanelHeader}>
            <span className={styles.helpSection}>navigation</span>
            <span className={styles.helpSectionHint}>move around the canvas</span>
          </div>
          <div className={styles.helpShortcutGrid}>
            <HelpShortcut keys="scroll" detail="pan" />
            <HelpShortcut keys="shift+scroll" detail="pan horizontally" />
            <HelpShortcut keys="middle-click" detail="free pan" />
            <HelpShortcut keys={`${cmd}+scroll`} detail="zoom" />
            {!isShared && <HelpShortcut keys={`${cmd}+z`} detail="undo" />}
            {!isShared && <HelpShortcut keys={`${cmd}+shift+z`} detail="redo" />}
            <HelpShortcut keys="alt" detail="show tool shortcuts" />
          </div>
        </section>
      </div>

      <div className={styles.helpLegal}>
        <span>
          Independent community project; not affiliated with or endorsed by
          svgbob or ASCIIFlow maintainers.
        </span>
        <a
          className={styles.helpLink}
          href={`${import.meta.env.BASE_URL}licenses/THIRD-PARTY-NOTICES.txt`}
          target="_blank"
          rel="noreferrer"
        >
          Licenses and notices
        </a>
      </div>
    </div>
  );
}

function HelpCard({
  tone,
  title,
  detail,
  children,
}: {
  tone: "accent" | "cyan" | "success" | "orange" | "purple" | "warning" | "danger";
  title: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <article className={styles.helpCard}>
      <span className={[styles.helpCardTitle, styles[`helpTone_${tone}`]].join(" ")}>
        {title}
      </span>
      <span className={styles.helpCardDetail}>{detail}</span>
      {children && <span className={styles.helpChips}>{children}</span>}
    </article>
  );
}

function HelpShortcut({ keys, detail }: { keys: string; detail: string }) {
  return (
    <div className={styles.helpShortcut}>
      <Kbd>{keys}</Kbd>
      <span>{detail}</span>
    </div>
  );
}

function HelpTool({
  tone,
  title,
  detail,
  children,
}: {
  tone: "accent" | "cyan" | "success" | "orange" | "purple" | "warning" | "danger";
  title: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.helpTool}>
      <span className={[styles.helpToolName, styles[`helpTone_${tone}`]].join(" ")}>
        {title}
      </span>
      <span className={styles.helpToolDetail}>{detail}</span>
      {children && <span className={styles.helpToolKeys}>{children}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// File panel (flat rows in second row — no dialogs)
// ---------------------------------------------------------------------------

function FilePanel() {
  const route = useAppStore((s) => s.route);
  const localDrawingIds = useAppStore((s) => s.localDrawingIds);
  const canvasVersion = useAppStore((s) => s.canvasVersion);
  const importRef = useRef<HTMLInputElement>(null);
  const [backupMessage, setBackupMessage] = useState("");

  const downloadBackup = () => {
    const drawings = store.drawings
      .filter((drawingId) => !drawingId.shareSpec)
      .map((drawingId) => ({
        name: drawingId.localId,
        ascii: layerToText(store.canvas(drawingId).committed),
      }));
    const blob = new Blob([serializeDrawingBackup(drawings)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "svgbob-drawings-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    setBackupMessage("Backup downloaded");
  };

  const restoreBackup = async (file: File) => {
    try {
      if (file.size > 5_000_000) {
        throw new Error("Backup file is too large");
      }
      const backup = parseDrawingBackup(await file.text());
      const ids = backup.drawings
        .filter((drawing) => drawing.name !== null)
        .map((drawing) => DrawingId.local(drawing.name));
      for (const drawing of backup.drawings) {
        store.canvas(DrawingId.local(drawing.name)).committed = textToLayer(drawing.ascii);
      }
      store.setLocalDrawingIds(ids);
      setBackupMessage(`${backup.drawings.length} drawings restored`);
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : "Backup restore failed");
    }
  };

  return (
    <div className={styles.fileList}>
      {store.drawings.map((drawingId) => (
        <FileRow
          key={drawingId.toString()}
          drawingId={drawingId}
          active={route.toString() === drawingId.toString()}
        />
      ))}
      <NewDrawingRow />
      <div className={styles.fileRowActions}>
        <button className={styles.fileRowAction} onClick={downloadBackup}>backup all</button>
        <button className={styles.fileRowAction} onClick={() => importRef.current?.click()}>restore backup</button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void restoreBackup(file);
            event.currentTarget.value = "";
          }}
        />
        {backupMessage ? <span>{backupMessage}</span> : null}
      </div>
    </div>
  );
}

function FileRow({
  drawingId,
  active,
}: {
  drawingId: DrawingId;
  active: boolean;
}) {
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  const name = drawingId.localId
    ? drawingId.localId
    : drawingId.shareSpec
    ? new DrawingStringifier().deserialize(drawingId.shareSpec).name
    : "default";
  const isShared = Boolean(drawingId.shareSpec);

  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renaming]);

  function handleRenameSubmit() {
    if (!renameRef.current) return;
    const newName = renameRef.current.value.trim();
    if (newName && newName !== name && isValidDrawingName(newName)) {
      store.renameDrawing(drawingId.localId, newName);
      navigate(DrawingId.local(newName).href);
    }
    setRenaming(false);
  }

  function handleDelete() {
    store.deleteDrawing(drawingId);
    navigate(
      store.drawings.length > 0
        ? store.drawings[0].href
        : DrawingId.local(null).href
    );
    setConfirmingDelete(false);
  }

  return (
    <div
      className={[styles.fileRow, active ? styles.fileRowActive : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {renaming ? (
        <input
          ref={renameRef}
          className={styles.fileRowRenameInput}
          defaultValue={name}
          onKeyDown={(e) => {
            stopKeys(e);
            if (e.key === "Enter") handleRenameSubmit();
            if (e.key === "Escape") setRenaming(false);
          }}
          onKeyPress={stopKeys}
          onBlur={() => setRenaming(false)}
        />
      ) : (
        <button
          className={styles.fileRowName}
          style={active ? { fontWeight: "bold" } : undefined}
          onClick={(e) => {
            navigate(drawingId.href);
            e.preventDefault();
          }}
        >
          {active ? `> ${name}` : `  ${name}`}
        </button>
      )}
      {!renaming && !confirmingDelete && (
        <div className={styles.fileRowActions}>
          {isShared ? (
            <ForkDrawingButton drawingId={drawingId} />
          ) : (
            <>
              <button className={styles.fileRowAction} onClick={() => setRenaming(true)}>rename</button>
              <ShareButton drawingId={drawingId} />
              {active && (
                <button
                  className={styles.fileRowAction}
                  style={{ color: "var(--color-warning)" }}
                  onClick={() => store.currentCanvas.clear()}
                >
                  clear
                </button>
              )}
              <button
                className={styles.fileRowAction}
                style={{ color: "var(--color-danger)" }}
                onClick={() => setConfirmingDelete(true)}
              >
                delete
              </button>
            </>
          )}
        </div>
      )}
      {confirmingDelete && (
        <span className={styles.fileRowConfirm}>
          delete?{" "}
          <button
            className={styles.fileRowAction}
            style={{ color: "var(--color-danger)" }}
            onClick={handleDelete}
          >
            yes
          </button>
          {" "}
          <button
            className={styles.fileRowAction}
            onClick={() => setConfirmingDelete(false)}
          >
            no
          </button>
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// File action buttons (inline in file rows)
// ---------------------------------------------------------------------------

function NewDrawingRow() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function getDefaultName() {
    let defaultName = "untitled";
    for (let i = 2; true; i++) {
      if (!isValidDrawingName(defaultName)) {
        defaultName = `untitled ${i}`;
      } else {
        break;
      }
    }
    return defaultName;
  }

  useEffect(() => {
    if (creating && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [creating]);

  function handleCreate() {
    if (!inputRef.current) return;
    const name = inputRef.current.value.trim();
    if (name && isValidDrawingName(name)) {
      store.setLocalDrawingIds([
        ...store.localDrawingIds,
        DrawingId.local(name),
      ]);
      navigate(DrawingId.local(name).href);
    }
    setCreating(false);
  }

  return (
    <div className={styles.fileRow}>
      {creating ? (
        <input
          ref={inputRef}
          className={styles.fileRowRenameInput}
          defaultValue={getDefaultName()}
          onKeyDown={(e) => {
            stopKeys(e);
            if (e.key === "Enter") handleCreate();
            if (e.key === "Escape") setCreating(false);
          }}
          onKeyPress={stopKeys}
          onBlur={() => setCreating(false)}
        />
      ) : (
        <button
          className={styles.fileRowName}
          style={{ color: "var(--color-accent)" }}
          onClick={() => setCreating(true)}
        >
          [new drawing]
        </button>
      )}
    </div>
  );
}

function ForkDrawingButton({ drawingId }: { drawingId: DrawingId }) {
  const navigate = useNavigate();
  const drawing = new DrawingStringifier().deserialize(drawingId.shareSpec);
  const defaultName = drawing.name;
  const [name, setName] = useState(defaultName);
  const valid = isValidDrawingName(name);

  return (
    <ControlledDialog
      button={
        <button className={styles.fileRowAction}>fork</button>
      }
      title="fork drawing"
      confirmButton={
        <Button
          variant="primary"
          onClick={() => {
            store.saveDrawing(drawingId, name);
            navigate(DrawingId.local(name).href);
          }}
        >
          fork
        </Button>
      }
    >
      <p>save this shared drawing locally so it can be edited.</p>
      <TextField
        label="name"
        error={!valid}
        helperText={!valid ? "name already exists." : undefined}
        defaultValue={defaultName}
        autoFocus
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => setName(e.target.value)}
      />
    </ControlledDialog>
  );
}

function ShareButton({ drawingId }: { drawingId: DrawingId }) {
  const [toastOpen, setToastOpen] = useState(false);
  return (
    <>
      <button
        className={styles.fileRowAction}
        onClick={() => {
          navigator.clipboard.writeText(
            `${window.location.protocol}//${window.location.host}${window.location.pathname}#${DrawingId.share(store.canvas(drawingId).shareSpec).href}`
          );
          setToastOpen(true);
        }}
      >
        share
      </button>
      <Toast
        open={toastOpen}
        message="copied link to clipboard"
        onClose={() => setToastOpen(false)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared drawing banner
// ---------------------------------------------------------------------------

function SharedBanner({ drawingId }: { drawingId: DrawingId }) {
  return (
    <div className={styles.sharedBanner}>
      <span>shared drawing (read-only)</span>
      <ForkButton drawingId={drawingId} />
    </div>
  );
}

function ForkButton({ drawingId }: { drawingId: DrawingId }) {
  const navigate = useNavigate();
  const drawing = new DrawingStringifier().deserialize(drawingId.shareSpec);
  const defaultName = drawing.name;
  const [name, setName] = useState(defaultName);
  const valid = isValidDrawingName(name);

  return (
    <ControlledDialog
      button={<Button variant="primary">fork & edit</Button>}
      title="fork drawing"
      confirmButton={
        <Button
          variant="primary"
          onClick={() => {
            store.saveDrawing(drawingId, name);
            navigate(DrawingId.local(name).href);
          }}
        >
          fork
        </Button>
      }
    >
      <p>save this shared drawing locally so it can be edited.</p>
      <TextField
        label="name"
        error={!valid}
        helperText={!valid ? "name already exists." : undefined}
        defaultValue={defaultName}
        autoFocus
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => setName(e.target.value)}
      />
    </ControlledDialog>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function ctrlOrCmd() {
  if (navigator.platform.toLowerCase().startsWith("mac")) {
    return "cmd";
  }
  return "ctrl";
}

function isValidDrawingName(name: string) {
  return !store.localDrawingIds.some(
    (drawingId) =>
      DrawingId.local(name).toString() === drawingId.toString()
  );
}
