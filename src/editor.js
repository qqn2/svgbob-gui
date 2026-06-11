import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, rectangularSelection, crosshairCursor, } from '@codemirror/view';
import { Compartment, EditorState, Transaction } from '@codemirror/state';
import { defaultKeymap, historyKeymap, history, } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
const themeCompartment = new Compartment();
const lightTheme = EditorView.theme({
    '&': {
        color: '#1a1a2e',
        background: 'transparent !important',
    },
    '.cm-content': { caretColor: '#5b4cdb' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#5b4cdb' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        background: 'rgba(91, 76, 219, 0.22) !important',
    },
    '.cm-activeLine': { background: 'rgba(91, 76, 219, 0.06)' },
    '.cm-activeLineGutter': { background: 'rgba(91, 76, 219, 0.08)' },
    '.cm-gutters': {
        background: '#f4f4f8 !important',
        color: '#999',
        borderRight: '1px solid #e0e0e8 !important',
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 12px' },
});
function editorTheme(theme) {
    return themeCompartment.of(theme === 'dark' ? oneDark : lightTheme);
}
export function setEditorTheme(view, theme) {
    view.dispatch({
        effects: themeCompartment.reconfigure(theme === 'dark' ? oneDark : lightTheme),
    });
}
export function createEditor(container, initialContent, callbacks, appTheme = 'light') {
    const tabKeymap = keymap.of([
        {
            key: 'Tab',
            run: (view) => {
                view.dispatch(view.state.replaceSelection('  '));
                return true;
            },
        },
    ]);
    const state = EditorState.create({
        doc: initialContent,
        extensions: [
            history(),
            lineNumbers(),
            highlightActiveLineGutter(),
            highlightActiveLine(),
            drawSelection({ drawRangeCursor: true }),
            rectangularSelection(),
            crosshairCursor(),
            tabKeymap,
            keymap.of([...defaultKeymap, ...historyKeymap]),
            editorTheme(appTheme),
            EditorView.theme({
                '&': { background: 'transparent !important' },
                '&.cm-focused': { outline: 'none' },
            }),
            EditorView.domEventHandlers({
                scroll: () => {
                    callbacks.onScroll?.();
                    return false;
                },
            }),
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    callbacks.onChange(update.state.doc.toString());
                }
                if (update.selectionSet || update.docChanged) {
                    const pos = update.state.selection.main.head;
                    const line = update.state.doc.lineAt(pos);
                    callbacks.onCursorMove(line.number, pos - line.from + 1);
                }
                if (update.geometryChanged) {
                    callbacks.onScroll?.();
                }
            }),
        ],
    });
    return new EditorView({ state, parent: container });
}
export function getValue(view) {
    return view.state.doc.toString();
}
export function setValue(view, content) {
    view.dispatch({
        changes: {
            from: 0,
            to: view.state.doc.length,
            insert: content,
        },
        annotations: Transaction.addToHistory.of(false),
    });
}
export function insertAtCursor(view, text) {
    const { from } = view.state.selection.main;
    view.dispatch({
        changes: { from, to: from, insert: text },
        selection: { anchor: from + text.length },
    });
    view.focus();
}
