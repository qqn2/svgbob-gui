import {
  exportLayer,
  asciiFromLayer,
  type ExportBackground,
  type ExportFormat,
} from "#asciiflow/client/export_engine";
import { ILayerView } from "#asciiflow/client/layer";
import { Button, ControlledDialog, TextField } from "#asciiflow/client/ui/components";
import styles from "#asciiflow/client/export_dialog.module.css";
import * as React from "react";

export interface ExportDialogProps {
  getLayer: () => ILayerView;
  trigger: React.ReactNode;
  defaultBase?: string;
}

const FORMATS: Array<{ id: ExportFormat; label: string }> = [
  { id: "txt", label: ".txt" },
  { id: "svg", label: ".svg" },
  { id: "png", label: ".png" },
];

const SCALES = [1, 2, 4];
const BACKGROUNDS: Array<{ id: ExportBackground; label: string }> = [
  { id: "white", label: "white" },
  { id: "transparent", label: "transparent" },
];

export function ExportDialog({
  getLayer,
  trigger,
  defaultBase = "diagram",
}: ExportDialogProps) {
  const [format, setFormat] = React.useState<ExportFormat>("svg");
  const [scale, setScale] = React.useState(1);
  const [background, setBackground] = React.useState<ExportBackground>("white");
  const [filenameBase, setFilenameBase] = React.useState(defaultBase);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const runExport = async () => {
    setBusy(true);
    setError("");
    try {
      const layer = getLayer();
      await exportLayer(layer, {
        format,
        scale,
        background,
        filenameBase: filenameBase.trim() || "diagram",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const hasContent = asciiFromLayer(getLayer()).length > 0;

  return (
    <ControlledDialog
      title="Export diagram"
      button={trigger}
      confirmButton={
        <Button onClick={runExport} disabled={busy || !hasContent}>
          {busy ? "Exporting…" : "Export"}
        </Button>
      }
    >
      <div className={styles.form}>
        <div className={styles.row}>
          <span className={styles.label}>format</span>
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={[
                styles.optionBtn,
                format === f.id ? styles.optionBtnActive : "",
              ].join(" ")}
              onClick={() => setFormat(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        {format !== "txt" ? (
          <div className={styles.row}>
            <span className={styles.label}>scale</span>
            {SCALES.map((s) => (
              <button
                key={s}
                type="button"
                className={[
                  styles.optionBtn,
                  scale === s ? styles.optionBtnActive : "",
                ].join(" ")}
                onClick={() => setScale(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        ) : null}
        {format === "png" ? (
          <div className={styles.row}>
            <span className={styles.label}>background</span>
            {BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                type="button"
                className={[
                  styles.optionBtn,
                  background === b.id ? styles.optionBtnActive : "",
                ].join(" ")}
                onClick={() => setBackground(b.id)}
              >
                {b.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className={styles.row}>
          <span className={styles.label}>filename</span>
          <TextField
            value={filenameBase}
            onChange={(e) => setFilenameBase(e.target.value)}
            placeholder="diagram"
          />
        </div>
        <p className={styles.hint}>
          Exports committed canvas ASCII — placement ghosts are excluded.
        </p>
        {error ? <p className={styles.hint} style={{ color: "var(--color-danger)" }}>{error}</p> : null}
      </div>
    </ControlledDialog>
  );
}
