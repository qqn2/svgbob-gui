import "#asciiflow/client/ui/theme.css";
import * as React from "react";
import styles from "#asciiflow/client/app.module.css";
import {
  Controller,
  InputController,
} from "#asciiflow/client/controller";
import { Toolbar, usePanel } from "#asciiflow/client/toolbar";
import { StatusBar } from "#asciiflow/client/StatusBar";
import { Workspace } from "#asciiflow/client/Workspace";
import { SnippetsPanel } from "#asciiflow/client/SnippetsPanel";
import {
  loadFromBobRoute,
  seedDefaultDiagramIfEmpty,
} from "#asciiflow/client/svgbob_bootstrap";
import { DrawingId, store, ToolMode, useAppStore } from "#asciiflow/client/store";
import { canvasCenter } from "#asciiflow/client/canvas_viewport";
import { renderedVersion, screenToCell } from "#asciiflow/client/view";
import { initFont } from "#asciiflow/client/font";
import { initRenderer } from "#asciiflow/client/renderer";
import {
  blockReviewDrawingName,
  buildBlockReviewLayer,
} from "#asciiflow/client/block_review";

import { HashRouter, Route, useParams } from "react-router-dom";
import * as ReactDOM from "react-dom";
import { Vector } from "#asciiflow/client/vector";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
import { CHAR_PIXELS_H, CHAR_PIXELS_V } from "#asciiflow/client/constants";

const controller = new Controller();
const inputController = new InputController(controller);

/** Survives Vite HMR so DOM listeners stay singletons across module reloads. */
interface AsciiflowHandlerHost {
  controller: Controller;
  inputController: InputController;
  installed: boolean;
}

type AsciiflowWindow = Window &
  typeof globalThis & {
    __asciiflowHandlerHost?: AsciiflowHandlerHost;
    __asciiflowOnKeyDown?: (e: KeyboardEvent) => void;
    __asciiflowOnKeyUp?: (e: KeyboardEvent) => void;
    __asciiflowOnWheel?: (e: WheelEvent) => void;
    __asciiflowOnCopy?: (e: ClipboardEvent) => void;
    __asciiflowOnCut?: (e: ClipboardEvent) => void;
    __asciiflowOnPaste?: (e: ClipboardEvent) => void;
    __asciiflow__?: Record<string, unknown>;
  };

function handlerHost(): AsciiflowHandlerHost {
  const win = window as AsciiflowWindow;
  if (!win.__asciiflowHandlerHost) {
    win.__asciiflowHandlerHost = {
      controller,
      inputController,
      installed: false,
    };
  }
  return win.__asciiflowHandlerHost;
}

export interface IRouteProps {
  local?: string;
  share?: string;
  encoded?: string;
  reviewScale?: string;
}

export const App = () => {
  const routeProps = useParams<IRouteProps>();
  const themeMode = useAppStore((s) => s.themeMode);
  const [panel] = usePanel();

  // Sync route params into the store.
  React.useEffect(() => {
    if (routeProps.reviewScale !== undefined) {
      const scale = Number(routeProps.reviewScale || "3");
      store.setRoute(DrawingId.local(blockReviewDrawingName(scale)));
      store.currentCanvas.committed = buildBlockReviewLayer(scale);
      store.currentCanvas.clearScratch();
      store.setToolMode(ToolMode.SELECT);
      window.setTimeout(() => store.fitDiagram(), 0);
      return;
    }
    if (routeProps.encoded) {
      store.setRoute(DrawingId.local("bob-import"));
      loadFromBobRoute(decodeURIComponent(routeProps.encoded));
      return;
    }
    store.setRoute(
      routeProps.share
        ? DrawingId.share(decodeURIComponent(routeProps.share))
        : DrawingId.local(routeProps.local || null)
    );
    if (!routeProps.share && !routeProps.local) {
      seedDefaultDiagramIfEmpty();
    }
  }, [
    routeProps.share,
    routeProps.local,
    routeProps.encoded,
    routeProps.reviewScale,
  ]);

  return (
    <div className={styles.app} data-theme={themeMode}>
      <Toolbar />
      <div className={styles.workbench}>
        {panel === "snippets" && (
          <aside className={styles.blocksSidebar} aria-label="Blocks library">
            <SnippetsPanel />
          </aside>
        )}
        <Workspace {...inputController.getHandlerProps()} />
      </div>
      <StatusBar />
    </div>
  );
};

async function render() {
  ReactDOM.render(
    <HashRouter>
      <Route exact path="/" component={App} />
      <Route exact path="/review/blocks/:reviewScale?" component={App} />
      <Route path="/local/:local" component={App} />
      <Route path="/share/:share" component={App} />
      <Route path="/bob/:encoded" component={App} />
    </HashRouter>,
    document.getElementById("root")
  );
}

// Expose a test bridge for e2e tests to query store and render state.
(window as AsciiflowWindow).__asciiflow__ = {
  getCommittedText: () => layerToText(store.currentCanvas.committed),
  getRenderedVersion: () => renderedVersion,
  getToolMode: () => store.toolMode(),
  getDarkMode: () => store.darkMode,
  getCommittedSize: () => store.currentCanvas.committed.size(),
  setDarkMode: (v: boolean) => store.setDarkMode(v),
  getZoom: () => store.currentCanvas.zoom,
  getOffset: () => ({ x: store.currentCanvas.offset.x, y: store.currentCanvas.offset.y }),
  getCellSize: () => ({ w: CHAR_PIXELS_H, h: CHAR_PIXELS_V }),
};

function ensureStableDomHandlers(win: AsciiflowWindow) {
  if (!win.__asciiflowOnKeyDown) {
    win.__asciiflowOnKeyDown = (e) =>
      win.__asciiflowHandlerHost!.controller.handleKeyDown(e);
    win.__asciiflowOnKeyUp = (e) =>
      win.__asciiflowHandlerHost!.controller.handleKeyUp(e);
    win.__asciiflowOnWheel = (e) =>
      win.__asciiflowHandlerHost!.inputController.handleWheel(e);
    win.__asciiflowOnCopy = (e) => {
      if (store.selectTool.selectBox) {
        e.preventDefault();
        const copiedText = layerToText(
          store.currentCanvas.committed,
          store.selectTool.selectBox
        );
        e.clipboardData!.setData("text/plain", copiedText);
      }
    };
    win.__asciiflowOnCut = (e) => {
      if (store.selectTool.selectBox) {
        e.preventDefault();
        const copiedText = layerToText(
          store.currentCanvas.committed,
          store.selectTool.selectBox
        );
        e.clipboardData!.setData("text/plain", copiedText);
        store.selectTool.cutSelection();
      }
    };
    win.__asciiflowOnPaste = (e) => {
      e.preventDefault();
      const clipboardText = e.clipboardData!.getData("text");
      const center = canvasCenter();
      let position = screenToCell(new Vector(center.x, center.y));
      if (store.selectTool.selectBox) {
        position = store.selectTool.selectBox.topLeft();
      }
      if (store.toolMode() === ToolMode.TEXT && store.textTool.currentPosition) {
        position = store.textTool.currentPosition;
      }
      const pastedLayer = textToLayer(clipboardText, position);
      store.currentTool.cleanup();
      store.currentCanvas.setScratchLayer(pastedLayer);
      store.currentCanvas.commitScratch();
    };
  }
}

function installGlobalHandlers() {
  const win = window as AsciiflowWindow;
  const host = handlerHost();
  host.controller = controller;
  host.inputController = inputController;

  ensureStableDomHandlers(win);

  if (host.installed) {
    return;
  }
  host.installed = true;

  const root = document.getElementById("root");
  if (!root) {
    return;
  }

  root.addEventListener("keydown", win.__asciiflowOnKeyDown!);
  root.addEventListener("keyup", win.__asciiflowOnKeyUp!);
  // Register wheel handler with { passive: false } so preventDefault() can
  // suppress browser page zoom on Ctrl+scroll / pinch-to-zoom.
  root.addEventListener("wheel", win.__asciiflowOnWheel!, { passive: false });
  // Use native copy/cut events so the browser handles clipboard permissions.
  // This works across Chrome, Safari, and Firefox (including macOS).
  document.addEventListener("copy", win.__asciiflowOnCopy!);
  document.addEventListener("cut", win.__asciiflowOnCut!);
  document.addEventListener("paste", win.__asciiflowOnPaste!);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      if (!host.installed) {
        return;
      }
      root.removeEventListener("keydown", win.__asciiflowOnKeyDown!);
      root.removeEventListener("keyup", win.__asciiflowOnKeyUp!);
      root.removeEventListener("wheel", win.__asciiflowOnWheel!);
      document.removeEventListener("copy", win.__asciiflowOnCopy!);
      document.removeEventListener("cut", win.__asciiflowOnCut!);
      document.removeEventListener("paste", win.__asciiflowOnPaste!);
      host.installed = false;
    });
  }
}

// tslint:disable-next-line: no-console
Promise.all([initFont(), initRenderer()])
  .then(() => {
    installGlobalHandlers();
    return render();
  })
  .catch((e) => console.log(e));
