export function initResizer(handle, panels) {
    let dragging = false;
    handle.addEventListener('mousedown', (e) => {
        dragging = true;
        handle.classList.add('dragging');
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (!dragging)
            return;
        const rect = panels.getBoundingClientRect();
        const handleW = 5;
        const ratio = (e.clientX - rect.left) / rect.width;
        const clamped = Math.min(Math.max(ratio, 0.15), 0.85);
        const left = clamped * 100;
        const right = (1 - clamped) * 100;
        panels.style.gridTemplateColumns = `${left}% ${handleW}px ${right}%`;
    });
    document.addEventListener('mouseup', () => {
        if (!dragging)
            return;
        dragging = false;
        handle.classList.remove('dragging');
    });
    handle.addEventListener('keydown', (e) => {
        const rect = panels.getBoundingClientRect();
        const cols = getComputedStyle(panels).gridTemplateColumns.split(' ');
        const currentLeft = (parseFloat(cols[0]) / rect.width) * 100;
        let newLeft = currentLeft;
        if (e.key === 'ArrowLeft')
            newLeft = Math.max(15, currentLeft - 5);
        if (e.key === 'ArrowRight')
            newLeft = Math.min(85, currentLeft + 5);
        if (newLeft !== currentLeft) {
            panels.style.gridTemplateColumns = `${newLeft}% 5px ${100 - newLeft}%`;
        }
    });
}
