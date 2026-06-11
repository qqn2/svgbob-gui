import { Transaction } from '@codemirror/state';
let activeTool = 'select';
let blockSel = null;
let selectPhase = { kind: 'idle' };
let overlayEl = null;
let getView = null;
let onChange = null;
let clipboard = null;
let pasteAnchor = { row: 0, col: 0 };
function onDocumentMouseUp(e) {
    if (selectPhase.kind === 'moving') {
        onMouseUp(e);
        document.removeEventListener('mouseup', onDocumentMouseUp, true);
    }
}
const TOOL_LABELS = {
    select: 'Select & Move',
    text: 'Text',
    box: 'Box',
    hline: 'H-line',
    vline: 'V-line',
    eraser: 'Eraser',
};
export function initDrawTools(container, viewGetter, changeCb) {
    getView = viewGetter;
    onChange = changeCb;
    for (const tool of Object.keys(TOOL_LABELS)) {
        const btn = document.createElement('button');
        btn.className = 'draw-tool-btn';
        btn.dataset.tool = tool;
        btn.textContent = TOOL_LABELS[tool];
        btn.title = tool === 'select'
            ? 'Drag to select · drag inside selection to move · arrow keys nudge'
            : `${TOOL_LABELS[tool]} tool`;
        btn.addEventListener('click', () => setTool(tool));
        container.appendChild(btn);
    }
    overlayEl = document.getElementById('block-select-overlay');
    setTool('select');
    window.addEventListener('keydown', onKeyDown, true);
}
export function getActiveTool() {
    return activeTool;
}
export function focusTextTool() {
    setTool('text');
}
function setTool(tool) {
    activeTool = tool;
    selectPhase = { kind: 'idle' };
    document.querySelectorAll('.draw-tool-btn').forEach((el) => {
        el.classList.toggle('active', el.dataset.tool === tool);
    });
    const view = getView?.();
    if (!view)
        return;
    const scroller = view.scrollDOM;
    scroller.removeEventListener('mousedown', onMouseDown, true);
    scroller.removeEventListener('mousemove', onMouseMove, true);
    scroller.removeEventListener('mouseup', onMouseUp, true);
    scroller.removeEventListener('mouseleave', onMouseLeave, true);
    if (tool === 'text') {
        view.contentDOM.style.pointerEvents = '';
        updateOverlay(view, null);
        view.focus();
        return;
    }
    view.contentDOM.style.pointerEvents = 'none';
    scroller.addEventListener('mousedown', onMouseDown, true);
    scroller.addEventListener('mousemove', onMouseMove, true);
    scroller.addEventListener('mouseup', onMouseUp, true);
    scroller.addEventListener('mouseleave', onMouseLeave, true);
    const mount = document.getElementById('editor-mount');
    mount?.classList.toggle('select-move-cursor', tool === 'select');
    if (tool === 'select' && blockSel) {
        showBlockSelection(view);
    }
    else if (tool !== 'select') {
        updateOverlay(view, null);
    }
}
function cellAt(view, x, y) {
    const pos = view.posAtCoords({ x, y });
    if (pos == null)
        return null;
    const line = view.state.doc.lineAt(pos);
    return { row: line.number - 1, col: pos - line.from };
}
function normRect(a, b) {
    return {
        row0: Math.min(a.row, b.row),
        col0: Math.min(a.col, b.col),
        row1: Math.max(a.row, b.row),
        col1: Math.max(a.col, b.col),
    };
}
function rectFromBlock(b) {
    return { row0: b.row0, col0: b.col0, row1: b.row1, col1: b.col1 };
}
function isInk(ch) {
    return ch !== undefined && ch !== ' ' && ch !== '\t';
}
/** Read marquee region without padding past end-of-line. */
function readRectLines(view, r) {
    const lines = [];
    for (let row = r.row0; row <= r.row1; row++) {
        const line = view.state.doc.line(row + 1);
        if (r.col0 >= line.length) {
            lines.push('');
            continue;
        }
        const end = Math.min(r.col1 + 1, line.length);
        lines.push(line.text.slice(r.col0, end));
    }
    return lines;
}
/** Shrink rect to the bounding box of non-whitespace ink (AsciiFlow sparse model). */
function tightenToInk(view, r) {
    const raw = readRectLines(view, r);
    let minRow = -1;
    let maxRow = -1;
    let minCol = Infinity;
    let maxCol = -1;
    for (let ri = 0; ri < raw.length; ri++) {
        for (let ci = 0; ci < raw[ri].length; ci++) {
            if (isInk(raw[ri][ci])) {
                if (minRow < 0)
                    minRow = ri;
                maxRow = ri;
                minCol = Math.min(minCol, ci);
                maxCol = Math.max(maxCol, ci);
            }
        }
    }
    if (maxCol < 0) {
        return { row0: r.row0, col0: r.col0, row1: r.row0, col1: r.col0 };
    }
    return {
        row0: r.row0 + minRow,
        col0: r.col0 + minCol,
        row1: r.row0 + maxRow,
        col1: r.col0 + maxCol,
    };
}
function normalizeLines(lines) {
    const width = Math.max(1, ...lines.map((l) => l.replace(/\s+$/, '').length));
    return lines.map((l) => l.replace(/\s+$/, '').padEnd(width, ' '));
}
function extractBlock(view, r) {
    return normalizeLines(readRectLines(view, r));
}
function buildBlock(view, r) {
    const tight = tightenToInk(view, r);
    return { ...tight, lines: extractBlock(view, tight) };
}
/**
 * Write block without extending lines with trailing whitespace (root cause of ghost cells).
 */
function applyBlock(view, r, lines) {
    const width = r.col1 - r.col0 + 1;
    const changes = [];
    for (let i = 0; i <= r.row1 - r.row0; i++) {
        const row = r.row0 + i;
        const line = view.state.doc.line(row + 1);
        const content = (lines[i] ?? '').slice(0, width);
        let writeLen = content.length;
        while (writeLen > 0 &&
            content[writeLen - 1] === ' ' &&
            r.col0 + writeLen - 1 >= line.text.length) {
            writeLen--;
        }
        const hasInk = content.slice(0, writeLen).split('').some((c) => isInk(c));
        if (writeLen === 0 && !hasInk)
            continue;
        const lo = r.col0;
        const hi = lo + writeLen - 1;
        const mid = content.slice(0, writeLen);
        let before = line.text.slice(0, lo);
        const after = line.text.slice(Math.min(hi + 1, line.text.length));
        if (lo > line.text.length && hasInk) {
            before = line.text.padEnd(lo, ' ');
        }
        changes.push({ from: line.from, to: line.to, insert: before + mid + after });
    }
    if (changes.length) {
        view.dispatch({ changes, annotations: Transaction.addToHistory.of(true) });
        onChange?.();
    }
}
/** Clear only existing characters in rect — never pad lines with spaces. */
function clearBlock(view, r) {
    const changes = [];
    for (let row = r.row0; row <= r.row1; row++) {
        const line = view.state.doc.line(row + 1);
        const lo = r.col0;
        const hi = Math.min(r.col1, line.text.length - 1);
        if (lo > hi)
            continue;
        const before = line.text.slice(0, lo);
        const mid = ' '.repeat(hi - lo + 1);
        const after = line.text.slice(hi + 1);
        changes.push({ from: line.from, to: line.to, insert: before + mid + after });
    }
    if (changes.length) {
        view.dispatch({ changes, annotations: Transaction.addToHistory.of(true) });
        onChange?.();
    }
}
function drawBox(view, r) {
    const h = r.row1 - r.row0;
    const w = r.col1 - r.col0;
    if (h < 1 || w < 1)
        return;
    const lines = [];
    for (let y = 0; y <= h; y++) {
        let row = '';
        for (let x = 0; x <= w; x++) {
            const corner = (y === 0 || y === h) && (x === 0 || x === w);
            if (corner)
                row += '+';
            else if (y === 0 || y === h)
                row += '-';
            else if (x === 0 || x === w)
                row += '|';
            else
                row += ' ';
        }
        lines.push(row);
    }
    applyBlock(view, r, lines);
}
function drawHLine(view, r) {
    applyBlock(view, { ...r, row1: r.row0 }, ['-'.repeat(r.col1 - r.col0 + 1)]);
}
function drawVLine(view, r) {
    const lines = Array(r.row1 - r.row0 + 1).fill('|');
    applyBlock(view, { ...r, col1: r.col0 }, lines);
}
function eraseRect(view, r) {
    clearBlock(view, r);
}
function setOverlayContent(lines) {
    if (!overlayEl)
        return;
    let pre = overlayEl.querySelector('.overlay-content');
    if (!lines) {
        pre?.remove();
        overlayEl.classList.remove('moving');
        return;
    }
    if (!pre) {
        pre = document.createElement('pre');
        pre.className = 'overlay-content';
        overlayEl.appendChild(pre);
    }
    overlayEl.classList.add('moving');
    pre.textContent = lines.map((l) => l.replace(/\s+$/, '')).join('\n');
}
function updateOverlay(view, r, content = null) {
    if (!overlayEl)
        return;
    if (!r) {
        overlayEl.hidden = true;
        setOverlayContent(null);
        return;
    }
    const start = coordsForCell(view, r.row0, r.col0);
    const end = coordsForCell(view, r.row1, r.col1, true);
    if (!start || !end) {
        overlayEl.hidden = true;
        return;
    }
    const pane = document.getElementById('editor-pane').getBoundingClientRect();
    overlayEl.hidden = false;
    overlayEl.style.left = `${start.left - pane.left}px`;
    overlayEl.style.top = `${start.top - pane.top}px`;
    overlayEl.style.width = `${Math.max(end.right - start.left, 4)}px`;
    overlayEl.style.height = `${Math.max(end.bottom - start.top, 4)}px`;
    if (content) {
        setOverlayContent(content);
    }
    else if (!overlayEl.classList.contains('moving')) {
        setOverlayContent(null);
    }
}
function coordsForCell(view, row, col, endCorner = false) {
    const line = view.state.doc.line(row + 1);
    if (col >= line.length) {
        if (line.length === 0)
            return null;
        col = line.length - 1;
        endCorner = true;
    }
    const pos = line.from + col;
    const coords = view.coordsAtPos(pos, endCorner ? 1 : -1);
    if (!coords)
        return null;
    const lineEnd = line.from + line.length;
    const nextCol = Math.min(col + 1, line.length);
    const next = nextCol < line.length
        ? view.coordsAtPos(line.from + nextCol, 1)
        : view.coordsAtPos(lineEnd, 1) ?? { right: coords.right + 7.8, bottom: coords.bottom };
    return new DOMRect(coords.left, coords.top, Math.max((next?.right ?? coords.right + 7.8) - coords.left, 1), coords.bottom - coords.top);
}
function showBlockSelection(view) {
    if (!blockSel) {
        updateOverlay(view, null);
        return;
    }
    updateOverlay(view, rectFromBlock(blockSel));
}
function pointInBlock(c, b) {
    return c.row >= b.row0 && c.row <= b.row1 && c.col >= b.col0 && c.col <= b.col1;
}
/** Hit-test: ink cell, or interior space inside a drawn box (within content width). */
function pointInBlockHit(c, b) {
    if (!pointInBlock(c, b))
        return false;
    const ri = c.row - b.row0;
    const ci = c.col - b.col0;
    const line = b.lines[ri] ?? '';
    if (ci >= line.length)
        return false;
    if (isInk(line[ci]))
        return true;
    const contentW = line.replace(/\s+$/, '').length;
    return ci < contentW;
}
function movingRect(grab, cursor, snapshot) {
    const offsetRow = grab.row - snapshot.row0;
    const offsetCol = grab.col - snapshot.col0;
    const h = snapshot.row1 - snapshot.row0;
    const w = snapshot.col1 - snapshot.col0;
    const row0 = Math.max(0, cursor.row - offsetRow);
    const col0 = Math.max(0, cursor.col - offsetCol);
    return {
        row0,
        col0,
        row1: row0 + h,
        col1: col0 + w,
        lines: snapshot.lines,
    };
}
function commitMove(view, target) {
    applyBlock(view, rectFromBlock(target), target.lines);
    blockSel = { ...target };
}
function startMoveDrag(view, cell) {
    if (!blockSel)
        return;
    const snapshot = {
        row0: blockSel.row0,
        col0: blockSel.col0,
        row1: blockSel.row1,
        col1: blockSel.col1,
        lines: [...blockSel.lines],
    };
    clearBlock(view, rectFromBlock(snapshot));
    selectPhase = { kind: 'moving', grab: cell, snapshot };
    document.addEventListener('mouseup', onDocumentMouseUp, true);
    const ghost = movingRect(cell, cell, snapshot);
    updateOverlay(view, rectFromBlock(ghost), snapshot.lines);
    view.scrollDOM.classList.add('grabbing');
}
function onMouseDown(e) {
    if (e.button !== 0)
        return;
    const view = getView?.();
    if (!view || activeTool === 'text')
        return;
    const cell = cellAt(view, e.clientX, e.clientY);
    if (!cell)
        return;
    e.preventDefault();
    e.stopPropagation();
    if (activeTool === 'select') {
        if (blockSel && pointInBlockHit(cell, blockSel)) {
            startMoveDrag(view, cell);
            return;
        }
        blockSel = null;
        selectPhase = { kind: 'marquee', anchor: cell };
        updateOverlay(view, normRect(cell, cell));
        return;
    }
    selectPhase = { kind: 'marquee', anchor: cell };
}
function onMouseMove(e) {
    const view = getView?.();
    if (!view)
        return;
    if (activeTool === 'select' && selectPhase.kind === 'moving') {
        const cell = cellAt(view, e.clientX, e.clientY);
        if (!cell)
            return;
        const ghost = movingRect(selectPhase.grab, cell, selectPhase.snapshot);
        updateOverlay(view, rectFromBlock(ghost), selectPhase.snapshot.lines);
        return;
    }
    if (activeTool === 'select' && selectPhase.kind === 'idle' && blockSel) {
        const cell = cellAt(view, e.clientX, e.clientY);
        view.scrollDOM.classList.toggle('can-grab', !!cell && pointInBlockHit(cell, blockSel));
    }
    if (selectPhase.kind !== 'marquee')
        return;
    const cell = cellAt(view, e.clientX, e.clientY);
    if (!cell)
        return;
    const r = normRect(selectPhase.anchor, cell);
    updateOverlay(view, r);
    if (activeTool === 'eraser') {
        eraseRect(view, r);
        selectPhase = { kind: 'marquee', anchor: { row: r.row0, col: r.col0 } };
    }
}
function onMouseUp(e) {
    const view = getView?.();
    if (!view)
        return;
    if (activeTool === 'select' && selectPhase.kind === 'moving') {
        const cell = cellAt(view, e.clientX, e.clientY) ?? selectPhase.grab;
        const target = movingRect(selectPhase.grab, cell, selectPhase.snapshot);
        commitMove(view, target);
        selectPhase = { kind: 'idle' };
        view.scrollDOM.classList.remove('grabbing', 'can-grab');
        document.removeEventListener('mouseup', onDocumentMouseUp, true);
        showBlockSelection(view);
        return;
    }
    if (selectPhase.kind !== 'marquee')
        return;
    const anchor = selectPhase.anchor;
    selectPhase = { kind: 'idle' };
    const cell = cellAt(view, e.clientX, e.clientY) ?? anchor;
    const r = normRect(anchor, cell);
    switch (activeTool) {
        case 'select': {
            blockSel = buildBlock(view, r);
            pasteAnchor = { row: blockSel.row0, col: blockSel.col0 };
            showBlockSelection(view);
            break;
        }
        case 'box':
            drawBox(view, r);
            updateOverlay(view, null);
            break;
        case 'hline':
            drawHLine(view, r);
            updateOverlay(view, null);
            break;
        case 'vline':
            drawVLine(view, r);
            updateOverlay(view, null);
            break;
        case 'eraser':
            updateOverlay(view, null);
            break;
    }
}
function onMouseLeave(_e) {
    // mouseup on document handles move completion
}
function cancelMoveDrag() {
    const view = getView?.();
    if (!view || selectPhase.kind !== 'moving')
        return;
    applyBlock(view, rectFromBlock(selectPhase.snapshot), selectPhase.snapshot.lines);
    blockSel = { ...selectPhase.snapshot };
    selectPhase = { kind: 'idle' };
    view.scrollDOM.classList.remove('grabbing', 'can-grab');
    document.removeEventListener('mouseup', onDocumentMouseUp, true);
    showBlockSelection(view);
}
function moveBlockByKeys(dr, dc) {
    const view = getView?.();
    if (!view || !blockSel)
        return;
    const h = blockSel.row1 - blockSel.row0;
    const w = blockSel.col1 - blockSel.col0;
    const nr0 = blockSel.row0 + dr;
    const nc0 = blockSel.col0 + dc;
    if (nr0 < 0 || nc0 < 0)
        return;
    const source = { ...blockSel, lines: [...blockSel.lines] };
    const target = {
        row0: nr0,
        col0: nc0,
        row1: nr0 + h,
        col1: nc0 + w,
        lines: source.lines,
    };
    clearBlock(view, rectFromBlock(source));
    applyBlock(view, rectFromBlock(target), target.lines);
    blockSel = target;
    showBlockSelection(view);
}
function onKeyDown(e) {
    const view = getView?.();
    if (!view)
        return;
    if (e.key === 'Escape') {
        if (selectPhase.kind === 'moving') {
            e.preventDefault();
            cancelMoveDrag();
        }
        else if (blockSel && activeTool === 'select') {
            e.preventDefault();
            blockSel = null;
            updateOverlay(view, null);
        }
        return;
    }
    if (activeTool === 'select' && blockSel && selectPhase.kind !== 'moving') {
        if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
            e.preventDefault();
            clipboard = blockSel.lines.map((l) => l.replace(/\s+$/, ''));
            pasteAnchor = { row: blockSel.row0, col: blockSel.col0 };
            clearBlock(view, rectFromBlock(blockSel));
            blockSel = null;
            updateOverlay(view, null);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            clipboard = blockSel.lines.map((l) => l.replace(/\s+$/, ''));
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard) {
            e.preventDefault();
            if (blockSel)
                clearBlock(view, rectFromBlock(blockSel));
            const normalized = normalizeLines(clipboard);
            const h = normalized.length - 1;
            const w = normalized[0]?.replace(/\s+$/, '').length ?? 1;
            const row0 = blockSel?.row0 ?? pasteAnchor.row;
            const col0 = blockSel?.col0 ?? pasteAnchor.col;
            const target = {
                row0,
                col0,
                row1: row0 + h,
                col1: col0 + w - 1,
                lines: normalized,
            };
            applyBlock(view, rectFromBlock(target), normalized);
            blockSel = target;
            showBlockSelection(view);
            return;
        }
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveBlockByKeys(-1, 0);
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveBlockByKeys(1, 0);
                return;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                moveBlockByKeys(0, -1);
                return;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                moveBlockByKeys(0, 1);
                return;
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                clearBlock(view, rectFromBlock(blockSel));
                blockSel = null;
                updateOverlay(view, null);
                return;
            }
        }
    }
}
export function refreshOverlay() {
    const view = getView?.();
    if (!view || selectPhase.kind === 'moving')
        return;
    if (blockSel)
        showBlockSelection(view);
}
