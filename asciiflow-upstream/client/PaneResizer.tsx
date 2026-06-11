import styles from "#asciiflow/client/pane_resizer.module.css";
import * as React from "react";

interface PaneResizerProps {
  onSplitChange: (canvasPercent: number) => void;
}

export function PaneResizer({ onSplitChange }: PaneResizerProps) {
  const dragging = React.useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    e.preventDefault();
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const workspace = document.getElementById("workspace");
      if (!workspace) return;
      const rect = workspace.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      onSplitChange(Math.min(85, Math.max(15, ratio * 100)));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [onSplitChange]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 5;
    const workspace = document.getElementById("workspace");
    if (!workspace) return;
    const canvasPane = workspace.querySelector("[data-pane=canvas]") as HTMLElement;
    if (!canvasPane) return;
    const current =
      (canvasPane.getBoundingClientRect().width / workspace.getBoundingClientRect().width) * 100;
    if (e.key === "ArrowLeft") onSplitChange(Math.max(15, current - step));
    if (e.key === "ArrowRight") onSplitChange(Math.min(85, current + step));
  };

  return (
    <div
      className={styles.handle}
      role="separator"
      aria-orientation="vertical"
      tabIndex={0}
      title="Drag to resize panels"
      onMouseDown={onMouseDown}
      onKeyDown={onKeyDown}
    />
  );
}
