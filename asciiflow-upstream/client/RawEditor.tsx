import { minimalSetup } from "codemirror";
import { redo, undo } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import {
  crosshairCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import * as React from "react";
import * as constants from "#asciiflow/client/constants";
import { rawEditorLayer, rawEditorDocument } from "#asciiflow/client/raw_editor_model";
import { registerRawEditor } from "#asciiflow/client/raw_editor_bridge";
import { store, useAppStore } from "#asciiflow/client/store";
import { Vector } from "#asciiflow/client/vector";
import styles from "#asciiflow/client/raw_editor.module.css";

interface EditorStats {
  lines: number;
  chars: number;
  line: number;
  column: number;
}

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    color: "var(--color-canvas-text)",
    backgroundColor: "var(--color-canvas-bg)",
    fontSize: "14px",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "var(--font-mono)",
    lineHeight: "20px",
  },
  ".cm-content": {
    padding: "8px 0 40px",
    caretColor: "var(--color-accent)",
  },
  ".cm-line": { padding: "0 10px" },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--color-accent)",
  },
  ".cm-gutters": {
    color: "var(--color-text-muted)",
    backgroundColor: "var(--color-bg-raised)",
    borderRight: "1px solid var(--color-border)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "34px",
    padding: "0 8px 0 4px",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "var(--color-canvas-highlight)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--color-canvas-selection) !important",
  },
});

function fallbackOrigin(): Vector {
  if (store.cursorCell) {
    return new Vector(store.cursorCell.x, store.cursorCell.y);
  }
  const offset = store.currentCanvas.offset;
  return new Vector(
    Math.max(0, Math.round(offset.x / constants.CHAR_PIXELS_H)),
    Math.max(0, Math.round(offset.y / constants.CHAR_PIXELS_V))
  );
}

function editorStats(state: EditorState): EditorStats {
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  return {
    lines: state.doc.lines,
    chars: state.doc.length,
    line: line.number,
    column: head - line.from + 1,
  };
}

export function RawEditor() {
  const route = useAppStore((state) => state.route);
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [stats, setStats] = React.useState<EditorStats>({
    lines: 1,
    chars: 0,
    line: 1,
    column: 1,
  });
  const routeKey = route.toString();

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const canvas = store.currentCanvas;
    const initialLayer = canvas.committed;
    const document = rawEditorDocument(initialLayer, fallbackOrigin());
    let editor: EditorView;

    editor = new EditorView({
      doc: document.text,
      parent: host,
      extensions: [
        minimalSetup,
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        rectangularSelection(),
        crosshairCursor(),
        EditorState.allowMultipleSelections.of(true),
        EditorState.tabSize.of(2),
        EditorView.contentAttributes.of({
          "aria-label": "Raw ASCII source",
          autocapitalize: "off",
          autocomplete: "off",
          autocorrect: "off",
          spellcheck: "false",
        }),
        editorTheme,
        EditorView.updateListener.of((update) => {
          setStats(editorStats(update.state));
          if (!update.docChanged) return;
          canvas.replaceCommittedTransient(
            rawEditorLayer(update.state.doc.toString(), document.origin)
          );
        }),
      ],
    });

    setStats(editorStats(editor.state));
    const unregister = registerRawEditor({
      undo: () => {
        editor.focus();
        return undo(editor);
      },
      redo: () => {
        editor.focus();
        return redo(editor);
      },
    });
    const focusFrame = window.requestAnimationFrame(() => editor.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      unregister();
      canvas.finishTransientEdit(initialLayer);
      editor.destroy();
    };
  }, [routeKey]);

  return (
    <section className={styles.rawEditor} aria-label="Raw ASCII editor">
      <header className={styles.editorBar}>
        <span className={styles.fileTab}>diagram.txt</span>
        <span className={styles.editorStats}>
          Ln {stats.line}, Col {stats.column} · {stats.lines} lines · {stats.chars} chars
        </span>
      </header>
      <div ref={hostRef} className={styles.editorMount} />
    </section>
  );
}
