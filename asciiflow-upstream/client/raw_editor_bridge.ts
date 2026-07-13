interface RawEditorCommands {
  undo(): boolean;
  redo(): boolean;
}

let activeEditor: RawEditorCommands | null = null;

export function registerRawEditor(editor: RawEditorCommands): () => void {
  activeEditor = editor;
  return () => {
    if (activeEditor === editor) {
      activeEditor = null;
    }
  };
}

export function undoRawEditor(): boolean {
  if (!activeEditor) return false;
  return activeEditor.undo();
}

export function redoRawEditor(): boolean {
  if (!activeEditor) return false;
  return activeEditor.redo();
}
